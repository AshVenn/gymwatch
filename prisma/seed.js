const { PrismaClient, UserRole, AccessEventStatus, AccessEventSource } = require('@prisma/client')
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

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function buildVisitDate(baseDate, dayOffset, hour = 9, minute = 0) {
  const day = startOfDay(addDays(baseDate, dayOffset))
  day.setHours(hour, minute, 0, 0)
  return day
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

  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  return { start, end }
}

function computeSeedStatus(endDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  if (end.getTime() < today.getTime()) return 'EXPIRED'
  if (end.getTime() === today.getTime()) return 'EXPIRES_TODAY'
  return 'ACTIVE'
}

function slugifyVariant(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'principal'
}

async function createVariantsForGym(gymId, names) {
  const variants = []
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const variant = await prisma.gymVariant.create({
      data: {
        gymId,
        name,
        slug: slugifyVariant(name),
        isDefault: i === 0,
      },
    })
    variants.push(variant)
  }
  return variants
}

async function createSubscriptions(members, gym, plans, extraOffset = 0) {
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    const plan = plans[i % plans.length]

    const type = i === 0 ? 'ACTIVE' : i === 1 ? 'EXPIRES_TODAY' : 'EXPIRED'
    const { start, end } = getDates(plan.durationDays, type, extraOffset)
    const status = computeSeedStatus(end)

    const sub = await prisma.subscription.create({
      data: {
        memberId: member.id,
        gymId: gym.id,
        gymVariantId: plan.gymVariantId,
        planId: plan.id,
        startDate: start,
        endDate: end,
        pricePaid: plan.price,
        status,
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

async function seedVisitsForGym(gym, visitConfigs) {
  const today = startOfDay(new Date())
  const lastVisitByMember = new Map()

  for (const config of visitConfigs) {
    const checkIn = buildVisitDate(today, config.dayOffset ?? 0, config.hour ?? 9, config.minute ?? 0)
    const durationMinutes = config.durationMinutes ?? 75
    const checkOut =
      config.checkout === false ? null : new Date(checkIn.getTime() + durationMinutes * 60 * 1000)

    const created = await prisma.visit.create({
      data: {
        gymId: gym.id,
        memberId: config.member.id,
        gymVariantId: config.member.gymVariantId,
        checkIn,
        checkOut,
      },
    })

    const prev = lastVisitByMember.get(config.member.id)
    if (!prev || prev.getTime() < created.checkIn.getTime()) {
      lastVisitByMember.set(config.member.id, created.checkIn)
    }
  }

  for (const [memberId, lastVisitAt] of lastVisitByMember.entries()) {
    await prisma.member.update({
      where: { id: memberId },
      data: { lastVisitedAt: lastVisitAt },
    })
  }

  const todayVisits = await prisma.visit.count({
    where: {
      gymId: gym.id,
      checkIn: { gte: today, lt: addDays(today, 1) },
    },
  })

  await prisma.gym.update({
    where: { id: gym.id },
    data: {
      todayVisitorCount: todayVisits,
      todayVisitorDate: today,
    },
  })
}

async function upsertOwner({ email, password, firstName, lastName, gymId, gymVariantId }) {
  const hashed = await hashPassword(password)

  const owner = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: UserRole.GYM_OWNER,
      gymId,
      firstName,
      lastName,
      gymVariantId: gymVariantId ?? null,
    },
    create: {
      email,
      password: hashed,
      role: UserRole.GYM_OWNER,
      firstName,
      lastName,
      gymId,
      gymVariantId: gymVariantId ?? null,
    },
  })

  await ensurePreference(owner.id, { theme: 'dark' })
  return owner
}

async function upsertAdmin({ email, password, firstName, lastName, gymId, gymVariantId }) {
  const hashed = await hashPassword(password)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: UserRole.GYM_ADMIN,
      gymId,
      firstName,
      lastName,
      gymVariantId: gymVariantId ?? null,
    },
    create: {
      email,
      password: hashed,
      role: UserRole.GYM_ADMIN,
      firstName,
      lastName,
      gymId,
      gymVariantId: gymVariantId ?? null,
    },
  })

  await ensurePreference(admin.id)
  return admin
}

