import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

const querySchema = z.object({
  scope: z.enum(["global", "gym"]).default("global"),
  gymId: z.string().optional(),
})

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
  const formatter = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" })

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let cursorY = 792

  const drawTitle = (text: string) => {
    page.drawText(text, { x: 48, y: cursorY, size: 18, font: bold, color: rgb(0.14, 0.22, 0.36) })
    cursorY -= 28
  }

  const drawLine = (label: string, value: string) => {
    page.drawText(label, { x: 48, y: cursorY, size: 12, font, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(value, { x: 280, y: cursorY, size: 12, font: bold, color: rgb(0.1, 0.1, 0.1) })
    cursorY -= 18
  }

  drawTitle("GymWatch · Rapport exécutif")
  drawLine("Généré le", new Date().toLocaleString("fr-FR"))
  cursorY -= 10

  if (scope === "global") {
    const [gyms, payments] = await Promise.all([
      prisma.gym.findMany({
        include: { _count: { select: { members: true, subscriptions: true } } },
      }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ])

    drawTitle("Vue globale")
    drawLine("Salles actives", `${gyms.length}`)
    drawLine(
      "Abonnements actifs",
      `${gyms.reduce((sum, gym) => sum + gym._count.subscriptions, 0)}`,
    )
    drawLine(
      "Membres total",
      `${gyms.reduce((sum, gym) => sum + gym._count.members, 0)}`,
    )
    drawLine("Revenus cumulés", formatter.format(payments._sum.amount ?? 0))
    cursorY -= 16
    drawTitle("Top 5 salles")
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
        drawLine(
          `${index + 1}. ${gym.name}`,
          `${gym.subscriptionPlan} · ${formatter.format(entry._sum.amount ?? 0)}`,
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
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 })
    }

    const payments = await prisma.payment.aggregate({
      where: { gymId },
      _sum: { amount: true },
    })

    drawTitle(`Salle · ${gym.name}`)
    drawLine("Plan", `${gym.subscriptionPlan} (${gym.billingInterval})`)
    drawLine("Statut", gym.subscriptionStatus)
    drawLine("Adresses", `${gym.city ?? "-"}, ${gym.country ?? "-"}`)
    drawLine("Propriétaire", gym.owner?.email ?? "—")
    drawLine("Membres", `${gym._count.members}`)
    drawLine("Abonnements actifs", `${gym._count.subscriptions}`)
    drawLine("Revenus cumulés", formatter.format(payments._sum.amount ?? 0))
    cursorY -= 10
    drawTitle("Abonnements récents")
    const latestSubs = await prisma.subscription.findMany({
      where: { gymId },
      orderBy: { endDate: "desc" },
      include: { member: true, plan: true },
      take: 6,
    })
    latestSubs.forEach((sub) => {
      drawLine(
        `${sub.member.firstName} ${sub.member.lastName}`,
        `${sub.plan?.name ?? "Plan"} · fin ${new Date(sub.endDate).toLocaleDateString("fr-FR")}`,
      )
    })
  } else {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
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
