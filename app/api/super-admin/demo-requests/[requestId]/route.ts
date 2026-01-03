import { NextRequest, NextResponse } from "next/server"
import { DemoRequestStatus } from "@prisma/client"
import { z, ZodError } from "zod"

import { prisma } from "@/lib/prisma"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const updateSchema = z.object({
  status: z.nativeEnum(DemoRequestStatus),
  resolutionNote: z.string().max(1000).optional(),
})

export async function GET(_request: NextRequest, { params }: { params: { requestId: string } }) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformDemoRequestsManage)
  if (!permission.ok) return permission.response

  const request = await prisma.demoRequest.findUnique({
    where: { id: params.requestId },
    include: {
      resolvedBy: { select: { id: true, email: true } },
    },
  })

  if (!request) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Not found" }, { status: 404 })
  }

  return NextResponse.json(request)
}

export async function PATCH(request: NextRequest, { params }: { params: { requestId: string } }) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformDemoRequestsManage)
  if (!permission.ok) return permission.response

  try {
    const body = updateSchema.parse(await request.json())

    const resolvedFields =
      body.status === DemoRequestStatus.PENDING
        ? { resolvedAt: null, resolvedById: null }
        : { resolvedAt: new Date(), resolvedById: sessionResult.user.id }

    const updated = await prisma.demoRequest.update({
      where: { id: params.requestId },
      data: {
        status: body.status,
        resolutionNote: body.resolutionNote ?? null,
        ...resolvedFields,
      },
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.demo-request.update",
      targetType: "demo-request",
      targetId: params.requestId,
      metadata: { status: updated.status },
      request,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("[super-admin][demo-requests][PATCH]", error)
    return NextResponse.json(
      { code: "DEMO_REQUEST_UPDATE_FAILED", message: "Unable to update request" },
      { status: 500 },
    )
  }
}
