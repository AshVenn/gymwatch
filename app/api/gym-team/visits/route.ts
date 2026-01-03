import { NextRequest, NextResponse } from "next/server"
import { AccessEventSource, AccessEventStatus } from "@prisma/client"
import { getVisitAnalytics, markCheckoutForMember, markVisitForMember } from "@/lib/visits"
import { resolveAccessEventStatus } from "@/lib/access-events"
import { prisma } from "@/lib/prisma"
import { resolveGymFeatures } from "@/lib/tenant-features"
import {
  jsonError,
  requireGymScope,
  requirePermission,
  requireSession,
  requireVariantAccess,
} from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

export async function GET(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVisitsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = sessionResult.user.role as string | undefined
  const gymVariantId = sessionResult.user.gymVariantId ?? null
  const tier = sessionResult.user.subscriptionPlan ?? null

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.presenceTracking) {
    return jsonError(403, "PRESENCE_REQUIRED", "Plan Pro ou Enterprise requis")
  }

  const params = request.nextUrl.searchParams
  const view = params.get("view") === "period" ? "period" : "day"
  const search = params.get("q")?.trim() ?? ""
  const pageParam = Number(params.get("page"))
  const pageSizeParam = Number(params.get("pageSize") ?? params.get("limit"))
  const page = Number.isFinite(pageParam) ? pageParam : 1
  const pageSize = Number.isFinite(pageSizeParam) ? pageSizeParam : 120

  const requestedVariant = params.get("variantId")
  const variantAccess = await requireVariantAccess({
    gymId: scope.gymId,
    tier,
    role,
    requestedVariantId: requestedVariant,
    sessionVariantId: gymVariantId,
  })
  if (!variantAccess.ok) return variantAccess.response

  const variantId = variantAccess.variantId

  let date: Date | undefined
  let from: Date | undefined
  let to: Date | undefined

  if (view === "day") {
    const dateParam = params.get("date")
    if (dateParam) {
      const parsed = new Date(dateParam)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Date invalide" }, { status: 400 })
      }
      date = parsed
    }
  } else {
    const fromParam = params.get("from")
    const toParam = params.get("to")
    if (fromParam) {
      const parsedFrom = new Date(fromParam)
      if (Number.isNaN(parsedFrom.getTime())) {
        return NextResponse.json({ error: "Date de debut invalide" }, { status: 400 })
      }
      from = parsedFrom
    }
    if (toParam) {
      const parsedTo = new Date(toParam)
      if (Number.isNaN(parsedTo.getTime())) {
        return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 })
      }
      to = parsedTo
    }
    if (from && to && from.getTime() > to.getTime()) {
      const swap = from
      from = to
      to = swap
    }
  }

  try {
    const analytics = await getVisitAnalytics({
      gymId: scope.gymId,
      variantId,
      view,
      date,
      from,
      to,
      search: search || undefined,
      page,
      pageSize,
    })

    return NextResponse.json({
      ...analytics,
      variantScope: {
      variantId: variantId ?? null,
      variantMode: variantAccess.variantMode,
      multiLocationAllowed: variantAccess.multiLocationAllowed,
    },
  })
  } catch (error) {
    console.error("[visits][get]", error)
    return NextResponse.json({ error: "Impossible de charger les visites" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVisitsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = sessionResult.user.role as string | undefined
  const gymVariantId = sessionResult.user.gymVariantId ?? null
  const tier = sessionResult.user.subscriptionPlan ?? null

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.presenceTracking) {
    return jsonError(403, "PRESENCE_REQUIRED", "Plan Pro ou Enterprise requis")
  }

  const {
    memberId,
    markVisit = true,
    direction = "IN",
    visitId,
    checkoutAt,
    rangeFrom,
    rangeTo,
  } = await request.json()
  const mode = typeof direction === "string" && direction.toUpperCase() === "OUT" ? "OUT" : "IN"
  const memberIdentifier = typeof memberId === "string" ? memberId : undefined
  const allowedVariantId = role === "GYM_ADMIN" ? gymVariantId ?? undefined : undefined
  if (role === "GYM_ADMIN" && !allowedVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  const parseDate = (value: unknown): Date | undefined | "INVALID" => {
    if (!value || typeof value !== "string") return undefined
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? "INVALID" : parsed
  }

  const checkoutDate = parseDate(checkoutAt)
  if (checkoutDate === "INVALID") {
    return NextResponse.json({ error: "Heure de sortie invalide" }, { status: 400 })
  }
  let fromDate = parseDate(rangeFrom)
  if (fromDate === "INVALID") {
    return NextResponse.json({ error: "Plage horaire (du) invalide" }, { status: 400 })
  }
  let toDate = parseDate(rangeTo)
  if (toDate === "INVALID") {
    return NextResponse.json({ error: "Plage horaire (au) invalide" }, { status: 400 })
  }
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    const swap = fromDate
    fromDate = toDate
    toDate = swap
  }

  if (mode === "OUT" && !memberIdentifier && (!visitId || typeof visitId !== "string")) {
    return NextResponse.json({ error: "memberId ou visitId requis" }, { status: 400 })
  }
  if (mode === "IN" && !memberIdentifier) {
    return NextResponse.json({ error: "memberId requis" }, { status: 400 })
  }

    try {
      if (mode === "OUT") {
        const checkout = await markCheckoutForMember({
          gymId: scope.gymId,
          memberId: memberIdentifier,
          visitId: typeof visitId === "string" ? visitId : undefined,
          checkoutAt: checkoutDate,
          allowedVariantId,
          rangeFrom: fromDate,
          rangeTo: toDate,
        })

        const accessStatus = checkout.isOverMaxDuration
          ? AccessEventStatus.SESSION_OVERSTAY
          : AccessEventStatus.CHECKED_OUT

        if (features.accessControl) {
          try {
            await prisma.accessEvent.create({
              data: {
                memberId: checkout.memberId,
                status: accessStatus,
                source: AccessEventSource.MANUAL,
              },
            })
          } catch (error) {
            console.error("[access-events][visits-checkout]", error)
          }
        }

        return NextResponse.json({ ...checkout, mode: "CHECK_OUT" })
      }

      const memberId = memberIdentifier!
      const result = await markVisitForMember({
        gymId: scope.gymId,
        memberId,
        markVisit,
        allowedVariantId,
      })

      if (features.accessControl) {
        try {
          const status = resolveAccessEventStatus(result, "CHECK_IN")
            await prisma.accessEvent.create({
              data: {
                memberId,
                status,
                source: AccessEventSource.MANUAL,
              },
            })
        } catch (error) {
          console.error("[access-events][visits]", error)
        }
      }

      return NextResponse.json({ ...result, mode: "CHECK_IN" })
    } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark visit"
    const status =
      message === "Member not found"
        ? 404
        : message === "FORBIDDEN_VARIANT" || message === "FORBIDDEN_VISIT"
          ? 403
          : message === "OPEN_VISIT_NOT_FOUND"
            ? 404
            : 500
    const displayMessage =
      message === "OPEN_VISIT_NOT_FOUND"
        ? "Aucune visite en cours pour ce membre"
        : message === "FORBIDDEN_VISIT"
          ? "Visite non autorisee pour cette salle"
          : message
    return NextResponse.json({ error: displayMessage }, { status })
  }
}
