import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { z } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import { formatExportCurrency, resolveExportLocale, formatExportDate } from "@/lib/export-locale"
import { updateGymFromSuperAdmin, getSuperAdminGymDetail } from "@/lib/super-admin"
import { GymBillingInterval, GymPlanTier, GymSubscriptionStatus } from "@prisma/client"
import { resolvePlanPrice } from "@/lib/plan-settings"

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
}

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function POST(request: NextRequest, { params }: { params: { gymId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const parsed = payloadSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
  const payload = parsed.data
  const locale = resolveExportLocale(payload.locale)
  const wording = labels[locale]

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

  if (!updatedGym) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 })
  }

  const amount =
    typeof updatedGym.subscriptionPrice === "number"
      ? updatedGym.subscriptionPrice
      : await resolvePlanPrice(payload.subscriptionPlan, payload.billingInterval)

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let cursorY = 780
  const lineHeight = 22
  const drawLine = (label: string, value: string) => {
    page.drawText(label, { x: 48, y: cursorY, size: 11, font, color: rgb(0.15, 0.15, 0.15) })
    page.drawText(value, { x: 260, y: cursorY, size: 11, font: bold, color: rgb(0.1, 0.1, 0.1) })
    cursorY -= lineHeight
  }

  const invoiceNumber = `GYM-${updatedGym.id.slice(0, 8).toUpperCase()}-${Date.now()}`
  const issueDate = new Date()

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
  drawLine(wording.gym, `${updatedGym.name} (${updatedGym.city ?? "--"}, ${updatedGym.country ?? "--"})`)
  cursorY -= 8
  drawLine(wording.plan, `${payload.subscriptionPlan} (${payload.billingInterval})`)
  drawLine(wording.status, payload.subscriptionStatus)
  drawLine(wording.expiresAt, expiresAtDate ? formatExportDate(expiresAtDate, locale) : "--")
  if (typeof payload.subscriptionGracePeriodDays === "number") {
    drawLine(wording.grace, `${payload.subscriptionGracePeriodDays} j`)
  }
  if (typeof payload.maxAdminAccounts === "number") {
    drawLine(wording.admins, `${payload.maxAdminAccounts}`)
  }
  cursorY -= 8
  drawLine(wording.amount, formatExportCurrency(amount, locale))

  const pdfBytes = await pdf.save()

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${invoiceNumber}.pdf`,
    },
  })
}
