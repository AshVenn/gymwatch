const { PrismaClient, UserRole } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

async function ensurePreference(userId, overrides = {}) {
  const payload = {
    theme: overrides.theme ?? 'system',
    locale: overrides.locale ?? 'fr',
    notifications: overrides.notifications ?? true,
    weeklySummary: overrides.weeklySummary ?? true,
    lastChangedAt: new Date(),
  }

  await prisma.userPreference.upsert({
    where: { userId },
    update: payload,
    create: { userId, ...payload },
  })
}

function addDays(baseDate, days) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + days)
  return date
}

function buildAnalyticsSnapshot(baseRevenue = 10000) {
  const months = Array.from({ length: 6 }, (_, idx) => {
    const cursor = new Date()
    cursor.setMonth(cursor.getMonth() - (5 - idx))
    return cursor.toLocaleString('fr-MA', { month: 'short' })
  })

  return {
    revenueTrend: months.map((month, idx) => ({
      month,
      revenue: Math.max(baseRevenue + idx * 450, 0),
    })),
    memberTrend: months.map((month, idx) => ({
      month,
      members: 150 + idx * 12,
    })),
    retentionRate: 0.92,
  }
}

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

async function upsertOwner({ email, password, firstName, lastName, gymId }) {
  const hashed = await hashPassword(password)

  const owner = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: UserRole.GYM_OWNER,
      gymId,
      firstName,
      lastName,
    },
    create: {
      email,
      password: hashed,
      role: UserRole.GYM_OWNER,
      firstName,
      lastName,
      gymId,
    },
  })

  await ensurePreference(owner.id, { theme: 'dark' })
  return owner
}

async function upsertAdmin({ email, password, firstName, lastName, gymId }) {
  const hashed = await hashPassword(password)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: UserRole.GYM_ADMIN,
      gymId,
      firstName,
      lastName,
    },
    create: {
      email,
      password: hashed,
      role: UserRole.GYM_ADMIN,
      firstName,
      lastName,
      gymId,
    },
  })

  await ensurePreference(admin.id)
  return admin
}

