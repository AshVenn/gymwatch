import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import {
  deleteGymFromSuperAdmin,
  getSuperAdminGymDetail,
  updateGymFromSuperAdmin,
} from "@/lib/super-admin"
import { GymBillingInterval, GymFreezeStatus, GymPlanTier, GymSubscriptionStatus } from "@prisma/client"
import { Permissions } from "@/lib/rbac/permissions"
import { hasPermission } from "@/lib/rbac/policies"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

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
  planLimitPerVariant: z.number().int().min(-1).optional(),
  planLimitPerNetwork: z.number().int().min(-1).optional(),
  capacity: z.number().int().min(0).max(100000).optional(),
  maxMembers: z.number().int().min(-1).optional(),
  maxVariants: z.number().int().min(-1).optional(),
  freezeStatus: z.nativeEnum(GymFreezeStatus).nullable().optional(),
  freezeReason: z.string().max(255).nullable().optional(),
  freezeUntil: z.string().nullable().optional(),
})

export async function GET(
  _req: Request,
  { params }: any,
) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsRead)
  if (!permission.ok) return permission.response

  const gym = await getSuperAdminGymDetail(params.gymId)
  if (!gym) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Not found" }, { status: 404 })
  }

  const canViewFinancials = hasPermission(
    sessionResult.user.role ?? null,
    Permissions.PlatformAnalyticsRevenue,
  )

  if (!canViewFinancials) {
    return NextResponse.json({
      ...gym,
      subscriptionPrice: null,
      analyticsSnapshot: undefined,
      paymentsLast30Days: null,
      paymentsCurrentMonth: null,
      paymentsTotal: null,
      membershipPlans: (gym.membershipPlans ?? []).map((plan) => ({
        ...plan,
        price: null,
      })),
    })
  }

  return NextResponse.json(gym)
}

export async function PATCH(
  req: Request,
  { params }: any,
) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsWrite)
  if (!permission.ok) return permission.response

  try {
    const payload = updateGymSchema.parse(await req.json())
    const canViewFinancials = hasPermission(
      sessionResult.user.role ?? null,
      Permissions.PlatformAnalyticsRevenue,
    )
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
      analyticsSnapshot: canViewFinancials ? payload.analyticsSnapshot : undefined,
      maxAdminAccounts: payload.maxAdminAccounts,
      planLimitPerVariant: payload.planLimitPerVariant,
      planLimitPerNetwork: payload.planLimitPerNetwork,
      capacity: payload.capacity,
      maxMembers: payload.maxMembers,
      maxVariants: payload.maxVariants,
      freezeStatus: payload.freezeStatus ?? undefined,
      freezeReason: payload.freezeReason ?? undefined,
      freezeUntil: payload.freezeUntil ? new Date(payload.freezeUntil) : null,
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.gym.update",
      targetType: "gym",
      targetId: updated.id,
      metadata: {
        updatedFields: Object.keys(payload),
        subscriptionStatus: payload.subscriptionStatus,
      },
      request: req,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    console.error("[super-admin][gyms][PATCH]", error)
    return NextResponse.json(
      { code: "GYM_UPDATE_FAILED", message: "Unable to update subscription" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: any,
) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsDelete)
  if (!permission.ok) return permission.response

  try {
    await deleteGymFromSuperAdmin(params.gymId)
    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.gym.delete",
      targetType: "gym",
      targetId: params.gymId,
      request: _req,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ code: "NOT_FOUND", message: "Not found" }, { status: 404 })
      }
      if (error.message === "ACTIVE_GYM") {
        return NextResponse.json(
          { code: "ACTIVE_GYM", message: "Cette salle est toujours active" },
          { status: 409 },
        )
      }
    }
    console.error("[super-admin][gyms][DELETE]", error)
    return NextResponse.json(
      { code: "GYM_DELETE_FAILED", message: "Unable to delete gym" },
      { status: 500 },
    )
  }
}
