import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSystemSettings } from '@/lib/settings'
import { requireSession } from '@/lib/auth/guards'

const THEMES = ['light', 'dark', 'system']

export async function GET() {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const userEmail = sessionResult.session.user?.email
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
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
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const userEmail = sessionResult.session.user?.email
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, preferences: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const systemSettings = await getSystemSettings()
    const minInterval = systemSettings.userSettingsIntervalMs ?? 30_000

    if (user.preferences?.lastChangedAt) {
      const elapsed = Date.now() - user.preferences.lastChangedAt.getTime()
      if (elapsed < minInterval) {
        const retryIn = Math.ceil((minInterval - elapsed) / 1000)
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
