import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { getSuperAdminOverview } from "@/lib/super-admin"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const stats = await getSuperAdminOverview()

    console.log("SUPER ADMIN STATS RETURNED:", JSON.stringify(stats, null, 2))

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[super-admin][stats]", error)
    return NextResponse.json({ error: "Unable to load stats" }, { status: 500 })
  }

}
