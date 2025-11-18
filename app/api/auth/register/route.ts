import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolvePlanPrice } from '@/lib/subscription-plans'

function addDays(base: Date, days: number) {
  const copy = new Date(base)
  copy.setDate(copy.getDate() + days)
  return copy
}

export async function POST(request: NextRequest) {
  try {
    const { gymName, gymEmail, adminEmail, adminPassword } = await request.json()

    const existingGym = await db.findGymByEmail(gymEmail)
    if (existingGym) {
      return NextResponse.json(
        { error: 'Cette salle de sport est déjà enregistrée' },
        { status: 400 }
      )
    }

    const existingUser = await db.findUserByEmail(adminEmail)
    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(adminPassword)

    const { gym, owner } = await prisma.$transaction(async (tx) => {
      const subscriptionPlan = 'BASIC'
      const billingInterval = 'MONTHLY'
      const createdGym = await tx.gym.create({
        data: {
          name: gymName,
          email: gymEmail,
          subscriptionPlan,
          billingInterval,
          subscriptionPrice: resolvePlanPrice(subscriptionPlan, billingInterval),
          subscriptionStatus: 'ACTIVE',
          subscriptionStartedAt: new Date(),
          subscriptionExpiresAt: addDays(new Date(), 30),
          subscriptionGracePeriodDays: 5,
          maxAdminAccounts: 3,
          lastSettingsUpdateAt: new Date(),
        },
      })

      const createdOwner = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'GYM_OWNER',
          firstName: 'Propriétaire',
          lastName: gymName,
          gymId: createdGym.id,
        },
      })

      await tx.userPreference.create({
        data: { userId: createdOwner.id },
      })

      await tx.gym.update({
        where: { id: createdGym.id },
        data: { ownerId: createdOwner.id },
      })

      return { gym: createdGym, owner: createdOwner }
    })

    return NextResponse.json(
      { message: 'Salle de sport créée avec succès', gym, owner },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'enregistrement" },
      { status: 500 }
    )
  }
}
