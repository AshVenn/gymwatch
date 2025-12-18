// app/api/super-admin/reports/pdf/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import type { Prisma } from "@prisma/client"
import { promises as fs } from "fs"
import path from "path"
import reshaper from "arabic-persian-reshaper"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { formatExportCurrency, formatExportDate, resolveExportLocale } from "@/lib/export-locale"

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
    capacity: "Capacité",
    maxMembers: "Membres max",
    maxVariants: "Variants max",
    freeze: "État de gel",
    freezeUntil: "Gel jusqu'au",
    freezeReason: "Raison du gel",
    gymSnapshot: "Vue d'ensemble des salles",
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
    capacity: "Capacity",
    maxMembers: "Max members",
    maxVariants: "Max variants",
    freeze: "Freeze status",
    freezeUntil: "Freeze until",
    freezeReason: "Freeze reason",
    gymSnapshot: "Gym snapshot",
    missingParams: "Missing parameters",
    notFound: "Gym not found",
  },
  ar: {
    titleGlobal: "????? GymWatch ????????",
    generatedAt: "?? ??",
    globalView: "??? ???",
    activeGyms: "????? ????",
    activeSubscriptions: "???????? ????",
    totalMembers: "?????? ???????",
    cumulativeRevenue: "????????? ?????????",
    topGyms: "???? 5 ?????",
    plan: "?????",
    status: "??????",
    address: "???????",
    owner: "??????",
    members: "???????",
    active: "?????????? ??????",
    revenue: "????????? ?????????",
    recentSubs: "???? ??????????",
    endsAt: "?????",
    capacity: "?????",
    maxMembers: "???? ???????",
    maxVariants: "???? ??????",
    freeze: "???? ???????",
    freezeUntil: "??????? ???",
    freezeReason: "??? ???????",
    gymSnapshot: "???? ??? ???????",
    missingParams: "??????? ??????",
    notFound: "?????? ??? ?????",
  },

} as const

type ExportLocale = keyof typeof labels

// -------------------------
// Shared text + RTL helpers
// -------------------------
function safeText(v: unknown) {
  return String(v ?? "")
    // arrow becomes □ in some fonts
    .replace(/→/g, "-")
    // NBSP / narrow NBSP -> normal spaces
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    // zero-width junk
    .replace(/[\u200B-\u200F\u2060]/g, "")
    .trim()
}

type Run = { kind: "rtl" | "ltr"; text: string }

function isRtlChar(ch: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch)
}

function tokenizeRuns(input: string): Run[] {
  const clean = safeText(input)
  if (!clean) return []

  const runs: Run[] = []
  let cur = ""
  let curKind: Run["kind"] | null = null

  const push = () => {
    if (!cur) return
    runs.push({ kind: curKind ?? "ltr", text: cur })
    cur = ""
  }

  for (const ch of clean) {
    const kind: Run["kind"] = isRtlChar(ch) ? "rtl" : "ltr"

    // keep spaces with surrounding LTR to avoid ugly splits
    if (ch === " ") {
      if (curKind === null) {
        curKind = "ltr"
        cur = " "
        continue
      }
      cur += " "
      continue
    }

    if (curKind === null) {
      curKind = kind
      cur = ch
      continue
    }

    if (kind === curKind) cur += ch
    else {
      push()
      curKind = kind
      cur = ch
    }
  }

  push()
  return runs
}

function shapeArabic(text: string) {
  return (reshaper as any).ArabicShaper.convertArabic(text) as string
}

function measureRunWidth(run: Run, latinFont: any, arabicFont: any, size: number) {
  if (run.kind === "rtl") {
    const shaped = shapeArabic(run.text)
    let w = 0
    for (const ch of shaped) w += arabicFont.widthOfTextAtSize(ch, size)
    return w
  }
  return latinFont.widthOfTextAtSize(run.text, size)
}

