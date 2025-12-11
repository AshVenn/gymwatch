// app/api/plans/[planId]/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { resolveGymPlanLimits } from '@/lib/plan-settings'

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session.user as any).role as string | undefined
    const sessionVariantId = (session.user as any).gymVariantId as string | undefined
    if (role === 'GYM_ADMIN' && !sessionVariantId) {
      return NextResponse.json({ error: 'Variant manquant' }, { status: 403 })
    }

    const { name, durationDays, price, isActive } = await request.json()

    const planRecord = await prisma.membershipPlan.findUnique({ where: { id: params.planId } })

    if (!planRecord || planRecord.gymId !== session.user.gymId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    if (role === 'GYM_ADMIN' && sessionVariantId && planRecord.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: 'FORBIDDEN_VARIANT' }, { status: 403 })
    }

    if (isActive === true && planRecord.isActive === false) {
      const gym = await prisma.gym.findUnique({
        where: { id: session.user.gymId as string },
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
          where: { gymId: session.user.gymId as string, gymVariantId: planRecord.gymVariantId, isActive: true },
        }),
        prisma.membershipPlan.count({ where: { gymId: session.user.gymId as string, isActive: true } }),
      ])

      if (!limits.unlimitedPerVariant && variantActivePlans >= limits.perVariant!) {
        return NextResponse.json(
          { error: 'PLAN_LIMIT_REACHED', message: 'Limite atteinte pour cette variante.' },
          { status: 409 },
        )
      }
      if (!limits.unlimitedPerNetwork && networkActivePlans >= limits.perNetwork!) {
        return NextResponse.json(
          { error: 'PLAN_LIMIT_REACHED', message: 'Limite reseau atteinte.' },
          { status: 409 },
        )
      }
    }

    const plan = await db.updatePlan(params.planId, {
      name,
      durationDays,
      price,
      isActive,
    })

    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session.user as any).role as string | undefined
    const sessionVariantId = (session.user as any).gymVariantId as string | undefined
    if (role === 'GYM_ADMIN' && !sessionVariantId) {
      return NextResponse.json({ error: 'Variant manquant' }, { status: 403 })
    }

    const planRecord = await prisma.membershipPlan.findUnique({ where: { id: params.planId } })
    if (!planRecord || planRecord.gymId !== session.user.gymId) {
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
