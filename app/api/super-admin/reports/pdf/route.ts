// app/api/super-admin/reports/pdf/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { promises as fs } from "fs"
import path from "path"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import {
  formatExportCurrency,
  formatExportDate,
  resolveExportLocale,
} from "@/lib/export-locale"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// -------------------------
// Query + labels
// -------------------------
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
} as const

type ExportLocale = keyof typeof labels

// -------------------------
// Text utils
// -------------------------
function safeText(v: unknown) {
  return String(v ?? "")
    // NBSP / narrow NBSP -> normal spaces
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    // zero-width junk
    .replace(/[\u200B-\u200F\u2060]/g, "")
    .trim()
}

function toPdfText(raw: string, locale: ExportLocale) {
  const clean = safeText(raw)
  if (!clean) return ""
  if (locale !== "ar") return clean

  // Keep Arabic content untouched while avoiding hidden characters
  const graphemes =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? [...new Intl.Segmenter("ar", { granularity: "grapheme" }).segment(clean)].map(
          (segment: any) => segment.segment
        )
      : Array.from(clean)

  return graphemes.join("")
}

// -------------------------
// Font loading (app/fonts)
// -------------------------
const FONT_FILES = {
  ar: "NotoSansArabic-Regular.ttf",
  default: "VarelaRound-Regular.ttf",
} as const

const FONT_CACHE: Partial<Record<keyof typeof FONT_FILES, Uint8Array>> = {}

async function loadFontBytes(locale: ExportLocale) {
  const key = locale === "ar" ? "ar" : "default"
  if (FONT_CACHE[key]) return FONT_CACHE[key]!

  const fileName = FONT_FILES[key]
  const fontPath = path.join(process.cwd(), "app", "fonts", fileName)
  const bytes = await fs.readFile(fontPath)
  FONT_CACHE[key] = bytes
  return bytes
}

// -------------------------
// Drawer (RTL-aware using widthOfTextAtSize)
// -------------------------
function createDrawer(pdf: PDFDocument, font: any, bold: any, locale: ExportLocale) {
  let page = pdf.addPage([595, 842])
  let cursorY = 792

  const MARGIN_LEFT = 48
  const MARGIN_RIGHT = 48
  const VALUE_COL_X = 280

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 60) {
      page = pdf.addPage([595, 842])
      cursorY = 792
    }
  }

  const drawTitle = (text: string) => {
    ensureSpace(32)
    const { width } = page.getSize()
    const size = 18

    const t = toPdfText(text, locale)
    const w = bold.widthOfTextAtSize(t, size)
    const x = locale === "ar" ? width - MARGIN_RIGHT - w : MARGIN_LEFT

    page.drawText(t, {
      x,
      y: cursorY,
      size,
      font: bold,
      color: rgb(0.14, 0.22, 0.36),
    })
    cursorY -= 26
  }

  const drawLine = (label: string, value: string) => {
    ensureSpace(20)
    const { width } = page.getSize()
    const size = 12

    const l = toPdfText(label, locale)
    const v = toPdfText(value, locale)

    // measure using the actual font used for each part
    const lw = bold.widthOfTextAtSize(l, size)
    const vw = bold.widthOfTextAtSize(v, size)

    // For Arabic: put label on the RIGHT, value on the LEFT column (still right-aligned inside its column)
    if (locale === "ar") {
      const labelX = width - MARGIN_RIGHT - lw

      // left column for value: end at VALUE_COL_X, right-align inside it
      const valueRightEdge = VALUE_COL_X
      const valueX = Math.max(MARGIN_LEFT, valueRightEdge - vw)

      page.drawText(l, {
        x: labelX,
        y: cursorY,
        size,
        font: bold,
        color: rgb(0.18, 0.18, 0.18),
      })
      page.drawText(v, {
        x: valueX,
        y: cursorY,
        size,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      })
    } else {
      const labelX = MARGIN_LEFT
      const valueX = width - MARGIN_RIGHT - vw

      page.drawText(l, {
        x: labelX,
        y: cursorY,
        size,
        font: bold,
        color: rgb(0.18, 0.18, 0.18),
      })
      page.drawText(v, {
        x: valueX,
        y: cursorY,
        size,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      })
    }

    cursorY -= 16
  }

  const gap = (value = 12) => {
    cursorY -= value
  }

  return { drawTitle, drawLine, gap }
}

// -------------------------
// Route
// -------------------------
export async function GET(request: NextRequest) {
  try {
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
    const locale = resolveExportLocale(request.nextUrl.searchParams.get("locale")) as ExportLocale
    const wording = labels[locale]

    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit)

    const fontBytes = await loadFontBytes(locale)

    const font = await pdf.embedFont(fontBytes, { subset: true })
    const bold = font // pas de bold séparé -> on réutilise

    const drawer = createDrawer(pdf, font, bold, locale)

    const currency = (value: number | null | undefined) =>
      safeText(formatExportCurrency(value ?? 0, locale, "MAD"))

    // Header
    drawer.drawTitle(wording.titleGlobal)
    drawer.drawLine(
      wording.generatedAt,
      safeText(
        formatExportDate(new Date(), locale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      )
    )
    drawer.gap(10)

    if (scope === "global") {
      const [gyms, payments] = await Promise.all([
        prisma.gym.findMany({
          include: { _count: { select: { members: true, subscriptions: true } } },
        }),
        prisma.payment.aggregate({ _sum: { amount: true } }),
      ])

      drawer.drawTitle(wording.globalView)
      drawer.drawLine(wording.activeGyms, `${gyms.length}`)
      drawer.drawLine(
        wording.activeSubscriptions,
        `${gyms.reduce((sum, gym) => sum + gym._count.subscriptions, 0)}`
      )
      drawer.drawLine(
        wording.totalMembers,
        `${gyms.reduce((sum, gym) => sum + gym._count.members, 0)}`
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
        if (!gym) return
        drawer.drawLine(
          `${index + 1}. ${gym.name}`,
          `${gym.subscriptionPlan} - ${currency(entry._sum.amount ?? 0)}`
        )
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

      drawer.drawTitle(gym.name)
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
          `${sub.plan?.name ?? "Plan"} - ${wording.endsAt} ${safeText(
            formatExportDate(sub.endDate, locale, { dateStyle: "medium" })
          )}`
        )
      })
    } else {
      return NextResponse.json({ error: wording.missingParams }, { status: 400 })
    }

    const pdfBytes = await pdf.save()
    console.log("[PDF] bytes length =", pdfBytes.length)

    const filename = `super-admin-${scope}-${Date.now()}.pdf`
    const body = Buffer.from(pdfBytes)

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[EXPORT_PDF_ERROR]", err)
    return NextResponse.json(
      {
        error: "PDF Generation Failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