async function runSeed() {
  console.log('Seeding GymWatch data...')

  await prisma.$transaction([
    prisma.systemSettings.deleteMany(),
    prisma.demoRequest.deleteMany(),
    prisma.accessEvent.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.member.deleteMany(),
    prisma.membershipPlan.deleteMany(),
    prisma.userPreference.deleteMany(),
    prisma.user.deleteMany(),
    prisma.gym.deleteMany(),
  ])
  console.log('Database cleared')

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      supportEmail: 'support@gymwatch.ma',
      supportPhone: '+212600000000',
      brandColor: '#5b4bff',
      expiryReminder: true,
      weeklyDigest: true,
      incidentAlerts: true,
      payoutReport: false,
      gymSettingsIntervalMs: 60000,
      userSettingsIntervalMs: 30000,
      accessLogRetentionDays: 90,
      lastPurgeAt: null,
    },
  })
  console.log('System settings initialized')

  await prisma.planSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      basicMonthlyPrice: 200,
      proMonthlyPrice: 350,
      enterpriseMonthlyPrice: 520,
      annualDiscountPercent: 15,
      basicPlanLimitPerVariant: 3,
      basicPlanLimitPerNetwork: 3,
      proPlanLimitPerVariant: 6,
      proPlanLimitPerNetwork: 10,
      enterprisePlanLimitPerVariant: -1,
      enterprisePlanLimitPerNetwork: -1,
    },
  })
  console.log('Plan settings initialized')

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
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

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
      maxSessionMinutes: 180,
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
      maxSessionMinutes: 180,
      maxAdminAccounts: 5,
      lastSettingsUpdateAt: today,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(13500),
    },
  })
  console.log('Created gym 1:', gym1.name)
  const gym1Variants = await createVariantsForGym(gym1.id, ['Principal'])
  const gym1DefaultVariant = gym1Variants[0]

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
      maxSessionMinutes: 180,
      maxAdminAccounts: 3,
      lastSettingsUpdateAt: today,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
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
      maxSessionMinutes: 180,
      maxAdminAccounts: 3,
      lastSettingsUpdateAt: today,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(9800),
    },
  })
  console.log('Created gym 2:', gym2.name)
  const gym2Variants = await createVariantsForGym(gym2.id, ['Femmes', 'Hommes'])
  const gym2DefaultVariant = gym2Variants[0]

  const enterpriseGym = await prisma.gym.upsert({
    where: { id: 'gym-enterprise' },
    update: {
      subscriptionPlan: 'ENTERPRISE',
      billingInterval: 'MONTHLY',
      subscriptionPrice: 520,
      subscriptionStatus: 'ACTIVE',
      subscriptionStartedAt: addDays(today, -45),
      subscriptionExpiresAt: addDays(today, 25),
      subscriptionGracePeriodDays: 5,
      maxSessionMinutes: 180,
      maxAdminAccounts: 10,
      lastSettingsUpdateAt: today,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(18500),
    },
    create: {
      id: 'gym-enterprise',
      name: 'Enterprise Network',
      email: 'contact@enterprise.ma',
      city: 'Tanger',
      country: 'Maroc',
      subscriptionPlan: 'ENTERPRISE',
      billingInterval: 'MONTHLY',
      subscriptionPrice: 520,
      subscriptionStatus: 'ACTIVE',
      subscriptionStartedAt: addDays(today, -45),
      subscriptionExpiresAt: addDays(today, 25),
      subscriptionGracePeriodDays: 5,
      maxSessionMinutes: 180,
      maxAdminAccounts: 10,
      lastSettingsUpdateAt: today,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(18500),
    },
  })
  console.log('Created Enterprise gym:', enterpriseGym.name)
  const enterpriseVariants = await createVariantsForGym(enterpriseGym.id, ['Centre', 'Nord', 'Sud'])
  const enterpriseDefaultVariant = enterpriseVariants[0]

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
      maxSessionMinutes: 180,
      maxAdminAccounts: 2,
      lastSettingsUpdateAt: today,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
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
      maxSessionMinutes: 180,
      maxAdminAccounts: 2,
      lastSettingsUpdateAt: today,
      analyticsSnapshot: buildAnalyticsSnapshot(5000),
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
    },
  })
  console.log('Created demo gym:', demoGym.name)
  const demoVariants = await createVariantsForGym(demoGym.id, ['Downtown', 'Uptown', 'Cardio'])
  const demoDefaultVariant = demoVariants[0]

  const fitZoneOwner = await upsertOwner({
    email: 'owner@fitzone.ma',
    password: 'Owner123!',
    firstName: 'Sanae',
    lastName: 'Belkadi',
    gymId: gym1.id,
    gymVariantId: gym1DefaultVariant.id,
  })
  await prisma.gym.update({ where: { id: gym1.id }, data: { ownerId: fitZoneOwner.id } })

  const powerGymOwner = await upsertOwner({
    email: 'owner@powergym.ma',
    password: 'Owner123!',
    firstName: 'Yassine',
    lastName: 'Haddad',
    gymId: gym2.id,
    gymVariantId: gym2DefaultVariant.id,
  })
  await prisma.gym.update({ where: { id: gym2.id }, data: { ownerId: powerGymOwner.id } })

  const demoGymOwner = await upsertOwner({
    email: 'owner@demo.gymwatch.ma',
    password: 'Owner123!',
    firstName: 'Demo',
    lastName: 'Owner',
    gymId: demoGym.id,
    gymVariantId: demoDefaultVariant.id,
  })
  await prisma.gym.update({ where: { id: demoGym.id }, data: { ownerId: demoGymOwner.id } })

  const fitZoneAdmins = await Promise.all([
    upsertAdmin({
      email: 'admin@fitzone.ma',
      password: 'Password123!',
      firstName: 'Manager',
      lastName: 'FitZone',
      gymId: gym1.id,
      gymVariantId: gym1DefaultVariant.id,
    }),
    upsertAdmin({
      email: 'coach@fitzone.ma',
      password: 'Password123!',
      firstName: 'Coach',
      lastName: 'Casablanca',
      gymId: gym1.id,
      gymVariantId: gym1DefaultVariant.id,
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
      gymVariantId: gym2Variants[0].id,
    }),
    upsertAdmin({
      email: 'coach@powergym.ma',
      password: 'Password123!',
      firstName: 'Coach',
      lastName: 'Rabat',
      gymId: gym2.id,
      gymVariantId: gym2Variants[1].id,
    }),
  ])
  console.log('Created gym2 admins:', powerGymAdmins.map((a) => a.email).join(', '))

  const enterpriseOwner = await upsertOwner({
    email: 'owner@enterprise.ma',
    password: 'Owner123!',
    firstName: 'Kenza',
    lastName: 'El Idrissi',
    gymId: enterpriseGym.id,
    gymVariantId: enterpriseDefaultVariant.id,
  })
  await prisma.gym.update({ where: { id: enterpriseGym.id }, data: { ownerId: enterpriseOwner.id } })

  const enterpriseAdmins = await Promise.all([
    upsertAdmin({
      email: 'admin@enterprise.ma',
      password: 'Password123!',
      firstName: 'Youssef',
      lastName: 'Nord',
      gymId: enterpriseGym.id,
      gymVariantId: enterpriseVariants[1].id,
    }),
    upsertAdmin({
      email: 'coach@enterprise.ma',
      password: 'Password123!',
      firstName: 'Imane',
      lastName: 'Sud',
      gymId: enterpriseGym.id,
      gymVariantId: enterpriseVariants[2].id,
    }),
  ])
  console.log('Created Enterprise gym admins:', enterpriseAdmins.map((a) => a.email).join(', '))

  const plans1 = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym1.id}-monthly` },
      update: {},
      create: {
        id: `plan-${gym1.id}-monthly`,
        gymId: gym1.id,
        gymVariantId: gym1DefaultVariant.id,
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
        gymVariantId: gym1DefaultVariant.id,
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
        gymVariantId: gym2Variants[0].id,
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
        gymVariantId: gym2Variants[1].id,
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
        gymVariantId: demoDefaultVariant.id,
        name: 'Essai 30j',
        durationDays: 30,
        price: 0,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${demoGym.id}-uptown` },
      update: {},
      create: {
        id: `plan-${demoGym.id}-uptown`,
        gymId: demoGym.id,
        gymVariantId: demoVariants[1].id,
        name: 'Mensuel Uptown',
        durationDays: 30,
        price: 120,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${demoGym.id}-cardio` },
      update: {},
      create: {
        id: `plan-${demoGym.id}-cardio`,
        gymId: demoGym.id,
        gymVariantId: demoVariants[2].id,
        name: 'Cardio illimité',
        durationDays: 45,
        price: 200,
        isActive: true,
      },
    }),
  ])
  console.log('Created membership plan for Demo gym')

  const enterprisePlans = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${enterpriseGym.id}-centre` },
      update: {},
      create: {
        id: `plan-${enterpriseGym.id}-centre`,
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[0].id,
        name: 'Centre Premium',
        durationDays: 30,
        price: 450,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${enterpriseGym.id}-nord` },
      update: {},
      create: {
        id: `plan-${enterpriseGym.id}-nord`,
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[1].id,
        name: 'Nord Annual',
        durationDays: 365,
        price: 4800,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${enterpriseGym.id}-sud` },
      update: {},
      create: {
        id: `plan-${enterpriseGym.id}-sud`,
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[2].id,
        name: 'Sud Family',
        durationDays: 90,
        price: 1100,
        isActive: true,
      },
    }),
  ])
  console.log('Created membership plans for Enterprise gym')

  const members1 = await Promise.all([
    prisma.member.create({
      data: {
        gymId: gym1.id,
        gymVariantId: gym1DefaultVariant.id,
        firstName: 'Ahmed',
        lastName: 'Morocco',
        email: 'ahmed@example.com',
        phone: '+212600000001',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        gymVariantId: gym1DefaultVariant.id,
        firstName: 'Fatima',
        lastName: 'Hassan',
        email: 'fatima@example.com',
        phone: '+212600000002',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        gymVariantId: gym1DefaultVariant.id,
        firstName: 'Mohammed',
        lastName: 'Ali',
        email: 'mohammed@example.com',
        phone: '+212600000003',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        gymVariantId: gym1DefaultVariant.id,
        firstName: 'Youssef',
        lastName: 'Karim',
        email: 'youssef@example.com',
        phone: '+212600000004',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym1.id,
        gymVariantId: gym1DefaultVariant.id,
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
        gymVariantId: gym2Variants[0].id,
        firstName: 'Hassan',
        lastName: 'Rashid',
        email: 'hassan@example.com',
        phone: '+212600000006',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        gymVariantId: gym2Variants[0].id,
        firstName: 'Noor',
        lastName: 'Said',
        email: 'noor@example.com',
        phone: '+212600000007',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        gymVariantId: gym2Variants[0].id,
        firstName: 'Zainab',
        lastName: 'Malik',
        email: 'zainab@example.com',
        phone: '+212600000008',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        gymVariantId: gym2Variants[1].id,
        firstName: 'Omar',
        lastName: 'Farhan',
        email: 'omar@example.com',
        phone: '+212600000009',
      },
    }),
    prisma.member.create({
      data: {
        gymId: gym2.id,
        gymVariantId: gym2Variants[1].id,
        firstName: 'Sara',
        lastName: 'Walid',
        email: 'sara@example.com',
        phone: '+212600000010',
      },
    }),
  ])
  console.log('Created members for Gym 2')

  const enterpriseMembers = await Promise.all([
    prisma.member.create({
      data: {
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[0].id,
        firstName: 'Amine',
        lastName: 'Centre',
        email: 'amine.centre@example.com',
        phone: '+212600000015',
      },
    }),
    prisma.member.create({
      data: {
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[0].id,
        firstName: 'Ikram',
        lastName: 'Premium',
        email: 'ikram.premium@example.com',
        phone: '+212600000016',
      },
    }),
    prisma.member.create({
      data: {
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[1].id,
        firstName: 'Rachid',
        lastName: 'Nord',
        email: 'rachid.nord@example.com',
        phone: '+212600000017',
      },
    }),
    prisma.member.create({
      data: {
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[1].id,
        firstName: 'Soumia',
        lastName: 'Nord',
        email: 'soumia.nord@example.com',
        phone: '+212600000018',
      },
    }),
    prisma.member.create({
      data: {
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[2].id,
        firstName: 'Nizar',
        lastName: 'Sud',
        email: 'nizar.sud@example.com',
        phone: '+212600000019',
      },
    }),
    prisma.member.create({
      data: {
        gymId: enterpriseGym.id,
        gymVariantId: enterpriseVariants[2].id,
        firstName: 'Dounia',
        lastName: 'Family',
        email: 'dounia.family@example.com',
        phone: '+212600000020',
      },
    }),
  ])
  console.log('Created members for Enterprise gym')

  const membersDemo = await Promise.all([
    prisma.member.create({
      data: {
        gymId: demoGym.id,
        gymVariantId: demoVariants[0].id,
        firstName: 'Lina',
        lastName: 'North',
        email: 'lina.north@example.com',
        phone: '+212600000011',
      },
    }),
    prisma.member.create({
      data: {
        gymId: demoGym.id,
        gymVariantId: demoVariants[1].id,
        firstName: 'Karim',
        lastName: 'East',
        email: 'karim.east@example.com',
        phone: '+212600000012',
      },
    }),
    prisma.member.create({
      data: {
        gymId: demoGym.id,
        gymVariantId: demoVariants[2].id,
        firstName: 'Meryem',
        lastName: 'Cardio',
        email: 'meryem.cardio@example.com',
        phone: '+212600000013',
      },
    }),
    prisma.member.create({
      data: {
        gymId: demoGym.id,
        gymVariantId: demoVariants[2].id,
        firstName: 'Salma',
        lastName: 'Atlas',
        email: 'salma.atlas@example.com',
        phone: '+212600000014',
      },
    }),
  ])
  console.log('Created members for Demo gym')

  await createSubscriptions(members1, gym1, plans1)
  const members2VariantA = members2.slice(0, 3)
  const members2VariantB = members2.slice(3)
  await createSubscriptions(members2VariantA, gym2, [plans2[0]], 5)
  await createSubscriptions(members2VariantB, gym2, [plans2[1]], 8)
  const enterpriseMembersA = enterpriseMembers.filter((m) => m.gymVariantId === enterpriseVariants[0].id)
  const enterpriseMembersB = enterpriseMembers.filter((m) => m.gymVariantId === enterpriseVariants[1].id)
  const enterpriseMembersC = enterpriseMembers.filter((m) => m.gymVariantId === enterpriseVariants[2].id)
  await createSubscriptions(enterpriseMembersA, enterpriseGym, [enterprisePlans[0]])
  await createSubscriptions(enterpriseMembersB, enterpriseGym, [enterprisePlans[1]], 3)
  await createSubscriptions(enterpriseMembersC, enterpriseGym, [enterprisePlans[2]], 6)
  const demoVariantMembersA = membersDemo.filter((m) => m.gymVariantId === demoVariants[0].id)
  const demoVariantMembersB = membersDemo.filter((m) => m.gymVariantId === demoVariants[1].id)
  const demoVariantMembersC = membersDemo.filter((m) => m.gymVariantId === demoVariants[2].id)
  await createSubscriptions(demoVariantMembersA, demoGym, [plansDemo[0]])
  await createSubscriptions(demoVariantMembersB, demoGym, [plansDemo[1]], 2)
  await createSubscriptions(demoVariantMembersC, demoGym, [plansDemo[2]], 4)
  console.log('?? Created subscriptions and payments')

  await seedVisitsForGym(gym1, [
    { member: members1[0], dayOffset: 0, hour: 9, durationMinutes: 80, checkout: false },
    { member: members1[0], dayOffset: -1, hour: 18, durationMinutes: 70 },
    { member: members1[1], dayOffset: 0, hour: 11, durationMinutes: 60 },
    { member: members1[1], dayOffset: -3, hour: 10, durationMinutes: 55 },
    { member: members1[2], dayOffset: -2, hour: 17, durationMinutes: 90 },
    { member: members1[3], dayOffset: -5, hour: 8, durationMinutes: 50 },
  ])

  await seedVisitsForGym(gym2, [
    { member: members2[0], dayOffset: 0, hour: 8, durationMinutes: 50 },
    { member: members2[0], dayOffset: -1, hour: 19, durationMinutes: 55 },
    { member: members2[1], dayOffset: -2, hour: 12, durationMinutes: 70, checkout: false },
    { member: members2[2], dayOffset: -3, hour: 17, durationMinutes: 65 },
    { member: members2[3], dayOffset: 0, hour: 18, durationMinutes: 45 },
  ])

  await seedVisitsForGym(enterpriseGym, [
    { member: enterpriseMembers[0], dayOffset: 0, hour: 7, durationMinutes: 60 },
    { member: enterpriseMembers[1], dayOffset: -1, hour: 18, durationMinutes: 80 },
    { member: enterpriseMembers[2], dayOffset: -2, hour: 12, durationMinutes: 90, checkout: false },
    { member: enterpriseMembers[3], dayOffset: -3, hour: 17, durationMinutes: 55 },
    { member: enterpriseMembers[4], dayOffset: 0, hour: 9, durationMinutes: 70 },
  ])

  await seedVisitsForGym(demoGym, [
    { member: membersDemo[0], dayOffset: -1, hour: 10, durationMinutes: 75 },
    { member: membersDemo[0], dayOffset: -4, hour: 16, durationMinutes: 80 },
    { member: membersDemo[1], dayOffset: 0, hour: 9, durationMinutes: 70 },
    { member: membersDemo[2], dayOffset: 0, hour: 7, durationMinutes: 60, checkout: false },
    { member: membersDemo[3], dayOffset: -3, hour: 14, durationMinutes: 90 },
  ])

  await prisma.accessEvent.createMany({
    data: [
      {
        memberId: members1[0].id,
        status: AccessEventStatus.GRANTED,
        source: AccessEventSource.QR_SCAN,
        createdAt: addDays(today, -1),
      },
      {
        memberId: members1[1].id,
        status: AccessEventStatus.ALREADY_CHECKED_IN,
        source: AccessEventSource.SIMULATOR,
        createdAt: addDays(today, -2),
      },
      {
        memberId: members1[2].id,
        status: AccessEventStatus.DENIED_EXPIRED,
        source: AccessEventSource.QR_SCAN,
        createdAt: addDays(today, -3),
      },
      {
        memberId: members2[0].id,
        status: AccessEventStatus.DENIED_INACTIVE,
        source: AccessEventSource.MANUAL,
        createdAt: addDays(today, -1),
      },
      {
        memberId: enterpriseMembers[0].id,
        status: AccessEventStatus.GRANTED,
        source: AccessEventSource.QR_SCAN,
        createdAt: addDays(today, -2),
      },
      {
        memberId: enterpriseMembers[2].id,
        status: AccessEventStatus.ALREADY_CHECKED_IN,
        source: AccessEventSource.SIMULATOR,
        createdAt: addDays(today, -4),
      },
      {
        memberId: membersDemo[0].id,
        status: AccessEventStatus.GRANTED,
        source: AccessEventSource.SIMULATOR,
        createdAt: addDays(today, -5),
      },
      {
        memberId: membersDemo[2].id,
        status: AccessEventStatus.CHECKED_OUT,
        source: AccessEventSource.MANUAL,
        createdAt: today,
      },
    ],
  })
  console.log('Seeded access events')

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
    gymsSeeded: 4,
    membersSeeded: members1.length + members2.length + enterpriseMembers.length + membersDemo.length,
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
