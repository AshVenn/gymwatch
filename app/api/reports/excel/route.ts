import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { utils, write } from "xlsx"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"

const querySchema = z.object({
  type: z.enum(["earnings", "top-members", "loyal-members", "member"]),
  memberId: z.string().optional(),
})

function rowsToWorkbook(rows: Array<Array<string | number>>) {
  const worksheet = utils.aoa_to_sheet(rows)
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, "Rapport")
  return write(workbook, { bookType: "xlsx", type: "buffer" })
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasPlanFeature(tier, "excelReports")) {
    return NextResponse.json({ error: "Plan PRO requis" }, { status: 403 })
  }

  const parsed = querySchema.safeParse({
    type: request.nextUrl.searchParams.get("type"),
    memberId: request.nextUrl.searchParams.get("memberId") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametres invalides" }, { status: 400 })
  }

  const { type, memberId } = parsed.data

  if (type === "earnings" && role === "GYM_ADMIN") {
    return NextResponse.json({ error: "Acces revenu reserve au proprietaire" }, { status: 403 })
  }

  if (type === "member" && !memberId) {
    return NextResponse.json({ error: "memberId requis" }, { status: 400 })
  }

  let rows: Array<Array<string | number>> = []
  const now = new Date()
  const formatter = new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
  })

  // ===== Earnings =====
  if (type === "earnings") {
    rows = [["Mois", "Total"]]

    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999,
      )

      const agg = await prisma.payment.aggregate({
        where: { gymId, paymentDate: { gte: start, lte: end } },
        _sum: { amount: true },
      })

      rows.push([
        start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        formatter.format(agg._sum.amount ?? 0),
      ])
    }
  }

  // ===== Top / loyal members =====
  else if (type === "top-members" || type === "loyal-members") {
    const aggregated = await prisma.subscription.groupBy({
      by: ["memberId"],
      where: { gymId },
      _sum: { pricePaid: true },
      _count: { memberId: true }, // count how many rows per member
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

    const memberLookup = new Map(
      memberMap.map((m: any) => [m.id, m] as const),
    )

    rows = [["Membre", "Email", "Total payé", "Nombre d’abonnements"]]

    aggregated.forEach((entry: any) => {
      const member = memberLookup.get(entry.memberId)
      const fullName = member
        ? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()
        : entry.memberId

      rows.push([
        fullName,
        member?.email ?? "--",
        formatter.format(entry._sum?.pricePaid ?? 0),
        entry._count?.memberId ?? 0,
      ])
    })
  }

  // ===== Single member report =====
  else if (type === "member" && memberId) {
    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { startDate: "desc" },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
    }

    rows = [
      ["Champ", "Valeur"],
      ["Nom", `${member.firstName} ${member.lastName}`.trim()],
      ["Email", member.email ?? "--"],
      ["Téléphone", member.phone ?? "--"],
      ["Total abonnements", member.subscriptions.length],
    ]

    const totalPaid = member.subscriptions.reduce(
      (sum: number, sub: any) => sum + (sub.pricePaid ?? 0),
      0,
    )

    rows.push(["Montant cumulé", formatter.format(totalPaid)])

    member.subscriptions.forEach((sub: any) => {
      rows.push([
        `Plan ${sub.plan?.name ?? ""}`,
        `${new Date(sub.startDate).toLocaleDateString(
          "fr-FR",
        )} -> ${new Date(sub.endDate).toLocaleDateString("fr-FR")} (${formatter.format(
          sub.pricePaid ?? 0,
        )})`,
      ])
    })
  }

  const filename = `gym-report-${type}-${Date.now()}.xlsx`
  const payload = rowsToWorkbook(rows)

  return new NextResponse(payload as any, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
