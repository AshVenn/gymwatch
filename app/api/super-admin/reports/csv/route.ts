import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

const querySchema = z.object({
  scope: z.enum(["global", "gym"]).default("global"),
  gymId: z.string().optional(),
})

function toCsv(rows: Array<Array<string | number>>) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const normalized = value ?? ""
          const stringified = typeof normalized === "string" ? normalized : normalized.toString()
          if (stringified.includes(",") || stringified.includes('"')) {
            return `"${stringified.replace(/"/g, '""')}"`
          }
          return stringified
        })
        .join(","),
    )
    .join("\n")
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
  const formatter = new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" })
  let csv = ""
  const filenameParts = ["super-admin", scope]

  if (scope === "global") {
    const gyms = await prisma.gym.findMany({
      include: {
        _count: { select: { members: true, subscriptions: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    const revenueByGym = await prisma.payment.groupBy({
      by: ["gymId"],
      _sum: { amount: true },
    })
    const revenueLookup = new Map(revenueByGym.map((entry) => [entry.gymId, entry._sum.amount ?? 0]))
    const rows: Array<Array<string | number>> = [
      ["Salle", "Plan", "Facturation", "Statut", "Membres", "Abonnements actifs", "Revenus"],
    ]
    gyms.forEach((gym) => {
      rows.push([
        gym.name,
        gym.subscriptionPlan,
        gym.billingInterval,
        gym.subscriptionStatus,
        gym._count.members,
        gym._count.subscriptions,
        formatter.format(revenueLookup.get(gym.id) ?? 0),
      ])
    })
    csv = toCsv(rows)
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

    filenameParts.push(gymId)
    const payments = await prisma.payment.aggregate({
      where: { gymId },
      _sum: { amount: true },
    })

    const rows: Array<Array<string | number>> = [
      ["Champ", "Valeur"],
      ["Salle", gym.name],
      ["Plan", gym.subscriptionPlan],
      ["Facturation", gym.billingInterval],
      ["Statut", gym.subscriptionStatus],
      ["Propriétaire", gym.owner?.email ?? "—"],
      ["Membres", gym._count.members],
      ["Abonnements actifs", gym._count.subscriptions],
      ["Revenus cumules", formatter.format(payments._sum.amount ?? 0)],
    ]

    csv = toCsv(rows)
  } else {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  const filename = `${filenameParts.join("-")}-${Date.now()}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
