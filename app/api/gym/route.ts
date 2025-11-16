import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gym = await db.getGymById(session.user.gymId as string)

    if (!gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
    }

    return NextResponse.json(gym)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch gym' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, phone, address, city, country } = await request.json()

    const gym = await db.updateGym(session.user.gymId as string, {
      name,
      email,
      phone: phone || null,
      address: address || null,
      city: city || null,
      country: country || null,
    })

    return NextResponse.json(gym)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update gym' }, { status: 500 })
  }
}
