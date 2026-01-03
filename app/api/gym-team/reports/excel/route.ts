import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { utils, write } from "xlsx"
import { prisma } from "@/lib/prisma"
import { formatExportCurrency, formatExportDate, resolveExportLocale } from "@/lib/export-locale"
import { resolveGymFeatures } from "@/lib/tenant-features"
import {
  jsonError,
  requireGymScope,
  requirePermission,
  requireSession,
  requireVariantAccess,
} from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

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
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymReportsExport)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = (sessionResult.user as any)?.role as string | undefined
  const tier = sessionResult.user.subscriptionPlan ?? null
  const sessionVariantId = sessionResult.user.gymVariantId ?? null

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.excelReports) {
    return jsonError(403, "EXCEL_REPORTS_REQUIRED", "Plan Pro ou Enterprise requis")
  }

  const parsed = querySchema.safeParse({
    type: request.nextUrl.searchParams.get("type"),
    memberId: request.nextUrl.searchParams.get("memberId") ?? undefined,
  })
  const requestedVariantId = request.nextUrl.searchParams.get("variantId")
  const locale = resolveExportLocale(request.nextUrl.searchParams.get("locale"))
  const wording = labels[locale]

  const variantAccess = await requireVariantAccess({
    gymId: scope.gymId,
    tier,
    role,
    requestedVariantId,
    sessionVariantId,
  })
  if (!variantAccess.ok) return variantAccess.response

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
          gymId: scope.gymId,
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
        gymId: scope.gymId,
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
        gymId: scope.gymId,
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
