//api/plans/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // 🔥 FIXED HERE
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const plans = await db.getPlans(session.user.gymId as string)

    return NextResponse.json(plans)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔥 FIXED HERE
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, durationDays, price } = await request.json()

    const plan = await db.createPlan({
      gymId: session.user.gymId as string,
      name,
      durationDays,
      price,
    })

    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    )
  }
}
