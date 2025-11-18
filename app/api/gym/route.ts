import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

const MIN_UPDATE_INTERVAL_MS = Number(process.env.GYM_SETTINGS_INTERVAL_MS ?? 60_000)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gym = await prisma.gym.findUnique({
      where: { id: session.user.gymId },
    })

    if (!gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
    }

    return NextResponse.json(gym)
  } catch (error) {
    console.error('Gym fetch failed', error)
    return NextResponse.json({ error: 'Failed to fetch gym' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['GYM_OWNER', 'GYM_ADMIN'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Action réservée au propriétaire' }, { status: 403 })
    }

    const gymRecord = await prisma.gym.findUnique({
      where: { id: session.user.gymId },
      select: { lastSettingsUpdateAt: true },
    })

    if (!gymRecord) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
    }

    if (gymRecord.lastSettingsUpdateAt) {
      const elapsed = Date.now() - gymRecord.lastSettingsUpdateAt.getTime()
      if (elapsed < MIN_UPDATE_INTERVAL_MS) {
        const retryIn = Math.ceil((MIN_UPDATE_INTERVAL_MS - elapsed) / 1000)
        return NextResponse.json(
          { error: 'RATE_LIMIT', retryIn },
          { status: 429 }
        )
      }
    }

    const payload = await request.json().catch(() => ({}))

    const gym = await prisma.gym.update({
      where: { id: session.user.gymId },
      data: {
        phone: payload.phone || null,
        lastSettingsUpdateAt: new Date(),
      },
    })

    return NextResponse.json(gym)
  } catch (error) {
    console.error('Gym update failed', error)
    return NextResponse.json({ error: 'Failed to update gym' }, { status: 500 })
  }
}
