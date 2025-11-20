import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { DemoRequestStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function GET(request: NextRequest) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const statusParam = request.nextUrl.searchParams.get("status")
    const statusFilter = statusParam && statusParam in DemoRequestStatus ? (statusParam as DemoRequestStatus) : undefined

    const requests = await prisma.demoRequest.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        gymName: true,
        gymEmail: true,
        adminEmail: true,
        adminFirstName: true,
        adminLastName: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        plan: true,
        message: true,
        status: true,
        resolvedAt: true,
        createdAt: true,
        resolutionNote: true,
        createdGymId: true,
      },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("[super-admin][demo-requests][GET]", error)
    return NextResponse.json(
      { error: "Unable to list demo requests" },
      { status: 500 },
    )
  }
}
