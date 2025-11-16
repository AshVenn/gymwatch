// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// small helper for dates
function getDates(durationDays, type, extraOffset = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  const end = new Date(today)

  if (type === 'ACTIVE') {
    start.setDate(start.getDate() - (10 + extraOffset))
    end.setDate(end.getDate() + (20 - extraOffset))
  } else if (type === 'EXPIRES_TODAY') {
    start.setDate(start.getDate() - durationDays)
    // end stays today
  } else {
    start.setDate(start.getDate() - durationDays - (5 + extraOffset))
    end.setDate(end.getDate() - (5 + extraOffset))
  }

  return { start, end }
}

async function createSubscriptions(members, gym, plans, extraOffset = 0) {
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    const plan = plans[i % plans.length]

    const type = i === 0 ? 'ACTIVE' : i === 1 ? 'EXPIRES_TODAY' : 'EXPIRED'
    const { start, end } = getDates(plan.durationDays, type, extraOffset)

    const sub = await prisma.subscription.create({
      data: {
        memberId: member.id,
        gymId: gym.id,
        planId: plan.id,
        startDate: start,
        endDate: end,
        pricePaid: plan.price,
        status: type,
      },
    })

    await prisma.payment.create({
      data: {
        gymId: gym.id,
        amount: plan.price,
        currency: 'MAD',
        paymentDate: start,
        subscriptions: {
          connect: { id: sub.id },
        },
      },
    })
  }
}

async function main() {
  // 1. SUPER_ADMIN
  const adminPassword = await hashPassword('Admin123!')
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@gymwatch.com' },
    update: {},
    create: {
      email: 'admin@gymwatch.com',
      password: adminPassword,
      role: 'SUPER_ADMIN',
      firstName: 'Admin',
      lastName: 'GymWatch',
    },
  })
  console.log('Created super admin:', superAdmin.email)

  // 2. Gyms
  const gym1 = await prisma.gym.upsert({
    where: { id: 'gym-fitzone' },
    update: {},
    create: {
      id: 'gym-fitzone',
      name: 'FitZone Casablanca',
      email: 'contact@fitzone.ma',
      city: 'Casablanca',
      country: 'Maroc',
      subscriptionPlan: 'MONTHLY',
      subscriptionStatus: 'ACTIVE',
    },
  })
  console.log('Created gym 1:', gym1.name)

  const gym2 = await prisma.gym.upsert({
    where: { id: 'gym-powergym' },
    update: {},
    create: {
      id: 'gym-powergym',
      name: 'PowerGym Rabat',
      email: 'contact@powergym.ma',
      city: 'Rabat',
      country: 'Maroc',
      subscriptionPlan: 'YEARLY',
      subscriptionStatus: 'ACTIVE',
    },
  })
  console.log('Created gym 2:', gym2.name)

  // 3. Gym admins
  const fitZoneAdminPassword = await hashPassword('Password123!')
  const fitZoneAdmin = await prisma.user.upsert({
    where: { email: 'admin@fitzone.ma' },
    update: {},
    create: {
      email: 'admin@fitzone.ma',
      password: fitZoneAdminPassword,
      role: 'GYM_ADMIN',
      firstName: 'Manager',
      lastName: 'FitZone',
      gymId: gym1.id,
    },
  })
  console.log('Created gym1 admin:', fitZoneAdmin.email)

  const powerGymAdminPassword = await hashPassword('Password123!')
  const powerGymAdmin = await prisma.user.upsert({
    where: { email: 'admin@powergym.ma' },
    update: {},
    create: {
      email: 'admin@powergym.ma',
      password: powerGymAdminPassword,
      role: 'GYM_ADMIN',
      firstName: 'Manager',
      lastName: 'PowerGym',
      gymId: gym2.id,
    },
  })
  console.log('Created gym2 admin:', powerGymAdmin.email)

  // 4. Plans Gym 1
  const plans1 = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym1.id}-monthly` },
      update: {},
      create: {
        id: `plan-${gym1.id}-monthly`,
        gymId: gym1.id,
        name: 'Mensuel',
        durationDays: 30,
        price: 300,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym1.id}-quarterly` },
      update: {},
      create: {
        id: `plan-${gym1.id}-quarterly`,
        gymId: gym1.id,
        name: 'Trimestriel',
        durationDays: 90,
        price: 800,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym1.id}-annual` },
      update: {},
      create: {
        id: `plan-${gym1.id}-annual`,
        gymId: gym1.id,
        name: 'Annuel',
        durationDays: 365,
        price: 2500,
        isActive: true,
      },
    }),
  ])
  console.log('Created membership plans for Gym 1')

  // 5. Plans Gym 2
  const plans2 = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym2.id}-monthly` },
      update: {},
      create: {
        id: `plan-${gym2.id}-monthly`,
        gymId: gym2.id,
        name: 'Mensuel',
        durationDays: 30,
        price: 350,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym2.id}-quarterly` },
      update: {},
      create: {
        id: `plan-${gym2.id}-quarterly`,
        gymId: gym2.id,
        name: 'Trimestriel',
        durationDays: 90,
        price: 900,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym2.id}-annual` },
      update: {},
      create: {
        id: `plan-${gym2.id}-annual`,
        gymId: gym2.id,
        name: 'Annuel',
        durationDays: 365,
        price: 3000,
        isActive: true,
      },
    }),
  ])
  console.log('Created membership plans for Gym 2')

  // 6. Members Gym 1
  const members1 = await Promise.all([
    prisma.member.create({
      data: {
        gymId: gym1.id,
        firstName: 'Ahmed',
        lastName: 'Morocco',
        email: 'ahmed@example.com',
        phone: '+212600000001',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        firstName: 'Fatima',
        lastName: 'Hassan',
        email: 'fatima@example.com',
        phone: '+212600000002',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        firstName: 'Mohammed',
        lastName: 'Ali',
        email: 'mohammed@example.com',
        phone: '+212600000003',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        firstName: 'Youssef',
        lastName: 'Karim',
        email: 'youssef@example.com',
        phone: '+212600000004',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        firstName: 'Layla',
        lastName: 'Ibrahim',
        email: 'layla@example.com',
        phone: '+212600000005',
      },
    }),
  ])
  console.log('Created members for Gym 1')

  // 7. Members Gym 2
  const members2 = await Promise.all([
    prisma.member.create({
      data: {
        gymId: gym2.id,
        firstName: 'Hassan',
        lastName: 'Rashid',
        email: 'hassan@example.com',
        phone: '+212600000006',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        firstName: 'Noor',
        lastName: 'Said',
        email: 'noor@example.com',
        phone: '+212600000007',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        firstName: 'Zainab',
        lastName: 'Malik',
        email: 'zainab@example.com',
        phone: '+212600000008',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        firstName: 'Omar',
        lastName: 'Farhan',
        email: 'omar@example.com',
        phone: '+212600000009',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        firstName: 'Sara',
        lastName: 'Walid',
        email: 'sara@example.com',
        phone: '+212600000010',
      },
    }),
  ])
  console.log('Created members for Gym 2')

  // 8. Subscriptions + payments
  await createSubscriptions(members1, gym1, plans1)
  await createSubscriptions(members2, gym2, plans2, 5)

  console.log('✅ Created subscriptions and payments')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
