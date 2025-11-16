import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { gymName, gymEmail, adminEmail, adminPassword } = await request.json()

    // Check if gym email already exists
    const existingGym = await db.findGymByEmail(gymEmail)

    if (existingGym) {
      return NextResponse.json(
        { error: 'Cette salle de sport est déjà enregistrée' },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingUser = await db.findUserByEmail(adminEmail)

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Create gym
    const gym = await db.createGym({
      name: gymName,
      email: gymEmail,
    })

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword)
    const user = await db.createUser({
      email: adminEmail,
      password: hashedPassword,
      role: 'GYM_ADMIN',
      firstName: 'Admin',
      lastName: gymName,
      gymId: gym.id,
    })

    return NextResponse.json(
      { message: 'Salle de sport créée avec succès', gym, user },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'enregistrement' },
      { status: 500 }
    )
  }
}
