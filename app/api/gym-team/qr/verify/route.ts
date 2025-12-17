import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { AccessEventSource, AccessEventStatus, ClassBookingStatus } from "@prisma/client"
import { z } from "zod"

import { resolveAccessEventStatus } from "@/lib/access-events"
import { authOptions } from "@/lib/auth-middleware"
import { extractQrToken } from "@/lib/qr"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"
import { markCheckoutForMember, markVisitForMember } from "@/lib/visits"

const scanPayloadSchema = z.object({
  token: z.string(),
  markVisit: z.boolean().optional(),
  direction: z.string().optional(),
  checkoutAt: z.string().optional(),
  rangeFrom: z.string().optional(),
  rangeTo: z.string().optional(),
})

function parseToken(rawToken: unknown) {
  const token = typeof rawToken === "string" ? extractQrToken(rawToken) : null
  if (!token) return null
  if (token.length < 12 || token.length > 128) return null
  return token
}

function parseDate(value: unknown): Date | undefined | "INVALID" {
  if (!value || typeof value !== "string") return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "INVALID" : parsed
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionGymId = (session?.user as any)?.gymId as string | undefined
  const sessionRole = (session?.user as any)?.role as string | undefined

  const rawToken = request.nextUrl.searchParams.get("token")
  const token = parseToken(rawToken)
  if (!token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  try {
    const member = await prisma.member.findFirst({
      where: {
        qrToken: token,
        ...(sessionGymId && sessionRole !== "SUPER_ADMIN" ? { gymId: sessionGymId } : {}),
      },
      include: {
        gym: { select: { id: true, name: true, subscriptionPlan: true } },
        gymVariant: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (sessionGymId && sessionRole !== "SUPER_ADMIN" && member.gymId !== sessionGymId) {
      return NextResponse.json({ error: "FORBIDDEN_GYM" }, { status: 403 })
    }

    const visit = await markVisitForMember({
      gymId: member.gymId,
      memberId: member.id,
      markVisit: false,
    })

    const now = new Date()
    const classes = await prisma.classBooking.findMany({
      where: {
        memberId: member.id,
        status: ClassBookingStatus.CONFIRMED,
        classSession: {
          startAt: { gte: now },
        },
      },
      include: {
        classSession: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            coach: true,
            room: true,
            gymVariant: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { classSession: { startAt: "asc" } },
      take: 5,
    })

    const isStaff =
      Boolean(sessionGymId && member.gymId === sessionGymId) &&
      (sessionRole === "GYM_OWNER" || sessionRole === "GYM_ADMIN" || sessionRole === "SUPER_ADMIN")

    return NextResponse.json({
      context: isStaff ? "staff" : "public",
      features: {
        accessControl: hasPlanFeature(member.gym?.subscriptionPlan ?? null, "accessControl"),
        courses: hasPlanFeature(member.gym?.subscriptionPlan ?? null, "courses"),
      },
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        variantName: member.gymVariant?.name ?? null,
        gymName: member.gym?.name ?? null,
      },
      subscription: {
        planName: visit.planName,
        planDurationDays: visit.planDurationDays,
        startDate: visit.subscriptionStartsAt,
        endDate: visit.subscriptionEndsAt,
        status: visit.status,
        active: visit.active,
        daysRemaining: visit.daysRemaining,
      },
      visits: {
        visitsToday: visit.visitsToday,
        visitLimit: visit.visitLimit,
        visitsRemaining: visit.visitsRemaining,
        limitState: visit.limitState,
        overDailyLimit: visit.overDailyLimit,
      },
      classes: classes.map((item) => ({
        id: item.classSession.id,
        title: item.classSession.title,
        startAt: item.classSession.startAt,
        endAt: item.classSession.endAt,
        coach: item.classSession.coach,
        room: item.classSession.room,
        variantName: item.classSession.gymVariant?.name ?? null,
      })),
    })
  } catch (error) {
    console.error("[access-event][qr-profile]", error)
    return NextResponse.json({ error: "Unable to resolve member" }, { status: 500 })
  }
}

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

  const body = scanPayloadSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const mode = typeof body.data.direction === "string" && body.data.direction.toUpperCase() === "OUT" ? "OUT" : "IN"
  const allowedVariantId = role === "GYM_ADMIN" ? gymVariantId : undefined

  const token = parseToken(body.data.token)
  if (!token) {
    return NextResponse.json({ error: "Token invalide" }, { status: 400 })
  }

  const { markVisit = true, checkoutAt, rangeFrom, rangeTo } = body.data
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
        const accessStatus = checkout.isOverMaxDuration
          ? AccessEventStatus.SESSION_OVERSTAY
          : AccessEventStatus.CHECKED_OUT
        await prisma.accessEvent.create({
          data: {
            memberId: checkout.memberId,
            status: accessStatus,
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
          isOverMaxDuration: checkout.isOverMaxDuration,
          sessionLimitMinutes: checkout.sessionLimitMinutes,
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
      visitsToday: visit.visitsToday,
      visitLimit: visit.visitLimit,
      overDailyLimit: visit.overDailyLimit,
      visitsRemaining: visit.visitsRemaining,
      limitState: visit.limitState,
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
