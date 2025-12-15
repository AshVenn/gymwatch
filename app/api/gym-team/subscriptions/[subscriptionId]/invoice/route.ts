import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import reshaper from "arabic-persian-reshaper"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { formatExportCurrency, formatExportDate, resolveExportLocale } from "@/lib/export-locale"
import path from "path"
import { promises as fs } from "fs"

export const runtime = "nodejs"

// 1) Labels
const labels = {
  fr: {
    title: "Facture abonnement",
    invoice: "Facture",
    member: "Membre",
    plan: "Plan",
    amount: "Montant",
    period: "Période",
    visits: "Visites / jour",
    session: "Durée max",
    variant: "Variante",
    issuedAt: "Émise le",
    invoiceNumber: "Référence",
    gym: "Salle",
    unlimited: "Illimité",
    email: "Email",
    phone: "Téléphone",
  },
  en: {
    title: "Subscription invoice",
    invoice: "Invoice",
    member: "Member",
    plan: "Plan",
    amount: "Amount",
    period: "Period",
    visits: "Visits / day",
    session: "Max session",
    variant: "Variant",
    issuedAt: "Issued on",
    invoiceNumber: "Reference",
    gym: "Gym",
    unlimited: "Unlimited",
    email: "Email",
    phone: "Phone",
  },
  ar: {
    title: "فاتورة الاشتراك",
    invoice: "فاتورة",
    member: "العضو",
    plan: "الخطة",
    amount: "المبلغ",
    period: "الفترة",
    visits: "زيارات / يوم",
    session: "المدة القصوى",
    variant: "الفرع",
    issuedAt: "تاريخ الإصدار",
    invoiceNumber: "المرجع",
    gym: "النادي",
    unlimited: "غير محدود",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
  },
} as const

type ExportLocale = keyof typeof labels

// ---------------- shared sanitizing (same as your working routes) ----------------
function safeText(v: unknown) {
  return String(v ?? "")
    // Arrow glyph often missing -> □
    .replace(/→/g, "-")
    // NBSP / narrow NBSP -> normal spaces
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    // zero-width junk
    .replace(/[\u200B-\u200F\u2060]/g, "")
    .trim()
}

// ---------------- RTL drawing helpers (same approach) ----------------
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

function measureRunsWidth(runs: Run[], latinFont: any, arabicFont: any, size: number) {
  return runs.reduce((sum, r) => sum + measureRunWidth(r, latinFont, arabicFont, size), 0)
}

