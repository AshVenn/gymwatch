import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gym = await prisma.gym.findUnique({
      where: { id: session.user.gymId },
    })

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 })
    }

    return NextResponse.json(gym)
  } catch (error) {
    console.error("Gym fetch failed", error)
    return NextResponse.json({ error: "Failed to fetch gym" }, { status: 500 })
  }
}

export async function PUT(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(
      {
        error:
          "Les parametres globaux sont en lecture seule pour votre compte. Contactez le support pour les modifier.",
      },
      { status: 403 },
    )
  } catch (error) {
    console.error("Gym update failed", error)
    return NextResponse.json({ error: "Failed to update gym" }, { status: 500 })
  }
}
