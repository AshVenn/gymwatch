import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z, ZodError } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import {
  createGymForSuperAdmin,
  listGymsForSuperAdmin,
} from "@/lib/super-admin"
import { GymBillingInterval, GymPlanTier, GymSubscriptionStatus } from "@prisma/client"

const createGymSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  city: z.string().optional(),
  country: z.string().optional(),
  subscriptionPlan: z.nativeEnum(GymPlanTier),
  billingInterval: z.nativeEnum(GymBillingInterval).optional(),
  subscriptionStatus: z.nativeEnum(GymSubscriptionStatus).optional(),
  subscriptionExpiresAt: z.string().optional(),
  subscriptionGracePeriodDays: z.number().int().min(0).max(365).optional(),
  analyticsSnapshot: z.any().optional(),
  maxAdminAccounts: z.number().int().min(1).max(20).optional(),
  owner: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
  }),
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function GET() {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const gyms = await listGymsForSuperAdmin()
    return NextResponse.json(gyms)
  } catch (error) {
    console.error("[super-admin][gyms][GET]", error)
    return NextResponse.json({ error: "Unable to list gyms" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = createGymSchema.parse(await req.json())
    const created = await createGymForSuperAdmin({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      country: payload.country,
      subscriptionPlan: payload.subscriptionPlan,
      billingInterval: payload.billingInterval,
      subscriptionStatus: payload.subscriptionStatus,
      subscriptionExpiresAt: payload.subscriptionExpiresAt
        ? new Date(payload.subscriptionExpiresAt)
        : undefined,
      subscriptionGracePeriodDays: payload.subscriptionGracePeriodDays,
      analyticsSnapshot: payload.analyticsSnapshot,
      maxAdminAccounts: payload.maxAdminAccounts,
      owner: payload.owner,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("[super-admin][gyms][POST]", error)
    return NextResponse.json({ error: "Unable to create gym" }, { status: 500 })
  }
}
