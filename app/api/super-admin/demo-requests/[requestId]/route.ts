import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { DemoRequestStatus } from "@prisma/client"
import { z, ZodError } from "zod"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

const updateSchema = z.object({
  status: z.nativeEnum(DemoRequestStatus),
  resolutionNote: z.string().max(1000).optional(),
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function GET(_request: NextRequest, { params }: { params: { requestId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const request = await prisma.demoRequest.findUnique({
    where: { id: params.requestId },
    include: {
      resolvedBy: { select: { id: true, email: true } },
    },
  })

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(request)
}

export async function PATCH(request: NextRequest, { params }: { params: { requestId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = updateSchema.parse(await request.json())

    const resolvedFields =
      body.status === DemoRequestStatus.PENDING
        ? { resolvedAt: null, resolvedById: null }
        : { resolvedAt: new Date(), resolvedById: session.user.id }

    const updated = await prisma.demoRequest.update({
      where: { id: params.requestId },
      data: {
        status: body.status,
        resolutionNote: body.resolutionNote ?? null,
        ...resolvedFields,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("[super-admin][demo-requests][PATCH]", error)
    return NextResponse.json(
      { error: "Unable to update request" },
      { status: 500 },
    )
  }
}
