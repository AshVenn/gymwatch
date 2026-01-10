import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

const optionalEmail = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().email().nullable().optional(),
)

const optionalPhone = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().nullable().optional(),
)

const updateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: optionalEmail,
  phone: optionalPhone,
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string | string[] }> },
) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymMembersRead)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const role = (sessionResult.user as any).role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return jsonError(403, "MISSING_VARIANT", "Variant manquant")
    }

    const rawId = (await params).memberId
    const memberId = Array.isArray(rawId) ? rawId[0] : rawId

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        gymId: scope.gymId,
        ...(role === "GYM_ADMIN" && sessionVariantId ? { gymVariantId: sessionVariantId } : {}),
      },
      include: {
        gymVariant: { select: { id: true, name: true, slug: true, isDefault: true } },
        subscriptions: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: { select: { id: true, name: true, durationDays: true } } },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const latestSubscription = member.subscriptions[0] ?? null
    return NextResponse.json({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      qrToken: member.qrToken,
      lastVisitedAt: member.lastVisitedAt,
      gymVariant: member.gymVariant,
      subscription: latestSubscription
        ? {
            id: latestSubscription.id,
            status: latestSubscription.status,
            endDate: latestSubscription.endDate,
            planName: latestSubscription.plan?.name ?? null,
          }
        : null,
    })
  } catch (error) {
    console.error("members.get", error)
    return NextResponse.json({ error: "Failed to load member" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string | string[] }> },
) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymMembersWrite)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const role = (sessionResult.user as any).role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return jsonError(403, "MISSING_VARIANT", "Variant manquant")
    }

    const rawId = (await params).memberId
    const memberId = Array.isArray(rawId) ? rawId[0] : rawId

    const payload = updateSchema.parse(await request.json())

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: scope.gymId },
      select: { id: true, gymVariantId: true },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }
    if (role === "GYM_ADMIN" && sessionVariantId && member.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
    }

    const updated = await db.updateMember(memberId, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("members.put", error)
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string | string[] }> },
) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymMembersWrite)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const role = (sessionResult.user as any).role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return jsonError(403, "MISSING_VARIANT", "Variant manquant")
    }

    const rawId = (await params).memberId
    const memberId = Array.isArray(rawId) ? rawId[0] : rawId

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: scope.gymId },
      select: { id: true, gymVariantId: true },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }
    if (role === "GYM_ADMIN" && sessionVariantId && member.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
    }

    const activeSubscriptions = await prisma.subscription.count({
      where: {
        memberId,
        status: { in: ["ACTIVE", "EXPIRES_TODAY"] },
      },
    })

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        { error: "Ce membre possede encore des abonnements actifs" },
        { status: 409 }
      )
    }

    await db.deleteMember(memberId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("members.delete", error)
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 })
  }
}
