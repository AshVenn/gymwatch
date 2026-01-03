import { NextRequest, NextResponse } from "next/server"
import { DemoRequestStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"

export async function GET(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformDemoRequestsManage)
  if (!permission.ok) return permission.response

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
      { code: "DEMO_REQUESTS_LIST_FAILED", message: "Unable to list demo requests" },
      { status: 500 },
    )
  }
}