function wrapRunsByWidth(runs: Run[], maxWidth: number, latinFont: any, arabicFont: any, size: number) {
  const lines: Run[][] = []
  let line: Run[] = []
  let lineW = 0

  const pushLine = () => {
    if (line.length) lines.push(line)
    line = []
    lineW = 0
  }

  for (const run of runs) {
    const w = measureRunWidth(run, latinFont, arabicFont, size)

    if (lineW + w <= maxWidth || line.length === 0) {
      line.push(run)
      lineW += w
      continue
    }

    pushLine()
    line.push(run)
    lineW = w
  }

  pushLine()
  return lines
}

function drawRtlMixed(
  page: any,
  text: string,
  xRight: number,
  y: number,
  latinFont: any,
  arabicFont: any,
  size: number,
  color: any,
  maxWidth: number,
  lineHeight: number,
) {
  const runs = tokenizeRuns(text)
  const lines = wrapRunsByWidth(runs, maxWidth, latinFont, arabicFont, size)

  lines.forEach((lineRuns, i) => {
    let x = xRight
    const yy = y - i * lineHeight

    for (const run of lineRuns) {
      if (run.kind === "rtl") {
        const shaped = shapeArabic(run.text)
        for (const ch of shaped) {
          const cw = arabicFont.widthOfTextAtSize(ch, size)
          x -= cw
          page.drawText(ch, { x, y: yy, size, font: arabicFont, color })
        }
      } else {
        const w = latinFont.widthOfTextAtSize(run.text, size)
        x -= w
        page.drawText(run.text, { x, y: yy, size, font: latinFont, color })
      }
    }
  })

  return lines.length
}

function drawLtrWrapped(
  page: any,
  text: string,
  x: number,
  y: number,
  latinFont: any,
  size: number,
  color: any,
  maxWidth: number,
  lineHeight: number,
) {
  const clean = safeText(text)
  if (!clean) return 0

  const words = clean.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""

  const fits = (t: string) => latinFont.widthOfTextAtSize(t, size) <= maxWidth

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (fits(test)) {
      line = test
      continue
    }
    if (line) lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  if (!lines.length) lines.push("--")

  lines.forEach((ln, i) => {
    page.drawText(ln, { x, y: y - i * lineHeight, size, font: latinFont, color })
  })

  return lines.length
}

// -------------------------
// Shared font loader (app/fonts)
// -------------------------
const FONT_FILES = {
  ar: "NotoSansArabic-Regular.ttf",
  default: "VarelaRound-Regular.ttf",
} as const

const FONT_CACHE: Partial<Record<keyof typeof FONT_FILES, Uint8Array>> = {}

async function loadFontBytes(kind: keyof typeof FONT_FILES) {
  if (FONT_CACHE[kind]) return FONT_CACHE[kind]!
  const fileName = FONT_FILES[kind]
  const fontPath = path.join(process.cwd(), "app", "fonts", fileName)
  const bytes = await fs.readFile(fontPath)
  FONT_CACHE[kind] = bytes
  return bytes
}

async function loadFonts(pdf: PDFDocument, locale: ExportLocale) {
  const latinBytes = await loadFontBytes("default")
  const latin = await pdf.embedFont(latinBytes, { subset: true })

  let arabic = latin
  if (locale === "ar") {
    const arBytes = await loadFontBytes("ar")
    arabic = await pdf.embedFont(arBytes, { subset: true })
  }
  return { latin, arabic }
}

