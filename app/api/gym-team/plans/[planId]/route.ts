// app/api/plans/[planId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { resolveGymPlanLimits } from '@/lib/plan-settings'
import { jsonError, requireGymScope, requirePermission, requireSession } from '@/lib/auth/guards'
import { Permissions } from '@/lib/rbac/permissions'

function normalizeVisitsPerDay(raw: unknown) {
  if (raw === undefined || raw === null) {
    return undefined
  }
  const parsed = typeof raw === 'string' ? Number(raw) : raw
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    throw new Error('VISITS_PER_DAY_INVALID')
  }
  const intValue = Math.trunc(parsed)
  if (intValue === -1) return -1
  if (intValue < 1) {
    throw new Error('VISITS_PER_DAY_INVALID')
  }
  return intValue
}

function normalizeSessionLimit(raw: unknown, { allowUndefined = false }: { allowUndefined?: boolean } = {}) {
  if (raw === undefined) {
    return allowUndefined ? undefined : null
  }
  if (raw === null || raw === '') {
    return null
  }
  const parsed = typeof raw === 'string' ? Number(raw) : raw
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    throw new Error('SESSION_LIMIT_INVALID')
  }
  const intValue = Math.trunc(parsed)
  if (intValue <= 0) {
    throw new Error('SESSION_LIMIT_INVALID')
  }
  return intValue
}

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymPlansManage)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const role = (sessionResult.user as any).role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
    if (role === 'GYM_ADMIN' && !sessionVariantId) {
      return jsonError(403, 'MISSING_VARIANT', 'Variant manquant')
    }

    const payload = await request.json()
    const { name, durationDays, price, isActive } = payload
    let visitsPerDay: number | undefined
    let maxSessionMinutes: number | null | undefined
    try {
      visitsPerDay = normalizeVisitsPerDay(payload.visitsPerDay)
    } catch {
      return NextResponse.json({ error: 'VISITS_PER_DAY_INVALID' }, { status: 400 })
    }
    try {
      maxSessionMinutes = normalizeSessionLimit(payload.maxSessionMinutes, { allowUndefined: true })
    } catch {
      return NextResponse.json({ error: 'SESSION_LIMIT_INVALID' }, { status: 400 })
    }

    const planRecord = await prisma.membershipPlan.findUnique({ where: { id: params.planId } })

    if (!planRecord || planRecord.gymId !== scope.gymId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    if (role === 'GYM_ADMIN' && sessionVariantId && planRecord.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: 'FORBIDDEN_VARIANT' }, { status: 403 })
    }

    if (isActive === true && planRecord.isActive === false) {
      const gym = await prisma.gym.findUnique({
        where: { id: scope.gymId },
        select: { subscriptionPlan: true, planLimitPerVariant: true, planLimitPerNetwork: true },
      })
      if (!gym) {
        return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
      }
      const limits = await resolveGymPlanLimits(gym.subscriptionPlan, {
        perVariant: gym.planLimitPerVariant,
        perNetwork: gym.planLimitPerNetwork,
      })
      const [variantActivePlans, networkActivePlans] = await Promise.all([
        prisma.membershipPlan.count({
          where: { gymId: scope.gymId, gymVariantId: planRecord.gymVariantId, isActive: true },
        }),
        prisma.membershipPlan.count({ where: { gymId: scope.gymId, isActive: true } }),
      ])

      if (!limits.unlimitedPerVariant && variantActivePlans >= limits.perVariant!) {
        return NextResponse.json(
          {
            error: 'PLAN_LIMIT_REACHED',
            message: 'Limite atteinte pour cette variante.',
            limits,
            usage: { variantActivePlans, networkActivePlans },
          },
          { status: 409 },
        )
      }
      if (!limits.unlimitedPerNetwork && networkActivePlans >= limits.perNetwork!) {
        return NextResponse.json(
          {
            error: 'PLAN_LIMIT_REACHED',
            message: 'Limite reseau atteinte.',
            limits,
            usage: { variantActivePlans, networkActivePlans },
          },
          { status: 409 },
        )
      }
    }

    const plan = await db.updatePlan(params.planId, {
      name,
      durationDays,
      price,
      isActive,
      visitsPerDay,
      maxSessionMinutes,
    })

    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymPlansManage)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const role = (sessionResult.user as any).role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
    if (role === 'GYM_ADMIN' && !sessionVariantId) {
      return jsonError(403, 'MISSING_VARIANT', 'Variant manquant')
    }

    const planRecord = await prisma.membershipPlan.findUnique({ where: { id: params.planId } })
    if (!planRecord || planRecord.gymId !== scope.gymId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    if (role === 'GYM_ADMIN' && sessionVariantId && planRecord.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: 'FORBIDDEN_VARIANT' }, { status: 403 })
    }

    await db.deletePlan(params.planId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
