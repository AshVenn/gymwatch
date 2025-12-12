import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { convertDemoGym } from "@/lib/super-admin"

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function POST(_req: Request, { params }: { params: { gymId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const updated = await convertDemoGym(params.gymId)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      if (error.message === "NOT_DEMO") {
        return NextResponse.json({ error: "Not a demo gym" }, { status: 400 })
      }
    }
    return NextResponse.json({ error: "Unable to convert gym" }, { status: 500 })
  }
}