function wrapRunsByWidth(runs: Run[], maxWidth: number, latinFont: any, arabicFont: any, size: number): Run[][] {
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

// ---------------- same font handling as your working routes (app/fonts + cache) ----------------
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

// ---------------- Route ----------------
export async function GET(request: NextRequest, { params }: { params: { subscriptionId: string } }) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const sessionVariantId = (session?.user as any)?.gymVariantId as string | undefined

  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  const queryLocale = request.nextUrl.searchParams.get("locale")
  const resolvedLocale = resolveExportLocale(queryLocale) as ExportLocale
  const isRTL = resolvedLocale === "ar"
  const wording = labels[resolvedLocale] ?? labels.en

  // ✅ For Arabic PDFs: keep values (dates/currency) in EN digits, labels stay Arabic
  const valueLocale: ExportLocale = isRTL ? "en" : resolvedLocale

  const subscription = await prisma.subscription.findFirst({
    where: { id: params.subscriptionId, gymId },
    include: {
      gym: { select: { name: true, city: true, country: true, address: true } },
      member: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gymVariant: { select: { name: true, id: true } },
        },
      },
      plan: {
        select: { name: true, price: true, durationDays: true, visitsPerDay: true, maxSessionMinutes: true },
      },
      payment: { select: { amount: true, currency: true, paymentDate: true, id: true } },
    },
  })

  if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  if (role === "GYM_ADMIN" && sessionVariantId && subscription.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
  }

  // PDF
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const { latin, arabic } = await loadFonts(pdf, resolvedLocale)

  const page = pdf.addPage([595, 842])
  const pageWidth = page.getWidth()
  const margin = 48
  const rightX = pageWidth - margin
  const lineHeight = 20
  let y = 780

  const textColor = rgb(0.1, 0.1, 0.1)
  const titleColor = rgb(0.12, 0.2, 0.35)

  const drawCentered = (text: string, size = 18) => {
    const t = safeText(text)

    if (isRTL) {
      const runs = tokenizeRuns(t)
      const w = measureRunsWidth(runs, latin, arabic, size)
      const xRight = (pageWidth + w) / 2
      const maxW = pageWidth - margin * 2
      drawRtlMixed(page, t, xRight, y, latin, arabic, size, titleColor, maxW, lineHeight)
    } else {
      const w = latin.widthOfTextAtSize(t, size)
      page.drawText(t, { x: (pageWidth - w) / 2, y, size, font: latin, color: titleColor })
    }

    y -= lineHeight * 2
  }

  const drawLine = (label: string, value: string) => {
    const l = safeText(label)
    const v = safeText(value)

    if (isRTL) {
      // label on far right, value to its left
      const labelMax = 190
      const valueEnd = rightX - 220
      const valueMax = valueEnd - margin

      const lLines = drawRtlMixed(page, l, rightX, y, latin, arabic, 11, textColor, labelMax, lineHeight)
      const vLines = drawRtlMixed(page, v, valueEnd, y, latin, arabic, 11, textColor, valueMax, lineHeight)

      y -= Math.max(lLines, vLines) * lineHeight
    } else {
      const labelX = margin
      const valueX = 220
      const labelMax = 160
      const valueMax = rightX - valueX

      const lLines = drawLtrWrapped(page, l, labelX, y, latin, 11, textColor, labelMax, lineHeight)
      const vLines = drawLtrWrapped(page, v, valueX, y, latin, 11, textColor, valueMax, lineHeight)

      y -= Math.max(lLines, vLines) * lineHeight
    }
  }

  const issueDate = new Date()
  const amount = subscription.payment?.amount ?? subscription.plan?.price ?? (subscription as any).pricePaid ?? 0
  const currency = subscription.payment?.currency ?? "MAD"
  const invoiceNumber = `INV-${subscription.id.slice(0, 8).toUpperCase()}`

  const planVisits = typeof subscription.plan?.visitsPerDay === "number" ? subscription.plan.visitsPerDay : null
  const planSession = typeof subscription.plan?.maxSessionMinutes === "number" ? subscription.plan.maxSessionMinutes : null

  // Title
  drawCentered(`${wording.invoice} • ${wording.title}`, 18)

  drawLine(wording.invoiceNumber, invoiceNumber)
  drawLine(wording.issuedAt, safeText(formatExportDate(issueDate, valueLocale)))
  drawLine(wording.gym, `${safeText(subscription.gym.name)} (${safeText(subscription.gym.city ?? "--")}, ${safeText(subscription.gym.country ?? "--")})`)
  y -= 8

  const memberName = `${subscription.member.firstName} ${subscription.member.lastName}`.trim()
  drawLine(wording.member, memberName)
  drawLine(wording.email, subscription.member.email ?? "--")
  drawLine(wording.phone, subscription.member.phone ?? "--")
  drawLine(wording.variant, subscription.member.gymVariant?.name ?? "--")
  y -= 8

  drawLine(wording.plan, subscription.plan?.name ?? "--")

  // ✅ Keep dash (no arrow glyph)
  const startStr = safeText(formatExportDate(subscription.startDate, valueLocale))
  const endStr = safeText(formatExportDate(subscription.endDate, valueLocale))
  drawLine(wording.period, `${startStr} - ${endStr}`)

  if (planVisits !== null) drawLine(wording.visits, planVisits < 0 ? wording.unlimited : `${planVisits}`)
  if (planSession !== null) drawLine(wording.session, `${planSession} min`)

  y -= 8
  drawLine(wording.amount, safeText(formatExportCurrency(amount, valueLocale, currency)))

  const pdfBytes = await pdf.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${invoiceNumber}.pdf`,
    },
  })
}
