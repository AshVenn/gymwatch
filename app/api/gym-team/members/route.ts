import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { computeSubscriptionStatus } from "@/lib/subscription-status"
import {
  jsonError,
  requireGymScope,
  requirePermission,
  requireSession,
  requireVariantAccess,
} from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional().or(z.literal("").transform(() => undefined)),
  planId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  gymVariantId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymMembersRead)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const requestedVariantId = request.nextUrl.searchParams.get("variantId")
    const variantAccess = await requireVariantAccess({
      gymId: scope.gymId,
      tier: sessionResult.user.subscriptionPlan ?? null,
      role: sessionResult.user.role ?? null,
      requestedVariantId,
      sessionVariantId: sessionResult.user.gymVariantId ?? null,
    })
    if (!variantAccess.ok) return variantAccess.response

    const gymVariantId = variantAccess.variantId

    const params = request.nextUrl.searchParams
    const search = params.get("q")?.trim() ?? ""
    const limitParam = Number(params.get("limit"))
    const pageParam = Number(params.get("page"))
    const openVisitParam = params.get("openVisit")
    const includeOpenVisitId = params.get("includeOpenVisitId") === "true"

    const shouldPaginate =
      Boolean(search) ||
      openVisitParam === "true" ||
      openVisitParam === "false" ||
      Number.isFinite(limitParam) ||
      Number.isFinite(pageParam)

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
    const take = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20
    const skip = (page - 1) * take

    const where: {
      gymId: string
      gymVariantId?: string
      OR?: Array<Record<string, any>>
      visits?: Record<string, any>
    } = {
      gymId: scope.gymId,
      ...(gymVariantId ? { gymVariantId } : {}),
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    if (openVisitParam === "true") {
      where.visits = { some: { checkOut: null } }
    }
    if (openVisitParam === "false") {
      where.visits = { none: { checkOut: null } }
    }

    const gymVariantInclude = { gymVariant: { select: { id: true, name: true, slug: true } } } as const
    const openVisitInclude = {
      visits: {
        where: { checkOut: null },
        select: { id: true },
        orderBy: { checkIn: "desc" as const },
        take: 1,
      },
    } as const

    if (shouldPaginate) {
      if (includeOpenVisitId) {
        const [members, total] = await Promise.all([
          prisma.member.findMany({
            where,
            include: { ...gymVariantInclude, ...openVisitInclude },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
            skip,
            take,
          }),
          prisma.member.count({ where }),
        ])

        const items = members.map(({ visits, ...member }) => ({
          ...member,
          openVisitId: visits?.[0]?.id ?? null,
        }))

        return NextResponse.json({
          items,
          total,
          page,
          pageSize: take,
          hasMore: page * take < total,
        })
      }

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          include: gymVariantInclude,
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
          skip,
          take,
        }),
        prisma.member.count({ where }),
      ])

      return NextResponse.json({
        items: members,
        total,
        page,
        pageSize: take,
        hasMore: page * take < total,
      })
    }

    if (includeOpenVisitId) {
      const members = await prisma.member.findMany({
        where,
        include: { ...gymVariantInclude, ...openVisitInclude },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
      })
      const items = members.map(({ visits, ...member }) => ({
        ...member,
        openVisitId: visits?.[0]?.id ?? null,
      }))
      return NextResponse.json(items)
    }

    const members = await prisma.member.findMany({
      where,
      include: gymVariantInclude,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
    })
    return NextResponse.json(members)
  } catch {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymMembersWrite)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const payload = createMemberSchema.parse(await request.json())
    const gymId = scope.gymId
    const role = sessionResult.user.role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined

    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return jsonError(403, "MISSING_VARIANT", "Variant manquant")
    }

    let targetVariantId = role === "GYM_ADMIN" ? sessionVariantId : payload.gymVariantId
    if (!targetVariantId) {
      const defaultVariant = await prisma.gymVariant.findFirst({
        where: { gymId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })
      targetVariantId = defaultVariant?.id
    }

    if (!targetVariantId) {
      return NextResponse.json({ error: "Variant introuvable" }, { status: 400 })
    }

    const variant = await prisma.gymVariant.findFirst({
      where: { id: targetVariantId, gymId },
      select: { id: true },
    })

    if (!variant) {
      return NextResponse.json({ error: "Variant invalide" }, { status: 400 })
    }

    const member = await db.createMember({
      gymId,
      gymVariantId: variant.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
    })

    let subscription: Awaited<ReturnType<typeof prisma.subscription.create>> | null = null

    if (payload.planId || payload.startDate) {
      if (!payload.planId || !payload.startDate) {
        return NextResponse.json(
          { error: "Plan et date de debut requis pour creer un abonnement" },
          { status: 400 },
        )
      }

      const plan = await prisma.membershipPlan.findFirst({
        where: { id: payload.planId, gymId, gymVariantId: variant.id },
      })

      if (!plan) {
        return NextResponse.json({ error: "Plan introuvable" }, { status: 404 })
      }

      const start = new Date(payload.startDate)
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: "Date de debut invalide" }, { status: 400 })
      }

      const end = new Date(start)
      end.setDate(end.getDate() + plan.durationDays)
      const status = computeSubscriptionStatus(end)

      subscription = await prisma.subscription.create({
        data: {
          memberId: member.id,
          gymId,
          gymVariantId: variant.id,
          planId: plan.id,
          startDate: start,
          endDate: end,
          pricePaid: plan.price,
          status,
        },
      })

      await prisma.payment.create({
        data: {
          gymId,
          amount: plan.price,
          currency: "MAD",
          paymentDate: start,
          subscriptions: {
            connect: { id: subscription.id },
          },
        },
      })
    }

    return NextResponse.json(subscription ? { member, subscription } : member, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    console.error("members.post", error)
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 })
  }
}
