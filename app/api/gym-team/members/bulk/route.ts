import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { AccessEventSource, AccessEventStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { db } from "@/lib/db"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { markCheckoutForMember } from "@/lib/visits"
import { Permissions } from "@/lib/rbac/permissions"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"

const bulkSchema = z.object({
  action: z.enum(["delete", "checkout"]),
  ids: z.array(z.string().min(1)).min(1).max(200),
})

type BulkResult = {
  id: string
  ok: boolean
  code?: string
  message?: string
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymMembersBulk)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = sessionResult.user.role
  const allowedVariantId = role === "GYM_ADMIN" ? sessionResult.user.gymVariantId ?? null : null
  if (role === "GYM_ADMIN" && !allowedVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  let payload: z.infer<typeof bulkSchema>
  try {
    payload = bulkSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(400, "INVALID_PAYLOAD", "Invalid payload", error.flatten())
    }
    return jsonError(400, "INVALID_PAYLOAD", "Invalid payload")
  }

  const members = await prisma.member.findMany({
    where: {
      id: { in: payload.ids },
      gymId: scope.gymId,
      ...(allowedVariantId ? { gymVariantId: allowedVariantId } : {}),
    },
    select: { id: true, gymVariantId: true },
  })

  const memberById = new Map(members.map((member) => [member.id, member]))
  const results: BulkResult[] = []

  if (payload.action === "delete") {
    const activeSubscriptions = await prisma.subscription.groupBy({
      by: ["memberId"],
      where: {
        memberId: { in: members.map((member) => member.id) },
        status: { in: ["ACTIVE", "EXPIRES_TODAY"] },
      },
      _count: { _all: true },
    })

    const activeLookup = new Map(activeSubscriptions.map((row) => [row.memberId, row._count._all]))

    for (const id of payload.ids) {
      const member = memberById.get(id)
      if (!member) {
        results.push({ id, ok: false, code: "NOT_FOUND", message: "Membre introuvable" })
        continue
      }

      if ((activeLookup.get(id) ?? 0) > 0) {
        results.push({
          id,
          ok: false,
          code: "ACTIVE_SUBSCRIPTIONS",
          message: "Abonnements actifs en cours",
        })
        continue
      }

      try {
        await db.deleteMember(id)
        results.push({ id, ok: true })
      } catch (error) {
        console.error("[members][bulk][delete]", error)
        results.push({ id, ok: false, code: "DELETE_FAILED", message: "Suppression impossible" })
      }
    }
  } else {
    const { features } = await resolveGymFeatures({
      gymId: scope.gymId,
      tier: sessionResult.user.subscriptionPlan ?? null,
    })
    if (!features.accessControl) {
      return jsonError(403, "ACCESS_CONTROL_REQUIRED", "Plan Pro ou Enterprise requis")
    }

    for (const id of payload.ids) {
      const member = memberById.get(id)
      if (!member) {
        results.push({ id, ok: false, code: "NOT_FOUND", message: "Membre introuvable" })
        continue
      }

      try {
        const checkout = await markCheckoutForMember({
          gymId: scope.gymId,
          memberId: id,
          allowedVariantId: allowedVariantId ?? undefined,
        })

        const status = checkout.isOverMaxDuration
          ? AccessEventStatus.SESSION_OVERSTAY
          : AccessEventStatus.CHECKED_OUT

        await prisma.accessEvent.create({
          data: {
            memberId: id,
            status,
            source: AccessEventSource.MANUAL,
          },
        })

        results.push({ id, ok: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : "CHECKOUT_FAILED"
        const code =
          message === "OPEN_VISIT_NOT_FOUND"
            ? "NO_OPEN_VISIT"
            : message === "FORBIDDEN_VARIANT"
              ? "FORBIDDEN_VARIANT"
              : "CHECKOUT_FAILED"
        const label =
          code === "NO_OPEN_VISIT"
            ? "Aucune visite ouverte"
            : code === "FORBIDDEN_VARIANT"
              ? "Visite non autorisee pour cette salle"
              : "Sortie impossible"

        results.push({ id, ok: false, code, message: label })
      }
    }
  }

  const success = results.filter((row) => row.ok).length
  return NextResponse.json({
    action: payload.action,
    results,
    summary: {
      total: payload.ids.length,
      success,
      failed: payload.ids.length - success,
    },
  })
}
