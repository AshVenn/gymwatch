import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { formatExportCurrency, formatExportDate, resolveExportLocale } from "@/lib/export-locale"

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
  },
}

export async function GET(request: NextRequest, { params }: { params: { subscriptionId: string } }) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const sessionVariantId = (session?.user as any)?.gymVariantId as string | undefined

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  const locale = resolveExportLocale(request.nextUrl.searchParams.get("locale"))
  const wording = labels[locale]

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

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  }
  if (role === "GYM_ADMIN" && sessionVariantId && subscription.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
  }

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let cursorY = 780
  const lineHeight = 20
  const drawLine = (label: string, value: string) => {
    page.drawText(label, { x: 48, y: cursorY, size: 11, font, color: rgb(0.15, 0.15, 0.15) })
    page.drawText(value, { x: 220, y: cursorY, size: 11, font: bold, color: rgb(0.1, 0.1, 0.1) })
    cursorY -= lineHeight
  }

  const issueDate = new Date()
  const amount = subscription.payment?.amount ?? subscription.plan?.price ?? subscription.pricePaid ?? 0
  const currency = subscription.payment?.currency ?? "MAD"
  const invoiceNumber = `INV-${subscription.id.slice(0, 8).toUpperCase()}`
  const planVisits = typeof subscription.plan?.visitsPerDay === "number" ? subscription.plan.visitsPerDay : null
  const planSession = typeof subscription.plan?.maxSessionMinutes === "number" ? subscription.plan.maxSessionMinutes : null

  page.drawText(`${wording.invoice} • ${wording.title}`, {
    x: 48,
    y: cursorY,
    size: 18,
    font: bold,
    color: rgb(0.12, 0.2, 0.35),
  })
  cursorY -= lineHeight * 1.5
  drawLine(wording.invoiceNumber, invoiceNumber)
  drawLine(wording.issuedAt, formatExportDate(issueDate, locale))
  drawLine(wording.gym, `${subscription.gym.name} (${subscription.gym.city ?? "--"}, ${subscription.gym.country ?? "--"})`)
  cursorY -= 8
  drawLine(wording.member, `${subscription.member.firstName} ${subscription.member.lastName}`.trim())
  drawLine("Email", subscription.member.email ?? "--")
  drawLine("Phone", subscription.member.phone ?? "--")
  drawLine(wording.variant, subscription.member.gymVariant?.name ?? "--")
  cursorY -= 8
  drawLine(wording.plan, subscription.plan?.name ?? "--")
  drawLine(
    wording.period,
    `${formatExportDate(subscription.startDate, locale)} → ${formatExportDate(subscription.endDate, locale)}`,
  )
  if (planVisits !== null) {
    drawLine(wording.visits, planVisits < 0 ? wording.unlimited ?? "Illimité" : `${planVisits}`)
  }
  if (planSession !== null) {
    drawLine(wording.session, `${planSession} min`)
  }
  cursorY -= 8
  drawLine(wording.amount, formatExportCurrency(amount, locale, currency))

  const pdfBytes = await pdf.save()
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${invoiceNumber}.pdf`,
    },
  })
}
