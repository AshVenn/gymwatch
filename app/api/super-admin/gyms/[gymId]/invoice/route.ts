import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import reshaper from "arabic-persian-reshaper"
import { z } from "zod"

import { authOptions } from "@/lib/auth-middleware"
import { formatExportCurrency, resolveExportLocale, formatExportDate } from "@/lib/export-locale"
import { updateGymFromSuperAdmin, getSuperAdminGymDetail } from "@/lib/super-admin"
import { GymBillingInterval, GymPlanTier, GymSubscriptionStatus } from "@prisma/client"
import { resolvePlanPrice } from "@/lib/plan-settings"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"

const payloadSchema = z.object({
  subscriptionStatus: z.nativeEnum(GymSubscriptionStatus),
  subscriptionPlan: z.nativeEnum(GymPlanTier),
  billingInterval: z.nativeEnum(GymBillingInterval),
  subscriptionExpiresAt: z.string().nullable().optional(),
  subscriptionGracePeriodDays: z.number().int().min(0).max(365).optional(),
  maxAdminAccounts: z.number().int().min(1).max(50).optional(),
  locale: z.string().optional(),
  apply: z.boolean().optional(),
})

const labels = {
  fr: {
    title: "Renouvellement abonnement salle",
    invoice: "Facture",
    plan: "Plan",
    billing: "Facturation",
    status: "Statut",
    expiresAt: "Échéance",
    grace: "Période de grâce",
    admins: "Admins autorisés",
    amount: "Montant",
    issuedAt: "Émise le",
    invoiceNumber: "Référence",
    gym: "Salle",
  },
  en: {
    title: "Gym renewal invoice",
    invoice: "Invoice",
    plan: "Plan",
    billing: "Billing",
    status: "Status",
    expiresAt: "Expires on",
    grace: "Grace period",
    admins: "Allowed admins",
    amount: "Amount",
    issuedAt: "Issued on",
    invoiceNumber: "Reference",
    gym: "Gym",
  },
  ar: {
    title: "فاتورة تجديد النادي",
    invoice: "فاتورة",
    plan: "الخطة",
    billing: "الفوترة",
    status: "الحالة",
    expiresAt: "تاريخ الانتهاء",
    grace: "فترة السماح",
    admins: "إداريون مسموح بهم",
    amount: "المبلغ",
    issuedAt: "تاريخ الإصدار",
    invoiceNumber: "المرجع",
    gym: "النادي",
  },
} as const

type ExportLocale = keyof typeof labels

// ------- same shared helpers as the GET route -------
function safeText(v: unknown) {
  return String(v ?? "")
    .replace(/→/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
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

// shared fonts (app/fonts)
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

function createDrawer(pdf: PDFDocument, locale: ExportLocale, latinFont: any, arabicFont: any) {
  let page = pdf.addPage([595, 842])
  let cursorY = 792

  const MARGIN_LEFT = 48
  const MARGIN_RIGHT = 48
  const VALUE_COL_X = 280
  const LINE_H = 20
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
        rgb(0.12, 0.2, 0.35),
        maxW,
        TITLE_LINE_H,
      )
    } else {
      page.drawText(t, { x: MARGIN_LEFT, y: cursorY, size, font: latinFont, color: rgb(0.12, 0.2, 0.35) })
    }

    cursorY -= 30
  }

  const drawLine = (label: string, value: string) => {
    ensureSpace(24)
    const { width } = page.getSize()
    const size = 11
    const l = safeText(label)
    const v = safeText(value)

    if (locale === "ar") {
      const labelMax = 190
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
        rgb(0.15, 0.15, 0.15),
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
      const labelX = MARGIN_LEFT
      const valueX = 260
      const labelMax = 190
      const valueMax = width - MARGIN_RIGHT - valueX

      const lLines = drawLtrWrapped(page, l, labelX, cursorY, latinFont, size, rgb(0.15, 0.15, 0.15), labelMax, LINE_H)
      const vLines = drawLtrWrapped(page, v, valueX, cursorY, latinFont, size, rgb(0.1, 0.1, 0.1), valueMax, LINE_H)

      cursorY -= Math.max(lLines, vLines) * LINE_H
    }
  }

  const gap = (value = 10) => {
    cursorY -= value
  }

  return { drawTitle, drawLine, gap }
}

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return null
  return session
}

export async function POST(request: NextRequest, { params }: { params: { gymId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const parsed = payloadSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const payload = parsed.data
  const locale = resolveExportLocale(payload.locale) as ExportLocale
  const wording = labels[locale]

  // For AR: values in EN digits, labels in Arabic
  const valueLocale: ExportLocale = locale === "ar" ? "en" : locale

  const expiresAtDate = payload.subscriptionExpiresAt ? new Date(payload.subscriptionExpiresAt) : null
  const applyUpdate = payload.apply !== false

  const updatedGym = applyUpdate
    ? await updateGymFromSuperAdmin(params.gymId, {
        subscriptionStatus: payload.subscriptionStatus,
        subscriptionPlan: payload.subscriptionPlan,
        billingInterval: payload.billingInterval,
        subscriptionExpiresAt: expiresAtDate,
        subscriptionGracePeriodDays: payload.subscriptionGracePeriodDays,
        maxAdminAccounts: payload.maxAdminAccounts,
      })
    : await getSuperAdminGymDetail(params.gymId)

  if (!updatedGym) return NextResponse.json({ error: "Gym not found" }, { status: 404 })

  const amount =
    typeof updatedGym.subscriptionPrice === "number"
      ? updatedGym.subscriptionPrice
      : await resolvePlanPrice(payload.subscriptionPlan, payload.billingInterval)

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const { latin, arabic } = await loadFonts(pdf, locale)
  const drawer = createDrawer(pdf, locale, latin, arabic)

  const invoiceNumber = `GYM-${updatedGym.id.slice(0, 8).toUpperCase()}-${Date.now()}`
  const issueDate = new Date()

  drawer.drawTitle(`${wording.invoice} • ${wording.title}`)
  drawer.drawLine(wording.invoiceNumber, invoiceNumber)
  drawer.drawLine(wording.issuedAt, safeText(formatExportDate(issueDate, valueLocale)))
  drawer.drawLine(wording.gym, `${safeText(updatedGym.name)} (${safeText(updatedGym.city ?? "--")}, ${safeText(updatedGym.country ?? "--")})`)
  drawer.gap(8)

  drawer.drawLine(wording.plan, `${payload.subscriptionPlan} (${payload.billingInterval})`)
  drawer.drawLine(wording.status, payload.subscriptionStatus)
  drawer.drawLine(wording.expiresAt, expiresAtDate ? safeText(formatExportDate(expiresAtDate, valueLocale)) : "--")

  if (typeof payload.subscriptionGracePeriodDays === "number") {
    drawer.drawLine(wording.grace, `${payload.subscriptionGracePeriodDays} j`)
  }
  if (typeof payload.maxAdminAccounts === "number") {
    drawer.drawLine(wording.admins, `${payload.maxAdminAccounts}`)
  }

  drawer.gap(8)
  drawer.drawLine(wording.amount, safeText(formatExportCurrency(amount, valueLocale)))

  const pdfBytes = await pdf.save()

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${invoiceNumber}.pdf`,
    },
  })
}
