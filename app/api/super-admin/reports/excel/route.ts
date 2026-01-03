import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { utils, write } from "xlsx"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { formatExportCurrency, resolveExportLocale } from "@/lib/export-locale"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

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
    capacity: "Capacité",
    maxMembers: "Membres max",
    maxVariants: "Variants max",
    freeze: "Etat de gel",
    freezeUntil: "Gel jusqu'au",
    freezeReason: "Raison du gel",
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
    capacity: "Capacity",
    maxMembers: "Max members",
    maxVariants: "Max variants",
    freeze: "Freeze status",
    freezeUntil: "Freeze until",
    freezeReason: "Freeze reason",
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
    capacity: "السعة",
    maxMembers: "الحد الأقصى للأعضاء",
    maxVariants: "الحد الأقصى للفروع",
    freeze: "حالة التجميد",
    freezeUntil: "التجميد حتى",
    freezeReason: "سبب التجميد",
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
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformReportsExport)
  if (!permission.ok) return permission.response

  const parsed = querySchema.safeParse({
    scope: request.nextUrl.searchParams.get("scope") ?? undefined,
    gymId: request.nextUrl.searchParams.get("gymId") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_QUERY", message: "Parametres invalides", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { scope, gymId } = parsed.data
  const locale = resolveExportLocale(request.nextUrl.searchParams.get("locale"))
  const wording = labels[locale]
  const currency = (value: number | null | undefined) => formatExportCurrency(value ?? 0, locale, "MAD")
  const filenameParts = ["super-admin", scope]
  let rows: Array<Array<string | number>> = []

  if (scope === "global") {
    const gymInclude = {
      _count: { select: { members: true, subscriptions: true } },
      tenantPlans: { orderBy: { startsAt: "desc" }, take: 1, include: { plan: true } },
    } satisfies Prisma.GymInclude

    const gyms = await prisma.gym.findMany({
      include: gymInclude,
      orderBy: { createdAt: "desc" },
    })
    const revenueByGym = await prisma.payment.groupBy({
      by: ["gymId"],
      _sum: { amount: true },
    })
    const revenueLookup = new Map(revenueByGym.map((entry) => [entry.gymId, entry._sum.amount ?? 0]))
    rows = [
      [
        wording.gym,
        wording.plan,
        wording.billing,
        wording.status,
        wording.members,
        wording.activeSubscriptions,
        wording.capacity,
        wording.maxMembers,
        wording.maxVariants,
        wording.freeze,
        wording.revenue,
      ],
    ]
    gyms.forEach((gym) => {
      const tenantPlan = gym.tenantPlans?.[0]
      const freezeStatus = tenantPlan?.freezeStatus ?? "ACTIVE"
      rows.push([
        gym.name,
        tenantPlan?.plan?.tier ?? gym.subscriptionPlan,
        tenantPlan?.plan?.billingInterval ?? gym.billingInterval,
        tenantPlan?.status ?? gym.subscriptionStatus,
        gym._count.members,
        gym._count.subscriptions,
        gym.capacity ?? 0,
        gym.maxMembers ?? -1,
        gym.maxVariants ?? -1,
        freezeStatus,
        currency(revenueLookup.get(gym.id) ?? 0),
      ])
    })
  } else if (scope === "gym" && gymId) {
    const gymInclude = {
      _count: { select: { members: true, subscriptions: true } },
      owner: { select: { email: true } },
      tenantPlans: { orderBy: { startsAt: "desc" }, take: 1, include: { plan: true } },
    } satisfies Prisma.GymInclude

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: gymInclude,
    })

    if (!gym) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 })
    }

    const tenantPlan = gym.tenantPlans?.[0]
    const freezeStatus = tenantPlan?.freezeStatus ?? "ACTIVE"

    filenameParts.push(gymId)
    const payments = await prisma.payment.aggregate({
      where: { gymId },
      _sum: { amount: true },
    })

    rows = [
      [wording.field, wording.value],
      [wording.gym, gym.name],
      [wording.plan, tenantPlan?.plan?.tier ?? gym.subscriptionPlan],
      [wording.billing, tenantPlan?.plan?.billingInterval ?? gym.billingInterval],
      [wording.status, tenantPlan?.status ?? gym.subscriptionStatus],
      [wording.owner, gym.owner?.email ?? "--"],
      [wording.members, gym._count.members],
      [wording.activeSubscriptions, gym._count.subscriptions],
      [wording.capacity, gym.capacity ?? 0],
      [wording.maxMembers, gym.maxMembers ?? -1],
      [wording.maxVariants, gym.maxVariants ?? -1],
      [wording.freeze, freezeStatus],
      [wording.freezeUntil, tenantPlan?.freezeUntil ? tenantPlan.freezeUntil.toISOString() : "--"],
      [wording.freezeReason, tenantPlan?.freezeReason ?? "--"],
      [wording.revenue, currency(payments._sum.amount ?? 0)],
    ]
  } else {
    return NextResponse.json({ error: "Parametres manquants" }, { status: 400 })
  }

  const filename = `${filenameParts.join("-")}-${Date.now()}.xlsx`
  const payload = rowsToWorkbook(rows)

  await recordAudit({
    actor: sessionResult.session.user,
    action: "platform.report.export",
    targetType: "report",
    targetId: scope === "gym" && gymId ? gymId : scope,
    metadata: { format: "xlsx", scope, gymId: gymId ?? null },
    request,
  })

  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
