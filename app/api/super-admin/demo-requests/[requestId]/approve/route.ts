import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { GymBillingInterval, GymPlanTier, GymSubscriptionStatus, DemoRequestStatus } from "@prisma/client"
import { z, ZodError } from "zod"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { createGymForSuperAdmin } from "@/lib/super-admin"

const approveSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  subscriptionPlan: z.nativeEnum(GymPlanTier),
  billingInterval: z.nativeEnum(GymBillingInterval).optional(),
  subscriptionStatus: z.nativeEnum(GymSubscriptionStatus).optional(),
  subscriptionExpiresAt: z.string().optional(),
  subscriptionGracePeriodDays: z.number().int().min(0).max(365).optional(),
  maxAdminAccounts: z.number().int().min(1).max(20).optional(),
  demoEndsAt: z.string().optional(),
  owner: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
  }),
  admins: z
    .array(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(2),
        lastName: z.string().min(2),
      }),
    )
    .optional(),
  resolutionNote: z.string().max(1000).optional(),
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = approveSchema.parse(await request.json())

    const demoRequest = await prisma.demoRequest.findUnique({
      where: { id: params.requestId },
    })

    if (!demoRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (demoRequest.status === DemoRequestStatus.RESOLVED) {
      return NextResponse.json({ error: "Request already resolved" }, { status: 409 })
    }

    const subscriptionExpiresAt = body.subscriptionExpiresAt
      ? new Date(body.subscriptionExpiresAt)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const demoEndsAt = body.demoEndsAt ? new Date(body.demoEndsAt) : subscriptionExpiresAt

    const created = await createGymForSuperAdmin({
      name: body.name,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      country: body.country,
      subscriptionPlan: body.subscriptionPlan,
      billingInterval: body.billingInterval ?? "MONTHLY",
      subscriptionStatus: body.subscriptionStatus ?? "ACTIVE",
      subscriptionExpiresAt,
      subscriptionGracePeriodDays: body.subscriptionGracePeriodDays ?? 7,
      maxAdminAccounts: body.maxAdminAccounts ?? 3,
      isDemo: true,
      demoEndsAt,
      admins: body.admins,
      owner: body.owner,
    })

    await prisma.demoRequest.update({
      where: { id: params.requestId },
      data: {
        status: DemoRequestStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: session.user.id,
        resolutionNote: body.resolutionNote ?? null,
        createdGymId: created.id,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("[super-admin][demo-requests][approve]", error)
    return NextResponse.json(
      { error: "Unable to approve request" },
      { status: 500 },
    )
  }
}
