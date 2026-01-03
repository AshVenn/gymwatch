import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { NextResponse } from "next/server"
import type { GymPlanTier, UserRole } from "@prisma/client"

import { authOptions } from "@/lib/auth-middleware"
import { hasAnyPermission, hasPermission } from "@/lib/rbac/policies"
import type { Permission } from "@/lib/rbac/permissions"
import { resolveVariantAccess } from "@/lib/variant-access"

type GuardFail = { ok: false; response: NextResponse }
type GuardPass<T> = { ok: true } & T

export type AuthUser = {
  id?: string
  role?: UserRole
  gymId?: string
  gymVariantId?: string
  subscriptionPlan?: GymPlanTier | null
}

export const jsonError = (
  status: number,
  code: string,
  message: string,
  details?: unknown,
) => NextResponse.json({ code, message, details }, { status })

export async function requireSession(): Promise<
  GuardPass<{ session: Session; user: AuthUser }> | GuardFail
> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { ok: false, response: jsonError(401, "UNAUTHORIZED", "Unauthorized") }
  }
  return { ok: true, session, user: session.user as AuthUser }
}

export function requireRole(
  user: AuthUser,
  roles: UserRole[],
): GuardPass<Record<string, never>> | GuardFail {
  if (!user.role || !roles.includes(user.role)) {
    return { ok: false, response: jsonError(403, "FORBIDDEN_ROLE", "Forbidden") }
  }
  return { ok: true }
}

export function requirePermission(
  user: AuthUser,
  permission: Permission | Permission[],
): GuardPass<Record<string, never>> | GuardFail {
  const allowed = Array.isArray(permission)
    ? hasAnyPermission(user.role ?? null, permission)
    : hasPermission(user.role ?? null, permission)

  if (!allowed) {
    return { ok: false, response: jsonError(403, "FORBIDDEN_PERMISSION", "Forbidden") }
  }

  return { ok: true }
}

export function requireGymScope(
  user: AuthUser,
): GuardPass<{ gymId: string; gymVariantId?: string | null }> | GuardFail {
  if (!user.gymId) {
    return { ok: false, response: jsonError(401, "UNAUTHORIZED", "Unauthorized") }
  }

  return { ok: true, gymId: user.gymId, gymVariantId: user.gymVariantId ?? null }
}

export async function requireVariantAccess(options: {
  gymId: string
  tier: GymPlanTier | null | undefined
  role?: string | null
  requestedVariantId?: string | null
  sessionVariantId?: string | null
}): Promise<
  GuardPass<{
    variantId?: string
    variantMode: "SINGLE" | "MULTI"
    defaultVariantId: string | null
    multiLocationAllowed: boolean
  }> | GuardFail
> {
  const result = await resolveVariantAccess({
    gymId: options.gymId,
    tier: options.tier,
    role: options.role ?? undefined,
    requestedVariantId: options.requestedVariantId ?? undefined,
    sessionVariantId: options.sessionVariantId ?? undefined,
  })

  if (!result.ok) {
    return {
      ok: false,
      response: jsonError(result.status, result.code, result.message, {
        variantMode: result.variantMode,
        defaultVariantId: result.defaultVariantId,
        multiLocationAllowed: result.multiLocationAllowed,
      }),
    }
  }

  return {
    ok: true,
    variantId: result.variantId,
    variantMode: result.variantMode,
    defaultVariantId: result.defaultVariantId,
    multiLocationAllowed: result.multiLocationAllowed,
  }
}