async function runSeed() {
  console.log('Seeding GymWatch data...')

  await prisma.$transaction([
    prisma.demoRequest.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.member.deleteMany(),
    prisma.membershipPlan.deleteMany(),
    prisma.userPreference.deleteMany(),
    prisma.user.deleteMany(),
    prisma.gym.deleteMany(),
  ])
  console.log('Database cleared')

  const adminPassword = await hashPassword('Admin123!')
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@gymwatch.com' },
    update: {
      password: adminPassword,
    },
    create: {
      email: 'admin@gymwatch.com',
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
      firstName: 'Admin',
      lastName: 'GymWatch',
    },
  })
  await ensurePreference(superAdmin.id)
  console.log('Created super admin:', superAdmin.email)

  const today = new Date()

  const gym1 = await prisma.gym.upsert({
    where: { id: 'gym-fitzone' },
    update: {
      subscriptionPlan: 'PRO',
      billingInterval: 'MONTHLY',
      subscriptionPrice: 350,
      analyticsSnapshot: buildAnalyticsSnapshot(13500),
      subscriptionStatus: 'ACTIVE',
      subscriptionExpiresAt: addDays(today, 5),
      subscriptionStartedAt: addDays(today, -24),
      subscriptionGracePeriodDays: 3,
      maxAdminAccounts: 5,
      lastSettingsUpdateAt: today,
    },
    create: {
      id: 'gym-fitzone',
      name: 'FitZone Casablanca',
      email: 'contact@fitzone.ma',
      city: 'Casablanca',
      country: 'Maroc',
      subscriptionPlan: 'PRO',
      billingInterval: 'MONTHLY',
      subscriptionPrice: 350,
      subscriptionStatus: 'ACTIVE',
      subscriptionStartedAt: addDays(today, -24),
      subscriptionExpiresAt: addDays(today, 5),
      subscriptionGracePeriodDays: 3,
      maxAdminAccounts: 5,
      lastSettingsUpdateAt: today,
      analyticsSnapshot: buildAnalyticsSnapshot(13500),
    },
  })
  console.log('Created gym 1:', gym1.name)

  const gym2 = await prisma.gym.upsert({
    where: { id: 'gym-powergym' },
    update: {
      subscriptionPlan: 'BASIC',
      billingInterval: 'ANNUAL',
      subscriptionPrice: 2000,
      analyticsSnapshot: buildAnalyticsSnapshot(9800),
      subscriptionStatus: 'SUSPENDED',
      subscriptionExpiresAt: addDays(today, -3),
      subscriptionStartedAt: addDays(today, -300),
      subscriptionGracePeriodDays: 7,
      maxAdminAccounts: 3,
      lastSettingsUpdateAt: today,
    },
    create: {
      id: 'gym-powergym',
      name: 'PowerGym Rabat',
      email: 'contact@powergym.ma',
      city: 'Rabat',
      country: 'Maroc',
      subscriptionPlan: 'BASIC',
      billingInterval: 'ANNUAL',
      subscriptionPrice: 2000,
      subscriptionStatus: 'SUSPENDED',
      subscriptionStartedAt: addDays(today, -300),
      subscriptionExpiresAt: addDays(today, -3),
      subscriptionGracePeriodDays: 7,
      maxAdminAccounts: 3,
      lastSettingsUpdateAt: today,
      analyticsSnapshot: buildAnalyticsSnapshot(9800),
    },
  })
  console.log('Created gym 2:', gym2.name)

  const demoGym = await prisma.gym.upsert({
    where: { id: 'gym-demo' },
    update: {
      subscriptionPlan: 'BASIC',
      billingInterval: 'MONTHLY',
      subscriptionPrice: 0,
      subscriptionStatus: 'ACTIVE',
      subscriptionExpiresAt: addDays(today, 10),
      demoEndsAt: addDays(today, 15),
      isDemo: true,
      subscriptionGracePeriodDays: 3,
      maxAdminAccounts: 2,
      lastSettingsUpdateAt: today,
    },
    create: {
      id: 'gym-demo',
      name: 'Demo Club',
      email: 'demo@gymwatch.ma',
      city: 'Marrakech',
      country: 'Maroc',
      subscriptionPlan: 'BASIC',
      billingInterval: 'MONTHLY',
      subscriptionPrice: 0,
      subscriptionStatus: 'ACTIVE',
      subscriptionStartedAt: today,
      subscriptionExpiresAt: addDays(today, 10),
      demoEndsAt: addDays(today, 15),
      isDemo: true,
      subscriptionGracePeriodDays: 3,
      maxAdminAccounts: 2,
      lastSettingsUpdateAt: today,
      analyticsSnapshot: buildAnalyticsSnapshot(5000),
    },
  })
  console.log('Created demo gym:', demoGym.name)

  const fitZoneOwner = await upsertOwner({
    email: 'owner@fitzone.ma',
    password: 'Owner123!',
    firstName: 'Sanae',
    lastName: 'Belkadi',
    gymId: gym1.id,
  })
  await prisma.gym.update({ where: { id: gym1.id }, data: { ownerId: fitZoneOwner.id } })

  const powerGymOwner = await upsertOwner({
    email: 'owner@powergym.ma',
    password: 'Owner123!',
    firstName: 'Yassine',
    lastName: 'Haddad',
    gymId: gym2.id,
  })
  await prisma.gym.update({ where: { id: gym2.id }, data: { ownerId: powerGymOwner.id } })

  const demoGymOwner = await upsertOwner({
    email: 'owner@demo.gymwatch.ma',
    password: 'Owner123!',
    firstName: 'Demo',
    lastName: 'Owner',
    gymId: demoGym.id,
  })
  await prisma.gym.update({ where: { id: demoGym.id }, data: { ownerId: demoGymOwner.id } })

  const fitZoneAdmins = await Promise.all([
    upsertAdmin({
      email: 'admin@fitzone.ma',
      password: 'Password123!',
      firstName: 'Manager',
      lastName: 'FitZone',
      gymId: gym1.id,
    }),
    upsertAdmin({
      email: 'coach@fitzone.ma',
      password: 'Password123!',
      firstName: 'Coach',
      lastName: 'Casablanca',
      gymId: gym1.id,
    }),
  ])
  console.log('Created gym1 admins:', fitZoneAdmins.map((a) => a.email).join(', '))

  const powerGymAdmins = await Promise.all([
    upsertAdmin({
      email: 'admin@powergym.ma',
      password: 'Password123!',
      firstName: 'Manager',
      lastName: 'PowerGym',
      gymId: gym2.id,
    }),
    upsertAdmin({
      email: 'coach@powergym.ma',
      password: 'Password123!',
      firstName: 'Coach',
      lastName: 'Rabat',
      gymId: gym2.id,
    }),
  ])
  console.log('Created gym2 admins:', powerGymAdmins.map((a) => a.email).join(', '))

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
  ])
  console.log('Created membership plans for Gym 1')

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

  const plansDemo = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${demoGym.id}-monthly` },
      update: {},
      create: {
        id: `plan-${demoGym.id}-monthly`,
        gymId: demoGym.id,
        name: 'Essai 30j',
        durationDays: 30,
        price: 0,
        isActive: true,
      },
    }),
  ])
  console.log('Created membership plan for Demo gym')

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

  await createSubscriptions(members1, gym1, plans1)
  await createSubscriptions(members2, gym2, plans2, 5)
  console.log('?? Created subscriptions and payments')

  await prisma.demoRequest.createMany({
    data: [
      {
        gymName: 'Atlas Fitness',
        gymEmail: 'atlas@demo.ma',
        adminEmail: 'contact@atlas.ma',
        adminFirstName: 'Imane',
        adminLastName: 'Bennani',
        phone: '+212611112233',
        city: 'Marrakech',
        country: 'Maroc',
        plan: 'PRO',
        message: 'Reseau de 2 salles en preparation.',
        status: 'PENDING',
      },
      {
        gymName: 'ZenFit',
        gymEmail: 'zenfit@demo.ma',
        adminEmail: 'hello@zenfit.ma',
        adminFirstName: 'Younes',
        adminLastName: 'Khalil',
        phone: '+212622334455',
        city: 'Agadir',
        country: 'Maroc',
        plan: 'BASIC',
        status: 'RESOLVED',
        resolvedAt: today,
        resolvedById: superAdmin.id,
        createdGymId: demoGym.id,
        resolutionNote: 'Compte demo et acces envoyes',
      },
    ],
  })
  console.log('Created demo requests')

  return {
    gymsSeeded: 3,
    membersSeeded: members1.length + members2.length,
  }
}

module.exports = { runSeed }

if (require.main === module) {
  runSeed()
    .then(async () => {
      await prisma.$disconnect()
    })
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
