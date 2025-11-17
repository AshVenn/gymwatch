import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

const MIN_INTERVAL_MS = Number(process.env.USER_SETTINGS_INTERVAL_MS ?? 30_000)
const THEMES = ['light', 'dark', 'system']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, preferences: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.preferences) {
      const prefs = await prisma.userPreference.create({
        data: { userId: user.id },
      })
      return NextResponse.json(prefs)
    }

    return NextResponse.json(user.preferences)
  } catch (error) {
    console.error('User settings fetch failed', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, preferences: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.preferences?.lastChangedAt) {
      const elapsed = Date.now() - user.preferences.lastChangedAt.getTime()
      if (elapsed < MIN_INTERVAL_MS) {
        const retryIn = Math.ceil((MIN_INTERVAL_MS - elapsed) / 1000)
        return NextResponse.json({ error: 'RATE_LIMIT', retryIn }, { status: 429 })
      }
    }

    const body = await request.json()
    const theme = THEMES.includes(body.theme) ? body.theme : 'system'

    const prefs = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        theme,
        locale: body.locale || 'fr',
        notifications: Boolean(body.notifications),
        weeklySummary: Boolean(body.weeklySummary),
        lastChangedAt: new Date(),
      },
      create: {
        userId: user.id,
        theme,
        locale: body.locale || 'fr',
        notifications: Boolean(body.notifications),
        weeklySummary: Boolean(body.weeklySummary),
      },
    })

    return NextResponse.json(prefs)
  } catch (error) {
    console.error('User settings update failed', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
