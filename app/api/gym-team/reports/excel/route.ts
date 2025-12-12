import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { utils, write } from "xlsx"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"
import { resolveVariantAccess } from "@/lib/variant-access"
import { formatExportCurrency, formatExportDate, resolveExportLocale } from "@/lib/export-locale"

const querySchema = z.object({
  type: z.enum(["earnings", "top-members", "loyal-members", "member"]),
  memberId: z.string().optional(),
})

const labels = {
  fr: {
    month: "Mois",
    total: "Total",
    member: "Membre",
    email: "Email",
    totalPaid: "Total payé",
    subscriptionCount: "Nombre d'abonnements",
    field: "Champ",
    value: "Valeur",
    name: "Nom",
    phone: "Téléphone",
    totalSubscriptions: "Total abonnements",
    cumulativeAmount: "Montant cumulé",
    planPrefix: "Plan",
  },
  en: {
    month: "Month",
    total: "Total",
    member: "Member",
    email: "Email",
    totalPaid: "Total paid",
    subscriptionCount: "Subscriptions",
    field: "Field",
    value: "Value",
    name: "Name",
    phone: "Phone",
    totalSubscriptions: "Total subscriptions",
    cumulativeAmount: "Cumulative amount",
    planPrefix: "Plan",
  },
  ar: {
    month: "الشهر",
    total: "الإجمالي",
    member: "العضو",
    email: "البريد الإلكتروني",
    totalPaid: "المبلغ المدفوع",
    subscriptionCount: "عدد الاشتراكات",
    field: "الحقل",
    value: "القيمة",
    name: "الاسم",
    phone: "الهاتف",
    totalSubscriptions: "إجمالي الاشتراكات",
    cumulativeAmount: "المجموع التراكمي",
    planPrefix: "الخطة",
  },
}

function rowsToWorkbook(rows: Array<Array<string | number>>) {
  const worksheet = utils.aoa_to_sheet(rows)
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, "Rapport")
  return write(workbook, { bookType: "xlsx", type: "buffer" })
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null
  const sessionVariantId = (session?.user as any)?.gymVariantId as string | undefined

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasPlanFeature(tier, "excelReports")) {
    return NextResponse.json({ error: "Plan Pro ou Enterprise requis" }, { status: 403 })
  }

  const parsed = querySchema.safeParse({
    type: request.nextUrl.searchParams.get("type"),
    memberId: request.nextUrl.searchParams.get("memberId") ?? undefined,
  })
  const requestedVariantId = request.nextUrl.searchParams.get("variantId")
  const locale = resolveExportLocale(request.nextUrl.searchParams.get("locale"))
  const wording = labels[locale]

  const variantAccess = await resolveVariantAccess({
    gymId,
    tier,
    role,
    requestedVariantId,
    sessionVariantId,
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

  const gymVariantId = variantAccess.variantId

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 })
  }

  const { type, memberId } = parsed.data
  const currency = (value: number | null | undefined) => formatExportCurrency(value ?? 0, locale, "MAD")

  if (type === "earnings" && role === "GYM_ADMIN") {
    return NextResponse.json({ error: "Acces revenu reserve au proprietaire" }, { status: 403 })
  }

  if (type === "member" && !memberId) {
    return NextResponse.json({ error: "memberId requis" }, { status: 400 })
  }

  let rows: Array<Array<string | number>> = []
  const now = new Date()

  if (type === "earnings") {
    rows = [[wording.month, wording.total]]
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const agg = await prisma.payment.aggregate({
        where: {
          gymId,
          paymentDate: { gte: start, lte: end },
          ...(gymVariantId ? { subscriptions: { some: { gymVariantId } } } : {}),
        },
        _sum: { amount: true },
      })
      rows.push([formatExportDate(start, locale, { month: "long", year: "numeric" }), currency(agg._sum.amount ?? 0)])
    }
  } else if (type === "top-members" || type === "loyal-members") {
    const aggregated = await prisma.subscription.groupBy({
      by: ["memberId"],
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
      },
      _sum: { pricePaid: true },
      _count: { memberId: true },
      orderBy:
        type === "top-members"
          ? { _sum: { pricePaid: "desc" } }
          : { _count: { memberId: "desc" } },
      take: 25,
    })

    const memberIds = aggregated.map((a: any) => a.memberId)
    const memberMap = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    const memberLookup = new Map(memberMap.map((m: any) => [m.id, m] as const))

    rows = [[wording.member, wording.email, wording.totalPaid, wording.subscriptionCount]]
    aggregated.forEach((entry: any) => {
      const member = memberLookup.get(entry.memberId)
      const fullName = member ? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() : entry.memberId
      rows.push([fullName, member?.email ?? "--", currency(entry._sum?.pricePaid ?? 0), entry._count?.memberId ?? 0])
    })
  } else if (type === "member" && memberId) {
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
      },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { startDate: "desc" },
          where: gymVariantId ? { gymVariantId } : {},
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
    }

    rows = [
      [wording.field, wording.value],
      [wording.name, `${member.firstName} ${member.lastName}`.trim()],
      [wording.email, member.email ?? "--"],
      [wording.phone, member.phone ?? "--"],
      [wording.totalSubscriptions, member.subscriptions.length],
    ]

    const totalPaid = member.subscriptions.reduce((sum: number, sub: any) => sum + (sub.pricePaid ?? 0), 0)
    rows.push([wording.cumulativeAmount, currency(totalPaid)])

    member.subscriptions.forEach((sub: any) => {
      rows.push([
        `${wording.planPrefix} ${sub.plan?.name ?? ""}`,
        `${formatExportDate(new Date(sub.startDate), locale)} -> ${formatExportDate(
          new Date(sub.endDate),
          locale,
        )} (${currency(sub.pricePaid ?? 0)})`,
      ])
    })
  }

  const filename = `gym-report-${type}-${Date.now()}.xlsx`
  const payload = rowsToWorkbook(rows)

  return new NextResponse(payload as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
