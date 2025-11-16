// api/members/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // 🔥 FIXED: Must pass authOptions
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const members = await db.getMembers(session.user.gymId as string)

    return NextResponse.json(members)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔥 FIXED: Must pass authOptions
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { firstName, lastName, email, phone } = await request.json()

    const member = await db.createMember({
      gymId: session.user.gymId as string,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    )
  }
}
