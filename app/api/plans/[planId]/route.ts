// app/api/plans/[planId]/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, durationDays, price } = await request.json()

    const planRecord = await prisma.membershipPlan.findUnique({ where: { id: params.planId } })

    if (!planRecord || planRecord.gymId !== session.user.gymId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const plan = await db.updatePlan(params.planId, {
      name,
      durationDays,
      price,
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

    const planRecord = await prisma.membershipPlan.findUnique({ where: { id: params.planId } })
    if (!planRecord || planRecord.gymId !== session.user.gymId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    await db.deletePlan(params.planId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
