import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { AccessEventSource, AccessEventStatus, Prisma } from "@prisma/client"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { resolveAccessEventStatus } from "@/lib/access-events"
import { markCheckoutForMember, markVisitForMember } from "@/lib/visits"
import { resolveVariantAccess } from "@/lib/variant-access"
import { buildSessionLimitResolver } from "@/lib/session-limits"
import { resolveGymFeatures } from "@/lib/tenant-features"

const createSchema = z
  .object({
    memberId: z.string().optional(),
    token: z.string().optional(),
    source: z.nativeEnum(AccessEventSource).optional(),
    markVisit: z.boolean().optional(),
    direction: z.enum(["IN", "OUT"]).optional(),
    visitId: z.string().optional(),
    checkoutAt: z.string().optional(),
    rangeFrom: z.string().optional(),
    rangeTo: z.string().optional(),
  })
  .refine((payload) => Boolean(payload.memberId || payload.token || payload.visitId), {
    message: "memberId, token ou visitId requis",
  })

function parseStatus(value: string | null): AccessEventStatus | null {
  if (!value) return null
  return Object.values(AccessEventStatus).includes(value as AccessEventStatus)
    ? (value as AccessEventStatus)
    : null
}

function parseSource(value: string | null): AccessEventSource | null {
  if (!value) return null
  return Object.values(AccessEventSource).includes(value as AccessEventSource)
    ? (value as AccessEventSource)
    : null
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const gymVariantId = (session?.user as any)?.gymVariantId as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { features } = await resolveGymFeatures({ gymId, tier })
  if (!features.accessControl) {
    return NextResponse.json({ error: "Plan Pro ou Enterprise requis" }, { status: 403 })
  }
  if (role === "GYM_ADMIN" && !gymVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const statusFilter = parseStatus(params.get("status"))
  const sourceFilter = parseSource(params.get("source"))
  const memberFilter = params.get("memberId") || null
  const requestedVariant = params.get("variantId")
  const search = params.get("q")?.trim() ?? ""
  const from = params.get("from")
  const to = params.get("to")

  const pageRaw = Number(params.get("page"))
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const pageSizeRaw = Number(params.get("pageSize"))
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(Math.floor(pageSizeRaw), 1), 200) : 10
  const skip = (page - 1) * pageSize

  const variantAccess = await resolveVariantAccess({
    gymId,
    tier,
    role,
    requestedVariantId: requestedVariant,
    sessionVariantId: gymVariantId,
  })

  if (!variantAccess.ok) {
    return NextResponse.json(
      {
        error: variantAccess.message,
        code: variantAccess.code,
        variantMode: variantAccess.variantMode,
        defaultVariantId: variantAccess.defaultVariantId,
        multiLocationAllowed: variantAccess.multiLocationAllowed,
      },
      { status: variantAccess.status },
    )
  }

  const variantId = variantAccess.variantId

  const createdAt: Prisma.DateTimeFilter = {}
  if (from) {
    const fromDate = new Date(from)
    if (Number.isNaN(fromDate.getTime())) {
      return NextResponse.json({ error: "Date de debut invalide" }, { status: 400 })
    }
    createdAt.gte = fromDate
  }
  if (to) {
    const toDate = new Date(to)
    if (Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 })
    }
    createdAt.lte = toDate
  }

  const where: Prisma.AccessEventWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(sourceFilter ? { source: sourceFilter } : {}),
    ...(memberFilter ? { memberId: memberFilter } : {}),
    ...(from || to ? { createdAt } : {}),
    member: {
      gymId,
      ...(variantId ? { gymVariantId: variantId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  }

  try {
    const total = await prisma.accessEvent.count({ where })

    const events = await prisma.accessEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            gymVariantId: true,
            gymVariant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    const memberIds = Array.from(new Set(events.map((event) => event.memberId).filter(Boolean)))
    const sessionLimitResolver = await buildSessionLimitResolver({ gymId, memberIds })
    const sessionLimitByEvent = new Map<string, number | null>()
    const limitValues: number[] = []

    for (const event of events) {
      const limit = sessionLimitResolver.resolve(event.memberId, event.member?.gymVariant?.id ?? null)
      sessionLimitByEvent.set(event.id, limit)
      if (typeof limit === "number") {
        limitValues.push(limit)
      }
    }

    const checkoutEvents = events.filter(
      (event) =>
        Boolean(event.memberId) &&
        [AccessEventStatus.CHECKED_OUT, AccessEventStatus.SESSION_OVERSTAY].includes(event.status),
    )

    const checkoutDurations = new Map<string, number>()
    if (checkoutEvents.length) {
      await Promise.all(
        checkoutEvents.map(async (event) => {
          if (!event.memberId) return
          const memberVariantId = event.member?.gymVariant?.id ?? null
          const visit = await prisma.visit.findFirst({
            where: {
              gymId,
              memberId: event.memberId,
              ...(memberVariantId ? { gymVariantId: memberVariantId } : {}),
              checkOut: { lte: event.createdAt },
            },
            orderBy: { checkOut: "desc" },
            select: { checkIn: true, checkOut: true },
          })

          if (visit?.checkOut) {
            const durationMinutes = Math.max(
              0,
              Math.round((visit.checkOut.getTime() - visit.checkIn.getTime()) / 60000),
            )
            checkoutDurations.set(event.id, durationMinutes)
          }
        }),
      )
    }

    const openSessionDurations = new Map<string, number>()
    const overdueMembers = new Set<string>()

    if (memberIds.length) {
      const openVisits = await prisma.visit.findMany({
        where: {
          gymId,
          ...(variantId ? { gymVariantId: variantId } : {}),
          memberId: { in: memberIds as string[] },
          checkOut: null,
        },
        select: { memberId: true, checkIn: true, gymVariantId: true },
      })

      const now = new Date()
      openVisits.forEach((visit) => {
        const durationMinutes = Math.max(
          0,
          Math.round((now.getTime() - visit.checkIn.getTime()) / 60000),
        )
        openSessionDurations.set(visit.memberId, durationMinutes)
        const limit = sessionLimitResolver.resolve(visit.memberId, visit.gymVariantId)
        if (limit !== null && durationMinutes > limit) {
          overdueMembers.add(visit.memberId)
        }
      })
    }

    const seenOpenSessionMembers = new Set<string>()
    const decoratedEvents = events.map((event) => {
      const memberId = event.memberId
      const sessionLimitMinutes = sessionLimitByEvent.get(event.id) ?? null
      let sessionDurationMinutes = checkoutDurations.get(event.id) ?? null

      if (
        sessionDurationMinutes === null &&
        memberId &&
        openSessionDurations.has(memberId) &&
        !seenOpenSessionMembers.has(memberId) &&
        [AccessEventStatus.GRANTED, AccessEventStatus.ALREADY_CHECKED_IN].includes(event.status)
      ) {
        sessionDurationMinutes = openSessionDurations.get(memberId) ?? null
        seenOpenSessionMembers.add(memberId)
      }

      return {
        ...event,
        sessionLimitMinutes,
        sessionDurationMinutes,
        sessionOverdue: event.status === AccessEventStatus.SESSION_OVERSTAY || overdueMembers.has(event.memberId),
      }
    })

    const maxSessionMinutes = limitValues.length ? Math.max(...limitValues) : null

    return NextResponse.json({ events: decoratedEvents, maxSessionMinutes, total, page, pageSize })
  } catch (error) {
    console.error("[access-events][get]", error)
    return NextResponse.json({ error: "Impossible de charger les acces" }, { status: 500 })
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
  const { features } = await resolveGymFeatures({ gymId, tier })
  if (!features.accessControl) {
    return NextResponse.json({ error: "Plan Pro ou Enterprise requis" }, { status: 403 })
  }
  if (role === "GYM_ADMIN" && !gymVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  try {
    const payload = createSchema.parse(await request.json())
    const shouldMarkVisit = payload.markVisit ?? false
    const direction = payload.direction === "OUT" ? "OUT" : "IN"
    const variantGuard = role === "GYM_ADMIN" ? gymVariantId : undefined

    const parseDate = (value?: string | null): Date | undefined | "INVALID" => {
      if (!value) return undefined
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? "INVALID" : parsed
    }

    const checkoutAt = parseDate(payload.checkoutAt)
    if (checkoutAt === "INVALID") {
      return NextResponse.json({ error: "Heure de sortie invalide" }, { status: 400 })
    }
    let rangeFrom = parseDate(payload.rangeFrom)
    if (rangeFrom === "INVALID") {
      return NextResponse.json({ error: "Plage horaire (du) invalide" }, { status: 400 })
    }
    let rangeTo = parseDate(payload.rangeTo)
    if (rangeTo === "INVALID") {
      return NextResponse.json({ error: "Plage horaire (au) invalide" }, { status: 400 })
    }
    if (rangeFrom && rangeTo && rangeFrom.getTime() > rangeTo.getTime()) {
      const swap = rangeFrom
      rangeFrom = rangeTo
      rangeTo = swap
    }

    const memberInclude = { gymVariant: { select: { id: true, name: true, slug: true } } }
    let member =
      payload.memberId && !payload.token
        ? await prisma.member.findFirst({
            where: {
              id: payload.memberId,
              gymId,
              ...(variantGuard ? { gymVariantId: variantGuard } : {}),
            },
            include: memberInclude,
          })
        : null

    if (!member && payload.token) {
      member = await prisma.member.findFirst({
        where: {
          qrToken: payload.token,
          gymId,
          ...(variantGuard ? { gymVariantId: variantGuard } : {}),
        },
        include: memberInclude,
      })
    }

    if (!member && payload.visitId) {
      const visitLookup = await prisma.visit.findFirst({
        where: {
          id: payload.visitId,
          gymId,
          ...(variantGuard ? { gymVariantId: variantGuard } : {}),
        },
        select: { memberId: true },
      })

      if (visitLookup) {
        member = await prisma.member.findFirst({
          where: {
            id: visitLookup.memberId,
            gymId,
            ...(variantGuard ? { gymVariantId: variantGuard } : {}),
          },
          include: memberInclude,
        })
      }
    }

    if (!member) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
    }

    if (direction === "OUT") {
      const checkout = await markCheckoutForMember({
        gymId,
        memberId: member.id,
        visitId: payload.visitId,
        checkoutAt: checkoutAt === "INVALID" ? undefined : checkoutAt,
        allowedVariantId: variantGuard,
        rangeFrom: rangeFrom === "INVALID" ? undefined : rangeFrom,
        rangeTo: rangeTo === "INVALID" ? undefined : rangeTo,
      })
      const status = checkout.isOverMaxDuration ? AccessEventStatus.SESSION_OVERSTAY : AccessEventStatus.CHECKED_OUT
      const event = await prisma.accessEvent.create({
        data: {
          memberId: member.id,
          status,
          source: payload.source ?? AccessEventSource.SIMULATOR,
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              gymVariant: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      })

      return NextResponse.json({ event, checkout, accessStatus: status, mode: "CHECK_OUT" })
    }

    const visit = await markVisitForMember({
      gymId,
      memberId: member.id,
      markVisit: shouldMarkVisit,
      allowedVariantId: variantGuard,
    })
    const status = resolveAccessEventStatus(visit, "CHECK_IN")
    const event = await prisma.accessEvent.create({
      data: {
        memberId: member.id,
        status,
        source: payload.source ?? AccessEventSource.SIMULATOR,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            gymVariant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    return NextResponse.json({ event, visit, accessStatus: status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload invalide" }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Impossible d'enregistrer l'acces"
    const status =
      message === "Membre introuvable"
        ? 404
        : message === "Member not found"
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
    console.error("[access-events][post]", error)
    return NextResponse.json({ error: displayMessage }, { status })
  }
}
