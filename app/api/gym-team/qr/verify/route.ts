import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { AccessEventSource, AccessEventStatus, ClassBookingStatus } from "@prisma/client"
import { z } from "zod"

import { resolveAccessEventStatus } from "@/lib/access-events"
import { authOptions } from "@/lib/auth-middleware"
import { extractQrToken } from "@/lib/qr"
import { prisma } from "@/lib/prisma"
import { getClientIdentifier, rateLimit } from "@/lib/rate-limit"
import { evaluateCheckInRules, recordOverstayRule } from "@/lib/rules-engine"
import { markCheckoutForMember, markVisitForMember } from "@/lib/visits"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

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
    const client = getClientIdentifier(request)
    const ipLimit = rateLimit({ key: `qr-verify:ip:${client}`, limit: 5, windowMs: 60_000 })
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": `${ipLimit.retryAfter}` } },
      )
    }
    const tokenLimit = rateLimit({ key: `qr-verify:ip-token:${client}:${token}`, limit: 3, windowMs: 60_000 })
    if (!tokenLimit.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": `${tokenLimit.retryAfter}` } },
      )
    }

    const member = await prisma.member.findFirst({
      where: {
        qrToken: token,
        ...(sessionGymId && sessionRole !== "SUPER_ADMIN" ? { gymId: sessionGymId } : {}),
      },
      select: {
        id: true,
        gymId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
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

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [visit, classes, recentVisits, visitsLast30Days] = await Promise.all([
      markVisitForMember({
        gymId: member.gymId,
        memberId: member.id,
        markVisit: false,
      }),
      prisma.classBooking.findMany({
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
      }),
      prisma.visit.findMany({
        where: { memberId: member.id },
        orderBy: { checkIn: "desc" },
        take: 4,
        include: { gymVariant: { select: { name: true } } },
      }),
      prisma.visit.count({
        where: { memberId: member.id, checkIn: { gte: thirtyDaysAgo } },
      }),
    ])

    const isStaff =
      Boolean(sessionGymId && member.gymId === sessionGymId) &&
      (sessionRole === "GYM_OWNER" || sessionRole === "GYM_ADMIN" || sessionRole === "SUPER_ADMIN")

    const memberFeatures = await resolveGymFeatures({
      gymId: member.gymId,
      tier: member.gym?.subscriptionPlan ?? null,
    })

    const baseResponse = {
      context: isStaff ? "staff" : "public",
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: isStaff ? member.email ?? null : null,
        phone: isStaff ? member.phone ?? null : null,
        variantName: member.gymVariant?.name ?? null,
        gymName: member.gym?.name ?? null,
      },
      subscription: {
        planName: isStaff ? visit.planName : null,
        planDurationDays: isStaff ? visit.planDurationDays : null,
        startDate: isStaff ? visit.subscriptionStartsAt : null,
        endDate: visit.subscriptionEndsAt,
        status: visit.status,
        active: visit.active,
        daysRemaining: typeof visit.daysRemaining === "number" ? Math.max(visit.daysRemaining, 0) : null,
      },
      visits: {
        visitsToday: visit.visitsToday,
        visitLimit: visit.visitLimit,
        visitsRemaining: visit.visitsRemaining,
        limitState: visit.limitState,
        overDailyLimit: visit.overDailyLimit,
        recent: isStaff
          ? recentVisits.map((entry) => ({
              id: entry.id,
              checkIn: entry.checkIn,
              checkOut: entry.checkOut,
              variantName: entry.gymVariant?.name ?? null,
            }))
          : [],
        last30Days: visitsLast30Days,
      },
      classes: isStaff
        ? classes.map((item) => ({
            id: item.classSession.id,
            title: item.classSession.title,
            startAt: item.classSession.startAt,
            endAt: item.classSession.endAt,
            coach: item.classSession.coach,
            room: item.classSession.room,
            variantName: item.classSession.gymVariant?.name ?? null,
          }))
        : [],
    }

    if (isStaff) {
      return NextResponse.json({
        ...baseResponse,
        features: {
          accessControl: memberFeatures.features.accessControl,
          courses: memberFeatures.features.courses,
        },
      })
    }

    return NextResponse.json(baseResponse)
  } catch (error) {
    console.error("[access-event][qr-profile]", error)
    return NextResponse.json({ error: "Unable to resolve member" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVisitsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = (sessionResult.user as any)?.role as string | undefined
  const gymVariantId = sessionResult.user.gymVariantId ?? undefined
  const tier = sessionResult.user.subscriptionPlan ?? null

  if (role === "GYM_ADMIN" && !gymVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.accessControl) {
    return jsonError(403, "ACCESS_CONTROL_REQUIRED", "Plan Pro ou Enterprise requis")
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
      gymId: scope.gymId,
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
        gymId: scope.gymId,
        memberId: member.id,
        allowedVariantId,
        checkoutAt: checkoutDate ?? undefined,
        rangeFrom: fromDate ?? undefined,
        rangeTo: toDate ?? undefined,
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

      if (checkout.isOverMaxDuration) {
        await recordOverstayRule({
          gymId: scope.gymId,
          gymVariantId: checkout.variantId,
          memberId: checkout.memberId,
          visitId: checkout.visitId,
          durationMinutes: checkout.durationMinutes,
          limitMinutes: checkout.sessionLimitMinutes ?? undefined,
        })
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
      gymId: scope.gymId,
      memberId: member.id,
      markVisit,
      allowedVariantId,
    })

    const status = resolveAccessEventStatus(visit, "CHECK_IN")
    const rules = await evaluateCheckInRules({
      gymId: scope.gymId,
      gymVariantId: member.gymVariantId,
      memberId: member.id,
      visitId: visit.visitId,
    })

    if (features.accessControl) {
      try {
        await prisma.accessEvent.create({
          data: {
            memberId: member.id,
            status: rules.shouldThrottle ? AccessEventStatus.DENIED_FORBIDDEN : status,
            source: AccessEventSource.QR_SCAN,
          },
        })
      } catch (error) {
        console.error("[access-event][qr-verify]", error)
      }
    }

    if (rules.shouldThrottle) {
      return NextResponse.json(
        { error: "Capacity reached, throttling new entries", code: "CAPACITY_THROTTLED" },
        { status: 429 },
      )
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
      daysRemaining: typeof visit.daysRemaining === "number" ? Math.max(visit.daysRemaining, 0) : null,
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