// -------------------------
// Drawer (same for all PDFs)
// -------------------------
function createDrawer(pdf: PDFDocument, locale: ExportLocale, latinFont: any, arabicFont: any) {
  let page = pdf.addPage([595, 842])
  let cursorY = 792

  const MARGIN_LEFT = 48
  const MARGIN_RIGHT = 48
  const VALUE_COL_X = 280
  const LINE_H = 16
  const TITLE_LINE_H = 20

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 60) {
      page = pdf.addPage([595, 842])
      cursorY = 792
    }
  }

  const drawTitle = (text: string) => {
    ensureSpace(34)
    const { width } = page.getSize()
    const size = 18
    const t = safeText(text)

    if (locale === "ar") {
      const maxW = width - MARGIN_LEFT - MARGIN_RIGHT
      drawRtlMixed(
        page,
        t,
        width - MARGIN_RIGHT,
        cursorY,
        latinFont,
        arabicFont,
        size,
        rgb(0.14, 0.22, 0.36),
        maxW,
        TITLE_LINE_H,
      )
    } else {
      page.drawText(t, {
        x: MARGIN_LEFT,
        y: cursorY,
        size,
        font: latinFont,
        color: rgb(0.14, 0.22, 0.36),
      })
    }

    cursorY -= 26
  }

  const drawLine = (label: string, value: string) => {
    ensureSpace(22)
    const { width } = page.getSize()
    const size = 12
    const l = safeText(label)
    const v = safeText(value)

    if (locale === "ar") {
      const labelMax = 230
      const valueRightEdge = VALUE_COL_X
      const valueMax = valueRightEdge - MARGIN_LEFT

      const lLines = drawRtlMixed(
        page,
        l,
        width - MARGIN_RIGHT,
        cursorY,
        latinFont,
        arabicFont,
        size,
        rgb(0.18, 0.18, 0.18),
        labelMax,
        LINE_H,
      )

      const vLines = drawRtlMixed(
        page,
        v,
        valueRightEdge,
        cursorY,
        latinFont,
        arabicFont,
        size,
        rgb(0.1, 0.1, 0.1),
        valueMax,
        LINE_H,
      )

      cursorY -= Math.max(lLines, vLines) * LINE_H
    } else {
      // label left, value right aligned in right side
      const labelX = MARGIN_LEFT
      const valueX = 300
      const labelMax = 240
      const valueMax = width - MARGIN_RIGHT - valueX

      const lLines = drawLtrWrapped(
        page,
        l,
        labelX,
        cursorY,
        latinFont,
        size,
        rgb(0.18, 0.18, 0.18),
        labelMax,
        LINE_H,
      )

      const vLines = drawLtrWrapped(
        page,
        v,
        valueX,
        cursorY,
        latinFont,
        size,
        rgb(0.1, 0.1, 0.1),
        valueMax,
        LINE_H,
      )

      cursorY -= Math.max(lLines, vLines) * LINE_H
    }
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

    // For AR: keep values (numbers/dates) in EN, labels stay Arabic
    const valueLocale: ExportLocale = locale === "ar" ? "en" : locale

    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit)

    const { latin, arabic } = await loadFonts(pdf, locale)
    const drawer = createDrawer(pdf, locale, latin, arabic)

    const currency = (value: number | null | undefined) =>
      safeText(formatExportCurrency(value ?? 0, valueLocale, "MAD"))

    // Header
    drawer.drawTitle(wording.titleGlobal)
    drawer.drawLine(
      wording.generatedAt,
      safeText(
        formatExportDate(new Date(), valueLocale, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      ),
    )
    drawer.gap(10)

    if (scope === "global") {
      const gymInclude = {
        _count: { select: { members: true, subscriptions: true } },
        owner: { select: { email: true } },
        tenantPlans: { orderBy: { startsAt: "desc" }, take: 1, include: { plan: true } },
      } satisfies Prisma.GymInclude

      const [gyms, payments, revenueByGym] = await Promise.all([
        prisma.gym.findMany({
          include: gymInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.payment.aggregate({ _sum: { amount: true } }),
        prisma.payment.groupBy({
          by: ["gymId"],
          _sum: { amount: true },
        }),
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

      const revenueLookup = new Map(revenueByGym.map((entry) => [entry.gymId, entry._sum.amount ?? 0]))
      const gymLookup = new Map(gyms.map((g) => [g.id, g]))

      Array.from(revenueLookup.entries())
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 5)
        .forEach(([gymId, amount], index) => {
          const gym = gymLookup.get(gymId)
          if (!gym) return
          drawer.drawLine(
            `${index + 1}. ${gym.name}`,
            `${gym.subscriptionPlan} - ${currency(amount ?? 0)}`,
          )
        })

      drawer.gap(10)
      drawer.drawTitle(wording.gymSnapshot)
      gyms.slice(0, 12).forEach((gym) => {
        const tenantPlan = gym.tenantPlans?.[0]
        const freezeStatus = tenantPlan?.freezeStatus ?? "ACTIVE"
        drawer.drawLine(
          gym.name,
          `${tenantPlan?.plan?.tier ?? gym.subscriptionPlan} · ${tenantPlan?.plan?.billingInterval ?? gym.billingInterval}`,
        )
        drawer.drawLine(
          wording.status,
          freezeStatus !== "ACTIVE" && tenantPlan?.freezeUntil
            ? `${freezeStatus} (${safeText(formatExportDate(tenantPlan.freezeUntil, valueLocale, { dateStyle: "medium" }))})`
            : freezeStatus,
        )
        drawer.drawLine(wording.capacity, `${gym.capacity ?? 0}`)
        drawer.drawLine(
          wording.maxMembers,
          `${gym.maxMembers ?? -1} · ${wording.maxVariants}: ${gym.maxVariants ?? -1}`,
        )
        if (!gym) return
        drawer.drawLine(wording.revenue, currency(revenueLookup.get(gym.id) ?? 0))
        drawer.gap(6)
      })
    } else if (scope === "gym" && gymId) {
      const gym = await prisma.gym.findUnique({
        where: { id: gymId },
        include: {
          _count: { select: { members: true, subscriptions: true } },
          owner: { select: { email: true } },
          tenantPlans: { orderBy: { startsAt: "desc" }, take: 1, include: { plan: true } },
        },
      })

      if (!gym) {
        return NextResponse.json({ error: wording.notFound }, { status: 404 })
      }

      const tenantPlan = gym.tenantPlans?.[0]
      const payments = await prisma.payment.aggregate({
        where: { gymId },
        _sum: { amount: true },
      })

      drawer.drawTitle(gym.name)
      drawer.drawLine(
        wording.plan,
        `${tenantPlan?.plan?.tier ?? gym.subscriptionPlan} (${tenantPlan?.plan?.billingInterval ?? gym.billingInterval})`,
      )
      drawer.drawLine(wording.status, tenantPlan?.status ?? gym.subscriptionStatus)
      drawer.drawLine(wording.address, `${gym.city ?? "-"}, ${gym.country ?? "-"}`)
      drawer.drawLine(wording.owner, gym.owner?.email ?? "--")
      drawer.drawLine(wording.members, `${gym._count.members}`)
      drawer.drawLine(wording.active, `${gym._count.subscriptions}`)
      drawer.drawLine(wording.capacity, `${gym.capacity ?? 0}`)
      drawer.drawLine(wording.maxMembers, `${gym.maxMembers ?? -1}`)
      drawer.drawLine(wording.maxVariants, `${gym.maxVariants ?? -1}`)
      drawer.drawLine(wording.freeze, tenantPlan?.freezeStatus ?? "ACTIVE")
      drawer.drawLine(
        wording.freezeUntil,
        tenantPlan?.freezeUntil ? safeText(formatExportDate(tenantPlan.freezeUntil, valueLocale, { dateStyle: "medium" })) : "--",
      )
      drawer.drawLine(wording.freezeReason, tenantPlan?.freezeReason ?? "--")
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
            formatExportDate(sub.endDate, valueLocale, { dateStyle: "medium" }),
          )}`,
        )
      })
    } else {
      return NextResponse.json({ error: wording.missingParams }, { status: 400 })
    }

    const pdfBytes = await pdf.save()
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
      { status: 500 },
    )
  }
}
