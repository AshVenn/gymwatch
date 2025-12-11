import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { AccessEventSource, AccessEventStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"
import { markCheckoutForMember, markVisitForMember } from "@/lib/visits"
import { resolveAccessEventStatus } from "@/lib/access-events"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const gymVariantId = (session?.user as any)?.gymVariantId as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasPlanFeature(tier, "accessControl")) {
    return NextResponse.json({ error: "Plan Pro ou Enterprise requis" }, { status: 403 })
  }

  const { token, markVisit = true, direction = "IN", checkoutAt, rangeFrom, rangeTo } =
    await request.json()
  const mode = typeof direction === "string" && direction.toUpperCase() === "OUT" ? "OUT" : "IN"
  const allowedVariantId = role === "GYM_ADMIN" ? gymVariantId : undefined
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

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 })
  }

  const member = await prisma.member.findFirst({
    where: {
      qrToken: token,
      gymId,
      ...(role === "GYM_ADMIN" && gymVariantId ? { gymVariantId } : {}),
    },
    select: { id: true, gymVariantId: true, firstName: true, lastName: true },
  })

  if (!member) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
  }

  try {
    if (mode === "OUT") {
      const checkout = await markCheckoutForMember({
        gymId,
        memberId: member.id,
        allowedVariantId,
        checkoutAt: checkoutDate === "INVALID" ? undefined : checkoutDate,
        rangeFrom: fromDate === "INVALID" ? undefined : fromDate,
        rangeTo: toDate === "INVALID" ? undefined : toDate,
      })

      try {
        await prisma.accessEvent.create({
          data: {
            memberId: checkout.memberId,
            status: AccessEventStatus.CHECKED_OUT,
            source: AccessEventSource.QR_SCAN,
          },
        })
      } catch (error) {
        console.error("[access-event][qr-verify-checkout]", error)
      }

      return NextResponse.json({
        mode: "CHECK_OUT",
        member: {
          id: checkout.memberId,
          firstName: checkout.firstName,
          lastName: checkout.lastName,
          variantId: checkout.variantId,
          variantName: checkout.variantName,
        },
        visit: {
          id: checkout.visitId,
          checkIn: checkout.checkIn,
          checkOut: checkout.checkOut,
          durationMinutes: checkout.durationMinutes,
        },
      })
    }

    const visit = await markVisitForMember({
      gymId,
      memberId: member.id,
      markVisit,
      allowedVariantId,
    })

    try {
      const status = resolveAccessEventStatus(visit, "CHECK_IN")
      await prisma.accessEvent.create({
        data: {
          memberId: member.id,
          status,
          source: AccessEventSource.QR_SCAN,
        },
      })
    } catch (error) {
      console.error("[access-event][qr-verify]", error)
    }

    return NextResponse.json({
      mode: "CHECK_IN",
      member: {
        id: visit.memberId,
        firstName: visit.firstName,
        lastName: visit.lastName,
        planName: visit.planName,
        subscriptionEndsAt: visit.subscriptionEndsAt,
      },
      status: visit.status,
      active: visit.active,
      daysRemaining: visit.daysRemaining,
      alreadyVisited: visit.alreadyVisited,
      todayVisitorCount: visit.todayVisitorCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan impossible"
    const status =
      message === "OPEN_VISIT_NOT_FOUND"
        ? 404
        : message === "FORBIDDEN_VARIANT" || message === "FORBIDDEN_VISIT"
          ? 403
          : 500
    const displayMessage =
      message === "OPEN_VISIT_NOT_FOUND"
        ? "Aucune visite ouverte a cloturer"
        : message === "FORBIDDEN_VISIT"
          ? "Visite non autorisee pour cette salle"
          : message
    return NextResponse.json({ error: displayMessage }, { status })
  }
}
