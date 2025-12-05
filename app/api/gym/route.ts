import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { getSystemSettings } from '@/lib/settings'

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

    const systemSettings = await getSystemSettings()
    const minInterval = systemSettings.gymSettingsIntervalMs ?? 60_000

    if (gymRecord.lastSettingsUpdateAt) {
      const elapsed = Date.now() - gymRecord.lastSettingsUpdateAt.getTime()
      if (elapsed < minInterval) {
        const retryIn = Math.ceil((minInterval - elapsed) / 1000)
        return NextResponse.json(
          { error: 'RATE_LIMIT', retryIn },
          { status: 429 }
        )
      }
    }

    const payload = await request.json().catch(() => ({}))
    const hasSessionLimit = Object.prototype.hasOwnProperty.call(payload, 'maxSessionMinutes')
    let maxSessionMinutes: number | undefined

    if (hasSessionLimit) {
      const parsedLimit = Number(payload.maxSessionMinutes)
      if (!Number.isFinite(parsedLimit) || parsedLimit < 30 || parsedLimit > 720) {
        return NextResponse.json({ error: 'Durée max invalide (30-720 minutes)' }, { status: 400 })
      }
      maxSessionMinutes = Math.round(parsedLimit)
    }

    const gym = await prisma.gym.update({
      where: { id: session.user.gymId },
      data: {
        phone: payload.phone || null,
        ...(hasSessionLimit ? { maxSessionMinutes } : {}),
        lastSettingsUpdateAt: new Date(),
      },
    })

    return NextResponse.json(gym)
  } catch (error) {
    console.error('Gym update failed', error)
    return NextResponse.json({ error: 'Failed to update gym' }, { status: 500 })
  }
}
