import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { ClassBookingStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"

const classSessionSchema = z.object({
  title: z.string().min(1),
  coach: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  capacity: z.coerce.number().int().min(1),
  startAt: z.string(),
  endAt: z.string(),
  gymVariantId: z.string().optional(),
  waitlist: z.boolean().optional(),
})

const startOfWeek = (value: Date) => {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfWeek = (value: Date) => {
  const start = startOfWeek(value)
  start.setDate(start.getDate() + 6)
  start.setHours(23, 59, 59, 999)
  return start
}

export async function GET(request: NextRequest) {
  const auth = await getServerSession(authOptions)
  const gymId = auth?.user?.gymId as string | undefined
  const role = (auth?.user as any)?.role as string | undefined
  const sessionVariantId = (auth?.user as any)?.gymVariantId as string | undefined
  const tier = (auth?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasPlanFeature(tier, "courses")) {
    return NextResponse.json({ error: "Plan Enterprise requis" }, { status: 403 })
  }
  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const requestedVariant = params.get("variantId")

  let gymVariantId = role === "GYM_ADMIN" ? sessionVariantId : undefined
  if (role === "GYM_OWNER" && requestedVariant && requestedVariant !== "all") {
    const variant = await prisma.gymVariant.findFirst({
      where: { id: requestedVariant, gymId },
      select: { id: true },
    })
    if (!variant) {
      return NextResponse.json({ error: "Variant invalide" }, { status: 400 })
    }
    gymVariantId = variant.id
  }

  const fromParam = params.get("from")
  const toParam = params.get("to")

  let fromDate = fromParam ? new Date(fromParam) : startOfWeek(new Date())
  let toDate = toParam ? new Date(toParam) : endOfWeek(new Date())

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Plage de dates invalide" }, { status: 400 })
  }

  if (fromDate.getTime() > toDate.getTime()) {
    const swap = fromDate
    fromDate = toDate
    toDate = swap
  }

  try {
    const classes = await prisma.classSession.findMany({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        startAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { startAt: "asc" },
      include: {
        gymVariant: { select: { id: true, name: true, slug: true, isDefault: true } },
        bookings: { select: { status: true } },
      },
    })

    const payload = classes.map((item) => {
      const confirmedCount = item.bookings.filter((booking) => booking.status === ClassBookingStatus.CONFIRMED).length
      const waitlistCount = item.bookings.filter((booking) => booking.status === ClassBookingStatus.WAITLISTED).length
      const { bookings, ...rest } = item
      return { ...rest, confirmedCount, waitlistCount }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[classes][get]", error)
    return NextResponse.json({ error: "Impossible de charger les cours" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await getServerSession(authOptions)
  const gymId = auth?.user?.gymId as string | undefined
  const role = (auth?.user as any)?.role as string | undefined
  const sessionVariantId = (auth?.user as any)?.gymVariantId as string | undefined
  const tier = (auth?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasPlanFeature(tier, "courses")) {
    return NextResponse.json({ error: "Plan Enterprise requis" }, { status: 403 })
  }
  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  let payload: z.infer<typeof classSessionSchema>
  try {
    payload = classSessionSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Champs invalides" }, { status: 400 })
  }

  const startAt = new Date(payload.startAt)
  const endAt = new Date(payload.endAt)

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 })
  }

  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "L'heure de fin doit etre apres le debut" }, { status: 400 })
  }

  let gymVariantId = role === "GYM_ADMIN" ? sessionVariantId : payload.gymVariantId

  if (!gymVariantId) {
    const defaultVariant = await prisma.gymVariant.findFirst({
      where: { gymId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    })
    gymVariantId = defaultVariant?.id
  }

  if (!gymVariantId) {
    return NextResponse.json({ error: "Variante introuvable" }, { status: 400 })
  }

  const variant = await prisma.gymVariant.findFirst({
    where: { id: gymVariantId, gymId },
    select: { id: true },
  })

  if (!variant) {
    return NextResponse.json({ error: "Variante invalide" }, { status: 400 })
  }

  try {
    const created = await prisma.classSession.create({
      data: {
        gymId,
        gymVariantId: variant.id,
        title: payload.title,
        coach: payload.coach ?? null,
        room: payload.room ?? null,
        capacity: payload.capacity,
        startAt,
        endAt,
        waitlist: payload.waitlist ?? true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[classes][post]", error)
    return NextResponse.json({ error: "Impossible de creer le cours" }, { status: 500 })
  }
}
