import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import {
  createGymForSuperAdmin,
  listGymsForSuperAdmin,
} from "@/lib/super-admin"
import { GymBillingInterval, GymPlanTier, GymSubscriptionStatus } from "@prisma/client"
import { Permissions } from "@/lib/rbac/permissions"
import { hasPermission } from "@/lib/rbac/policies"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const createGymSchema = z.object({
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
  analyticsSnapshot: z.any().optional(),
  maxAdminAccounts: z.number().int().min(1).max(20).optional(),
  planLimitPerVariant: z.number().int().min(-1).optional(),
  planLimitPerNetwork: z.number().int().min(-1).optional(),
  isDemo: z.boolean().optional(),
  demoEndsAt: z.string().optional(),
  admins: z
    .array(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        variantSlug: z.string().optional(),
      }),
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        slug: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .optional(),
  owner: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
  }),
})

export async function GET() {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsRead)
  if (!permission.ok) return permission.response

  try {
    const gyms = await listGymsForSuperAdmin()
    const canViewFinancials = hasPermission(
      sessionResult.user.role ?? null,
      Permissions.PlatformAnalyticsRevenue,
    )

    if (!canViewFinancials) {
      const redacted = gyms.map((gym) => ({
        ...gym,
        subscriptionPrice: null,
        analyticsSnapshot: undefined,
      }))
      return NextResponse.json(redacted)
    }

    return NextResponse.json(gyms)
  } catch (error) {
    console.error("[super-admin][gyms][GET]", error)
    return NextResponse.json(
      { code: "GYMS_LIST_FAILED", message: "Unable to list gyms" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsWrite)
  if (!permission.ok) return permission.response

  try {
    const payload = createGymSchema.parse(await req.json())
    const canViewFinancials = hasPermission(
      sessionResult.user.role ?? null,
      Permissions.PlatformAnalyticsRevenue,
    )
    const created = await createGymForSuperAdmin({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      country: payload.country,
      subscriptionPlan: payload.subscriptionPlan,
      billingInterval: payload.billingInterval,
      subscriptionStatus: payload.subscriptionStatus,
      subscriptionExpiresAt: payload.subscriptionExpiresAt
        ? new Date(payload.subscriptionExpiresAt)
        : undefined,
      subscriptionGracePeriodDays: payload.subscriptionGracePeriodDays,
      analyticsSnapshot: canViewFinancials ? payload.analyticsSnapshot : undefined,
      maxAdminAccounts: payload.maxAdminAccounts,
      planLimitPerVariant: payload.planLimitPerVariant,
      planLimitPerNetwork: payload.planLimitPerNetwork,
      isDemo: payload.isDemo,
      demoEndsAt: payload.demoEndsAt ? new Date(payload.demoEndsAt) : undefined,
      variants: payload.variants,
      admins: payload.admins,
      owner: payload.owner,
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.gym.create",
      targetType: "gym",
      targetId: created.id,
      metadata: {
        plan: created.subscriptionPlan,
        billingInterval: created.billingInterval,
        isDemo: created.isDemo,
      },
      request: req,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("[super-admin][gyms][POST]", error)
    return NextResponse.json(
      { code: "GYM_CREATE_FAILED", message: "Unable to create gym" },
      { status: 500 },
    )
  }
}
