import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z, ZodError } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import {
  deleteGymFromSuperAdmin,
  getSuperAdminGymDetail,
  updateGymFromSuperAdmin,
} from "@/lib/super-admin"
import { GymBillingInterval, GymPlanTier, GymSubscriptionStatus } from "@prisma/client"

const updateGymSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(3).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  subscriptionStatus: z.nativeEnum(GymSubscriptionStatus),
  subscriptionPlan: z.nativeEnum(GymPlanTier).optional(),
  billingInterval: z.nativeEnum(GymBillingInterval).optional(),
  subscriptionExpiresAt: z.string().nullable().optional(),
  subscriptionGracePeriodDays: z.number().int().min(0).max(365).optional(),
  analyticsSnapshot: z.any().optional(),
  maxAdminAccounts: z.number().int().min(1).max(20).optional(),
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function GET(
  _req: Request,
  { params }: any,
) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const gym = await getSuperAdminGymDetail(params.gymId)
  if (!gym) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(gym)
}

export async function PATCH(
  req: Request,
  { params }: any,
) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = updateGymSchema.parse(await req.json())
    const updated = await updateGymFromSuperAdmin(params.gymId, {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      country: payload.country,
      address: payload.address,
      subscriptionStatus: payload.subscriptionStatus,
      subscriptionPlan: payload.subscriptionPlan,
      billingInterval: payload.billingInterval,
      subscriptionExpiresAt: payload.subscriptionExpiresAt
        ? new Date(payload.subscriptionExpiresAt)
        : null,
      subscriptionGracePeriodDays: payload.subscriptionGracePeriodDays,
      analyticsSnapshot: payload.analyticsSnapshot,
      maxAdminAccounts: payload.maxAdminAccounts,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    console.error("[super-admin][gyms][PATCH]", error)
    return NextResponse.json(
      { error: "Unable to update subscription" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: any,
) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    await deleteGymFromSuperAdmin(params.gymId)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      if (error.message === "ACTIVE_GYM") {
        return NextResponse.json(
          { error: "Cette salle est toujours active" },
          { status: 409 },
        )
      }
    }
    console.error("[super-admin][gyms][DELETE]", error)
    return NextResponse.json(
      { error: "Unable to delete gym" },
      { status: 500 },
    )
  }
}
