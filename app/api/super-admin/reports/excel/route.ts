import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { utils, write } from "xlsx"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { formatExportCurrency, resolveExportLocale } from "@/lib/export-locale"

const querySchema = z.object({
  scope: z.enum(["global", "gym"]).default("global"),
  gymId: z.string().optional(),
})

const labels = {
  fr: {
    gym: "Salle",
    plan: "Plan",
    billing: "Facturation",
    status: "Statut",
    members: "Membres",
    activeSubscriptions: "Abonnements actifs",
    revenue: "Revenus",
    owner: "Propriétaire",
    field: "Champ",
    value: "Valeur",
  },
  en: {
    gym: "Gym",
    plan: "Plan",
    billing: "Billing",
    status: "Status",
    members: "Members",
    activeSubscriptions: "Active subscriptions",
    revenue: "Revenue",
    owner: "Owner",
    field: "Field",
    value: "Value",
  },
  ar: {
    gym: "النادي",
    plan: "الخطة",
    billing: "الفوترة",
    status: "الحالة",
    members: "الأعضاء",
    activeSubscriptions: "الاشتراكات النشطة",
    revenue: "الإيرادات",
    owner: "المالك",
    field: "الحقل",
    value: "القيمة",
  },
}

function rowsToWorkbook(rows: Array<Array<string | number>>) {
  const worksheet = utils.aoa_to_sheet(rows)
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, "Rapport")
  return write(workbook, { type: "buffer", bookType: "xlsx" })
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = querySchema.safeParse({
    scope: request.nextUrl.searchParams.get("scope") ?? undefined,
    gymId: request.nextUrl.searchParams.get("gymId") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 })
  }

  const { scope, gymId } = parsed.data
  const locale = resolveExportLocale(request.nextUrl.searchParams.get("locale"))
  const wording = labels[locale]
  const currency = (value: number | null | undefined) => formatExportCurrency(value ?? 0, locale, "MAD")
  const filenameParts = ["super-admin", scope]
  let rows: Array<Array<string | number>> = []

  if (scope === "global") {
    const gyms = await prisma.gym.findMany({
      include: {
        _count: { select: { members: true, subscriptions: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    const revenueByGym = await prisma.payment.groupBy({
      by: ["gymId"],
      _sum: { amount: true },
    })
    const revenueLookup = new Map(revenueByGym.map((entry) => [entry.gymId, entry._sum.amount ?? 0]))
    rows = [
      [wording.gym, wording.plan, wording.billing, wording.status, wording.members, wording.activeSubscriptions, wording.revenue],
    ]
    gyms.forEach((gym) => {
      rows.push([
        gym.name,
        gym.subscriptionPlan,
        gym.billingInterval,
        gym.subscriptionStatus,
        gym._count.members,
        gym._count.subscriptions,
        currency(revenueLookup.get(gym.id) ?? 0),
      ])
    })
  } else if (scope === "gym" && gymId) {
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        _count: { select: { members: true, subscriptions: true } },
        owner: { select: { email: true } },
      },
    })

    if (!gym) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 })
    }

    filenameParts.push(gymId)
    const payments = await prisma.payment.aggregate({
      where: { gymId },
      _sum: { amount: true },
    })

    rows = [
      [wording.field, wording.value],
      [wording.gym, gym.name],
      [wording.plan, gym.subscriptionPlan],
      [wording.billing, gym.billingInterval],
      [wording.status, gym.subscriptionStatus],
      [wording.owner, gym.owner?.email ?? "--"],
      [wording.members, gym._count.members],
      [wording.activeSubscriptions, gym._count.subscriptions],
      [wording.revenue, currency(payments._sum.amount ?? 0)],
    ]
  } else {
    return NextResponse.json({ error: "Parametres manquants" }, { status: 400 })
  }

  const filename = `${filenameParts.join("-")}-${Date.now()}.xlsx`
  const payload = rowsToWorkbook(rows)

  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
