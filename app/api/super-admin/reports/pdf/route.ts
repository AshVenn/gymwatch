import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { formatExportCurrency, formatExportDate, resolveExportLocale } from "@/lib/export-locale"

const querySchema = z.object({
  scope: z.enum(["global", "gym"]).default("global"),
  gymId: z.string().optional(),
})

const labels = {
  fr: {
    titleGlobal: "Rapport exécutif GymWatch",
    generatedAt: "Généré le",
    globalView: "Vue globale",
    activeGyms: "Salles actives",
    activeSubscriptions: "Abonnements actifs",
    totalMembers: "Membres total",
    cumulativeRevenue: "Revenus cumulés",
    topGyms: "Top 5 salles",
    plan: "Plan",
    status: "Statut",
    address: "Adresse",
    owner: "Propriétaire",
    members: "Membres",
    active: "Abonnements actifs",
    revenue: "Revenus cumulés",
    recentSubs: "Abonnements récents",
    endsAt: "fin",
    missingParams: "Paramètres manquants",
    notFound: "Salle introuvable",
  },
  en: {
    titleGlobal: "GymWatch Executive Report",
    generatedAt: "Generated on",
    globalView: "Global view",
    activeGyms: "Active gyms",
    activeSubscriptions: "Active subscriptions",
    totalMembers: "Total members",
    cumulativeRevenue: "Cumulative revenue",
    topGyms: "Top 5 gyms",
    plan: "Plan",
    status: "Status",
    address: "Address",
    owner: "Owner",
    members: "Members",
    active: "Active subscriptions",
    revenue: "Cumulative revenue",
    recentSubs: "Recent subscriptions",
    endsAt: "ends",
    missingParams: "Missing parameters",
    notFound: "Gym not found",
  },
  ar: {
    titleGlobal: "تقرير GymWatch التنفيذي",
    generatedAt: "تم في",
    globalView: "عرض عام",
    activeGyms: "صالات نشطة",
    activeSubscriptions: "اشتراكات نشطة",
    totalMembers: "إجمالي الأعضاء",
    cumulativeRevenue: "الإيرادات التراكمية",
    topGyms: "أفضل ٥ صالات",
    plan: "الخطة",
    status: "الحالة",
    address: "العنوان",
    owner: "المالك",
    members: "الأعضاء",
    active: "الاشتراكات النشطة",
    revenue: "الإيرادات التراكمية",
    recentSubs: "أحدث الاشتراكات",
    endsAt: "تنتهي",
    missingParams: "معلمات مفقودة",
    notFound: "النادي غير موجود",
  },
}

function createDrawer(pdf: PDFDocument, font: any, bold: any) {
  let page = pdf.addPage([595, 842])
  let cursorY = 792
  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 60) {
      page = pdf.addPage([595, 842])
      cursorY = 792
    }
  }
  const drawTitle = (text: string) => {
    ensureSpace(32)
    page.drawText(text, { x: 48, y: cursorY, size: 18, font: bold, color: rgb(0.14, 0.22, 0.36) })
    cursorY -= 26
  }
  const drawLine = (label: string, value: string) => {
    ensureSpace(20)
    page.drawText(label, { x: 48, y: cursorY, size: 12, font, color: rgb(0.18, 0.18, 0.18) })
    page.drawText(value, { x: 280, y: cursorY, size: 12, font: bold, color: rgb(0.1, 0.1, 0.1) })
    cursorY -= 16
  }
  const gap = (value = 12) => {
    cursorY -= value
  }
  return { get page() { return page }, get cursor() { return cursorY }, drawTitle, drawLine, gap }
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
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
  }

  const { scope, gymId } = parsed.data
  const locale = resolveExportLocale(request.nextUrl.searchParams.get("locale"))
  const wording = labels[locale]
  const currency = (value: number | null | undefined) => formatExportCurrency(value ?? 0, locale, "MAD")

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const drawer = createDrawer(pdf, font, bold)

  drawer.drawTitle(wording.titleGlobal)
  drawer.drawLine(wording.generatedAt, formatExportDate(new Date(), locale, { dateStyle: "medium", timeStyle: "short" }))
  drawer.gap(10)

  if (scope === "global") {
    const [gyms, payments] = await Promise.all([
      prisma.gym.findMany({ include: { _count: { select: { members: true, subscriptions: true } } } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ])

    drawer.drawTitle(wording.globalView)
    drawer.drawLine(wording.activeGyms, `${gyms.length}`)
    drawer.drawLine(
      wording.activeSubscriptions,
      `${gyms.reduce((sum, gym) => sum + gym._count.subscriptions, 0)}`,
    )
    drawer.drawLine(
      wording.totalMembers,
      `${gyms.reduce((sum, gym) => sum + gym._count.members, 0)}`,
    )
    drawer.drawLine(wording.cumulativeRevenue, currency(payments._sum.amount ?? 0))
    drawer.gap(12)
    drawer.drawTitle(wording.topGyms)
    const revenueByGym = await prisma.payment.groupBy({
      by: ["gymId"],
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    })
    const lookup = new Map(gyms.map((g) => [g.id, g]))
    revenueByGym.forEach((entry, index) => {
      const gym = lookup.get(entry.gymId)
      if (gym) {
        drawer.drawLine(
          `${index + 1}. ${gym.name}`,
          `${gym.subscriptionPlan} • ${currency(entry._sum.amount ?? 0)}`,
        )
      }
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
      return NextResponse.json({ error: wording.notFound }, { status: 404 })
    }

    const payments = await prisma.payment.aggregate({
      where: { gymId },
      _sum: { amount: true },
    })

    drawer.drawTitle(`${gym.name}`)
    drawer.drawLine(wording.plan, `${gym.subscriptionPlan} (${gym.billingInterval})`)
    drawer.drawLine(wording.status, gym.subscriptionStatus)
    drawer.drawLine(wording.address, `${gym.city ?? "-"}, ${gym.country ?? "-"}`)
    drawer.drawLine(wording.owner, gym.owner?.email ?? "--")
    drawer.drawLine(wording.members, `${gym._count.members}`)
    drawer.drawLine(wording.active, `${gym._count.subscriptions}`)
    drawer.drawLine(wording.revenue, currency(payments._sum.amount ?? 0))
    drawer.gap(12)
    drawer.drawTitle(wording.recentSubs)
    const latestSubs = await prisma.subscription.findMany({
      where: { gymId },
      orderBy: { endDate: "desc" },
      include: { member: true, plan: true },
      take: 6,
    })
    latestSubs.forEach((sub) => {
      drawer.drawLine(
        `${sub.member.firstName} ${sub.member.lastName}`,
        `${sub.plan?.name ?? "Plan"} • ${wording.endsAt} ${formatExportDate(
          sub.endDate,
          locale,
          { dateStyle: "medium" },
        )}`,
      )
    })
  } else {
    return NextResponse.json({ error: wording.missingParams }, { status: 400 })
  }

  const pdfBytes = await pdf.save()
  const filename = `super-admin-${scope}-${Date.now()}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
