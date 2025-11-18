//api/plans/[plansId]/route.ts
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, durationDays, price } = await request.json()

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await db.deletePlan(params.planId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
