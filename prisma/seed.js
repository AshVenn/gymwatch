/* eslint-disable no-console */
const {
  PrismaClient,
  UserRole,
  AccessEventStatus,
  AccessEventSource,
  SubscriptionStatus,
  GymPlanTier,
  GymBillingInterval,
  GymSubscriptionStatus,
  DemoRequestStatus,
  AccessRuleType,
  AccessRuleSeverity,
  GymFreezeStatus,
} = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
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

function buildDate(baseDate, dayOffset, hour = 9, minute = 0) {
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

async function upsertPlans() {
  const catalog = [
    {
      tier: GymPlanTier.BASIC,
      billingInterval: GymBillingInterval.MONTHLY,
      name: 'Basic Monthly',
      price: 200,
      maxVariants: 2,
      maxMembers: 600,
      capacityPerGym: 80,
      capacityPerVariant: 60,
    },
    {
      tier: GymPlanTier.PRO,
      billingInterval: GymBillingInterval.MONTHLY,
      name: 'Pro Monthly',
      price: 350,
      maxVariants: 6,
      maxMembers: 1400,
      capacityPerGym: 160,
      capacityPerVariant: 120,
    },
    {
      tier: GymPlanTier.ENTERPRISE,
      billingInterval: GymBillingInterval.MONTHLY,
      name: 'Enterprise Monthly',
      price: 520,
      maxVariants: -1,
      maxMembers: -1,
      capacityPerGym: 260,
      capacityPerVariant: 180,
    },
  ]

  const byTier = new Map()

  for (const plan of catalog) {
    const record = await prisma.plan.upsert({
      where: {
        tier_billingInterval: {
          tier: plan.tier,
          billingInterval: plan.billingInterval,
        },
      },
      update: {
        name: plan.name,
        price: plan.price,
        maxVariants: plan.maxVariants,
        maxMembers: plan.maxMembers,
        capacityPerGym: plan.capacityPerGym,
        capacityPerVariant: plan.capacityPerVariant,
      },
      create: {
        name: plan.name,
        tier: plan.tier,
        billingInterval: plan.billingInterval,
        price: plan.price,
        maxVariants: plan.maxVariants,
        maxMembers: plan.maxMembers,
        capacityPerGym: plan.capacityPerGym,
        capacityPerVariant: plan.capacityPerVariant,
      },
    })
    byTier.set(plan.tier, record)
  }

  return byTier
}

async function upsertMarketingPlans() {
  const entries = [
    {
      tier: GymPlanTier.BASIC,
      order: 0,
      highlight: false,
      translations: {
        en: {
          name: 'Basic',
          description: 'Core member and subscription management for one club.',
          highlightLabel: null,
          badges: ['Member management', 'Payments tracking'],
          features: [
            'Member and subscription management',
            'Payments and invoices tracking',
            'Visit history and basic dashboards',
            'Single club setup',
          ],
        },
        fr: {
          name: 'Basic',
          description: 'Gestion de base des membres et abonnements pour un seul club.',
          highlightLabel: null,
          badges: ['Gestion des membres', 'Suivi des paiements'],
          features: [
            'Gestion des membres et abonnements',
            'Suivi des paiements et factures',
            'Historique des visites et tableaux de bord essentiels',
            'Configuration mono-salle',
          ],
        },
        ar: {
          name: 'أساسي',
          description: 'إدارة أساسية للأعضاء والاشتراكات لنادٍ واحد.',
          highlightLabel: null,
          badges: ['إدارة الأعضاء', 'متابعة المدفوعات'],
          features: [
            'إدارة الأعضاء والاشتراكات',
            'متابعة المدفوعات والفواتير',
            'سجل الزيارات ولوحات تحكم أساسية',
            'إعداد نادي واحد',
          ],
        },
      },
    },
    {
      tier: GymPlanTier.PRO,
      order: 1,
      highlight: false,
      translations: {
        en: {
          name: 'Pro',
          description: 'QR access control, attendance tracking, and advanced exports.',
          highlightLabel: null,
          badges: ['QR access', 'Excel exports'],
          features: [
            'Everything in Basic',
            'QR access control and scanner tools',
            'Real-time attendance tracking',
            'Excel exports for revenue and retention',
            'QR code downloads',
          ],
        },
        fr: {
          name: 'Pro',
          description: 'Contrôle d’accès QR, suivi de présence et exports avancés.',
          highlightLabel: null,
          badges: ['Accès QR', 'Exports Excel'],
          features: [
            'Tout le plan Basic',
            'Contrôle d’accès QR et outils de scan',
            'Suivi de présence en temps réel',
            'Exports Excel revenus et fidélité',
            'Téléchargement des QR codes',
          ],
        },
        ar: {
          name: 'احترافي',
          description: 'دخول QR، تتبع الحضور، وتقارير متقدمة.',
          highlightLabel: null,
          badges: ['دخول QR', 'تقارير Excel'],
          features: [
            'كل ما في الخطة الأساسية',
            'التحكم بالدخول عبر QR وأدوات المسح',
            'تتبع الحضور في الوقت الفعلي',
            'تصدير Excel للإيرادات والاحتفاظ',
            'تنزيل رموز QR',
          ],
        },
      },
    },
    {
      tier: GymPlanTier.ENTERPRISE,
      order: 2,
      highlight: true,
      translations: {
        en: {
          name: 'Enterprise',
          description: 'Multi-site operations with courses, advanced analytics, and full controls.',
          highlightLabel: 'Enterprise',
          badges: ['Multi-site', 'Courses', 'Advanced analytics'],
          features: [
            'Everything in Pro',
            'Multi-site management and permissions',
            'Courses and scheduling',
            'Advanced access rules and capacity monitoring',
            'Consolidated analytics across sites',
          ],
        },
        fr: {
          name: 'Enterprise',
          description: 'Multi-sites avec cours, analytics avancés et contrôles complets.',
          highlightLabel: 'Enterprise',
          badges: ['Multi-sites', 'Cours', 'Analytics avancés'],
          features: [
            'Tout le plan Pro',
            'Gestion multi-sites et permissions',
            'Cours et planning',
            'Règles d’accès avancées et suivi des capacités',
            'Analytics consolidés multi-sites',
          ],
        },
        ar: {
          name: 'مؤسسات',
          description: 'إدارة متعددة المواقع مع الدورات وتحليلات متقدمة.',
          highlightLabel: 'مؤسسات',
          badges: ['متعدد المواقع', 'الدورات', 'تحليلات متقدمة'],
          features: [
            'كل ما في الخطة الاحترافية',
            'إدارة متعددة المواقع والصلاحيات',
            'الدورات والجدولة',
            'قواعد دخول متقدمة ومتابعة السعة',
            'تحليلات مجمعة عبر المواقع',
          ],
        },
      },
    },
  ]

  for (const entry of entries) {
    const plan = await prisma.marketingPlan.upsert({
      where: { tier: entry.tier },
      update: {
        order: entry.order,
        isPublished: true,
        highlight: entry.highlight,
      },
      create: {
        tier: entry.tier,
        order: entry.order,
        isPublished: true,
        highlight: entry.highlight,
        },
      })

    const locales = Object.keys(entry.translations || {})
    for (const locale of locales) {
      const translation = entry.translations[locale]
      if (!translation || !translation.name) continue
      await prisma.marketingPlanTranslation.upsert({
        where: { planId_locale: { planId: plan.id, locale } },
        update: {
          name: translation.name,
          description: translation.description,
          highlightLabel: translation.highlightLabel,
          badges: translation.badges,
          features: translation.features,
        },
        create: {
          planId: plan.id,
          locale,
          name: translation.name,
          description: translation.description,
          highlightLabel: translation.highlightLabel,
          badges: translation.badges,
          features: translation.features,
        },
      })
    }
  }
}

async function attachTenantPlan(gym, planRecord, options = {}) {
  const id = `tenant-plan-${gym.id}`
  return prisma.tenantPlan.upsert({
    where: { id },
    update: {
      status: gym.subscriptionStatus ?? GymSubscriptionStatus.ACTIVE,
      planId: planRecord.id,
      startsAt: gym.subscriptionStartedAt ?? new Date(),
      endsAt: gym.subscriptionExpiresAt ?? null,
      gracePeriodDays: gym.subscriptionGracePeriodDays ?? 0,
      freezeStatus: options.freezeStatus ?? null,
      freezeReason: options.freezeReason ?? null,
      freezeUntil: options.freezeUntil ?? null,
    },
    create: {
      id,
      gymId: gym.id,
      planId: planRecord.id,
      status: gym.subscriptionStatus ?? GymSubscriptionStatus.ACTIVE,
      startsAt: gym.subscriptionStartedAt ?? new Date(),
      endsAt: gym.subscriptionExpiresAt ?? null,
      gracePeriodDays: gym.subscriptionGracePeriodDays ?? 0,
      freezeStatus: options.freezeStatus ?? null,
      freezeReason: options.freezeReason ?? null,
      freezeUntil: options.freezeUntil ?? null,
    },
  })
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
    // end = today
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

  if (end.getTime() < today.getTime()) return SubscriptionStatus.EXPIRED
  if (end.getTime() === today.getTime()) return SubscriptionStatus.EXPIRES_TODAY
  return SubscriptionStatus.ACTIVE
}

function slugifyVariant(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'principal'
}

async function createVariantsForGym(gymId, names) {
  const variants = []
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const variant = await prisma.gymVariant.create({
      data: { gymId, name, slug: slugifyVariant(name), isDefault: i === 0 },
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
        subscriptions: { connect: { id: sub.id } },
      },
    })
  }
}

function effectiveSessionLimitMinutes(gym, variant) {
  if (typeof variant?.maxSessionMinutes === 'number' && variant.maxSessionMinutes > 0) return variant.maxSessionMinutes
  return gym.maxSessionMinutes
}

async function clearDatabase() {
  console.log('Clearing database...')
  await prisma.accessRuleEvent.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.tenantPlanFreeze.deleteMany()
  await prisma.tenantPlan.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.partnerClubTranslation.deleteMany()
  await prisma.partnerClub.deleteMany()
  await prisma.classBooking.deleteMany()
  await prisma.classSession.deleteMany()
  await prisma.accessEvent.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.member.deleteMany()
  await prisma.membershipPlan.deleteMany()
  await prisma.gymVariant.deleteMany()
  await prisma.demoRequest.deleteMany()
  await prisma.userPreference.deleteMany()
  await prisma.user.deleteMany()
  await prisma.gym.deleteMany()
  await prisma.planSettings.deleteMany()
  await prisma.systemSettings.deleteMany()
  console.log('Database cleared ✅')
}

async function upsertOwner({ email, password, firstName, lastName, gymId, gymVariantId }) {
  const hashed = await hashPassword(password)
  const owner = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: UserRole.GYM_OWNER, gymId, firstName, lastName, gymVariantId: gymVariantId ?? null },
    create: { email, password: hashed, role: UserRole.GYM_OWNER, firstName, lastName, gymId, gymVariantId: gymVariantId ?? null },
  })
  await ensurePreference(owner.id, { theme: 'dark' })
  return owner
}

async function upsertAdmin({ email, password, firstName, lastName, gymId, gymVariantId }) {
  const hashed = await hashPassword(password)
  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: UserRole.GYM_ADMIN, gymId, firstName, lastName, gymVariantId: gymVariantId ?? null },
    create: { email, password: hashed, role: UserRole.GYM_ADMIN, firstName, lastName, gymId, gymVariantId: gymVariantId ?? null },
  })
  await ensurePreference(admin.id)
  return admin
}

/**
 * ===== REALISTIC ACCESS ENGINE =====
 * We seed access events. Each entry creates an AccessEvent.
 * Only GRANTED entries create a Visit (and optionally CHECKED_OUT/SESSION_OVERSTAY).
 */

async function getMemberSubscriptionForMoment(memberId, moment) {
  // Find a subscription that covers the moment
  const subs = await prisma.subscription.findMany({
    where: { memberId },
    orderBy: { endDate: 'desc' },
    include: { plan: true },
  })

  const match = subs.find((s) => moment >= s.startDate && moment <= s.endDate)
  return match ?? null
}

async function hasOpenVisit(memberId) {
  const open = await prisma.visit.findFirst({
    where: { memberId, checkOut: null },
    orderBy: { checkIn: 'desc' },
  })
  return Boolean(open)
}

async function visitsCountForDay(memberId, dayStart) {
  const nextDay = addDays(dayStart, 1)
  return prisma.visit.count({
    where: { memberId, checkIn: { gte: dayStart, lt: nextDay } },
  })
}

async function logAccess(memberId, status, source, createdAt) {
  await prisma.accessEvent.create({
    data: { memberId, status, source: source ?? AccessEventSource.SIMULATOR, createdAt },
  })
}

async function createVisitFromGrant({ gym, variant, memberId, createdAt, durationMinutes, checkout }) {
  const checkIn = createdAt
  const checkOut = checkout === false ? null : new Date(checkIn.getTime() + (durationMinutes ?? 75) * 60 * 1000)
  const sessionLimit = effectiveSessionLimitMinutes(gym, variant)
  const resolvedDuration = checkout === false ? 0 : durationMinutes ?? 0
  const overstayMinutes =
    typeof sessionLimit === 'number' && sessionLimit > 0 && resolvedDuration > sessionLimit
      ? resolvedDuration - sessionLimit
      : 0

  const visit = await prisma.visit.create({
    data: {
      gymId: gym.id,
      memberId,
      gymVariantId: variant.id,
      checkIn,
      checkOut,
      overstayMinutes: overstayMinutes > 0 ? overstayMinutes : 0,
    },
  })

  // If checked out, also log CHECKED_OUT and maybe SESSION_OVERSTAY
  if (visit.checkOut) {
    await logAccess(memberId, AccessEventStatus.CHECKED_OUT, AccessEventSource.MANUAL, visit.checkOut)

    if (typeof sessionLimit === 'number' && sessionLimit > 0 && (durationMinutes ?? 0) > sessionLimit) {
      await logAccess(memberId, AccessEventStatus.SESSION_OVERSTAY, AccessEventSource.SIMULATOR, new Date(visit.checkOut.getTime() + 60_000))
    }
  }

  return visit
}

/**
 * Attempt rules:
 * 1) If no subscription covering the moment => DENIED_INACTIVE
 * 2) If subscription exists but status computed as EXPIRED for that endDate relative to day => treat as DENIED_EXPIRED
 *    (we already have endDate coverage check; this happens naturally when moment is outside coverage)
 * 3) If open visit exists => ALREADY_CHECKED_IN
 * 4) Daily limit based on plan.visitsPerDay => DENIED_DAILY_LIMIT
 * 5) Else => GRANTED + create Visit
 */
async function seedAccessEntry({
  gym,
  variantsById,
  member,
  attemptAt,
  durationMinutes = 75,
  checkout = true,
  source = AccessEventSource.QR_SCAN,
}) {
  const dayStart = startOfDay(attemptAt)

  const subscription = await getMemberSubscriptionForMoment(member.id, attemptAt)
  if (!subscription) {
    // If member has any subscription but none covers the moment => expired scenario
    const anySub = await prisma.subscription.findFirst({ where: { memberId: member.id } })
    await logAccess(
      member.id,
      anySub ? AccessEventStatus.DENIED_EXPIRED : AccessEventStatus.DENIED_INACTIVE,
      source,
      attemptAt
    )
    return { granted: false }
  }

  // Already checked in?
  if (await hasOpenVisit(member.id)) {
    await logAccess(member.id, AccessEventStatus.ALREADY_CHECKED_IN, source, attemptAt)
    return { granted: false }
  }

  // Daily limit?
  const currentVisits = await visitsCountForDay(member.id, dayStart)
  const maxPerDay = subscription.plan?.visitsPerDay ?? 1
  if (maxPerDay > 0 && currentVisits >= maxPerDay) {
    await logAccess(member.id, AccessEventStatus.DENIED_DAILY_LIMIT, source, attemptAt)
    return { granted: false }
  }

  // Grant -> log + visit
  await logAccess(member.id, AccessEventStatus.GRANTED, source, attemptAt)

  const variant = variantsById.get(member.gymVariantId)
  await createVisitFromGrant({
    gym,
    variant,
    memberId: member.id,
    createdAt: attemptAt,
    durationMinutes,
    checkout,
  })

  return { granted: true }
}

async function refreshGymDailyStats(gym) {
  const today = startOfDay(new Date())
  const todayVisits = await prisma.visit.count({
    where: { gymId: gym.id, checkIn: { gte: today, lt: addDays(today, 1) } },
  })
  await prisma.gym.update({
    where: { id: gym.id },
    data: { todayVisitorCount: todayVisits, todayVisitorDate: today },
  })
}

async function refreshMembersLastVisitedAt(memberIds) {
  for (const memberId of memberIds) {
    const last = await prisma.visit.findFirst({
      where: { memberId },
      orderBy: { checkIn: 'desc' },
    })
    if (last) {
      await prisma.member.update({
        where: { id: memberId },
        data: { lastVisitedAt: last.checkIn },
      })
    }
  }
}

async function seedPartnerClubs() {
  const entries = [
    {
      slug: 'fitzone-casa',
      websiteUrl: 'https://fitzone.ma',
      logoUrl: '/gyms/FitZone.png',
      logoPublicId: 'fitzone-local',
      coverUrl: '/gyms/FitZone.png',
      coverPublicId: 'fitzone-local',
      order: 1,
      isPublished: true,
      translations: {
        fr: {
          name: 'FitZone Casablanca',
          city: 'Casablanca',
          country: 'Maroc',
          tagline: 'Réseau premium connecté à GymWatch',
          description: 'Multi-site avec contrôle d’accès en temps réel, reporting exportable et onboarding premium.',
        },
        en: {
          name: 'FitZone Casablanca',
          city: 'Casablanca',
          country: 'Morocco',
          tagline: 'Premium network powered by GymWatch',
          description: 'Multi-site rollout with access control, exportable reporting and premium onboarding.',
        },
        ar: {
          name: 'فيتزون الدار البيضاء',
          city: 'الدار البيضاء',
          country: 'المغرب',
          tagline: 'شبكة بريميوم مع GymWatch',
          description: 'إدارة متعددة الفروع مع تحكم فوري في الدخول وتقارير قابلة للتصدير وانضمام سريع.',
        },
      },
    },
    {
      slug: 'powergym-rabat',
      websiteUrl: 'https://powergym.ma',
      logoUrl: '/gyms/PowerGym.png',
      logoPublicId: 'powergym-local',
      coverUrl: '/gyms/PowerGym.png',
      coverPublicId: 'powergym-local',
      order: 2,
      isPublished: true,
      translations: {
        fr: {
          name: 'PowerGym Rabat',
          city: 'Rabat',
          country: 'Maroc',
          tagline: 'Automatisations et contrôle d’accès',
          description: 'Badges, QR codes et rappels automatiques pour réduire les impayés et sécuriser les entrées.',
        },
        en: {
          name: 'PowerGym Rabat',
          city: 'Rabat',
          country: 'Morocco',
          tagline: 'Automations and access control',
          description: 'Badges, QR codes and automated reminders to cut unpaid invoices and secure entries.',
        },
        ar: {
          name: 'باور جيم الرباط',
          city: 'الرباط',
          country: 'المغرب',
          tagline: 'أتمتة وتحكم في الدخول',
          description: 'شارات و رموز QR وتنبيهات تلقائية لتقليل المتأخرات وتأمين المداخل.',
        },
      },
    },
    {
      slug: 'atlas-fitness',
      websiteUrl: 'https://atlas-fitness.ma',
      logoUrl: '/gyms/AtlasFitness.png',
      logoPublicId: 'atlas-local',
      coverUrl: '/gyms/AtlasFitness.png',
      coverPublicId: 'atlas-local',
      order: 3,
      isPublished: true,
      translations: {
        fr: {
          name: 'Atlas Fitness',
          city: 'Fès',
          country: 'Maroc',
          tagline: 'Pilotage multi-salles',
          description: 'Vue réseau, indicateurs par club et exports CSV/PDF pour la finance et les franchises.',
        },
        en: {
          name: 'Atlas Fitness',
          city: 'Fes',
          country: 'Morocco',
          tagline: 'Multi-club control',
          description: 'Network-wide view, per-club indicators and CSV/PDF exports for finance and franchise ops.',
        },
        ar: {
          name: 'أطلس فيتنس',
          city: 'مراكش',
          country: 'المغرب',
          tagline: 'إدارة متعددة الفروع',
          description: 'رؤية شاملة للشبكة ومؤشرات لكل نادٍ مع صادرات CSV/PDF للمالية والامتيازات.',
        },
      },
    },
  ]

  for (const entry of entries) {
    const partner = await prisma.partnerClub.upsert({
      where: { slug: entry.slug },
      update: {
        websiteUrl: entry.websiteUrl,
        logoUrl: entry.logoUrl,
        logoPublicId: entry.logoPublicId,
        coverUrl: entry.coverUrl,
        coverPublicId: entry.coverPublicId,
        order: entry.order,
        isPublished: entry.isPublished,
      },
      create: {
        slug: entry.slug,
        websiteUrl: entry.websiteUrl,
        logoUrl: entry.logoUrl,
        logoPublicId: entry.logoPublicId,
        coverUrl: entry.coverUrl,
        coverPublicId: entry.coverPublicId,
        order: entry.order,
        isPublished: entry.isPublished,
      },
    })

    const locales = Object.keys(entry.translations || {})
    for (const locale of locales) {
      const t = entry.translations[locale]
      if (!t || !t.name) continue

      await prisma.partnerClubTranslation.upsert({
        where: { partnerId_locale: { partnerId: partner.id, locale } },
        update: {
          name: t.name,
          city: t.city ?? null,
          country: t.country ?? null,
          tagline: t.tagline ?? null,
          description: t.description ?? null,
        },
        create: {
          partnerId: partner.id,
          locale,
          name: t.name,
          city: t.city ?? null,
          country: t.country ?? null,
          tagline: t.tagline ?? null,
          description: t.description ?? null,
        },
      })
    }
  }
}

async function runSeed() {
  console.log('Seeding GymWatch data...')
  await clearDatabase()

  // Settings
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

  const planCatalog = await upsertPlans()
  await upsertMarketingPlans()

  // Super admin (KEEP SAME PASSWORD)
  const adminPassword = await hashPassword('Admin123!')
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@gymwatch.com' },
    update: { password: adminPassword, role: UserRole.SUPER_ADMIN },
    create: {
      email: 'admin@gymwatch.com',
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
      firstName: 'Admin',
      lastName: 'GymWatch',
    },
  })
  await ensurePreference(superAdmin.id)

  const managerPassword = await hashPassword('Manager123!')
  const superManager = await prisma.user.upsert({
    where: { email: 'manager@gymwatch.com' },
    update: { password: managerPassword, role: UserRole.SUPER_MANAGER },
    create: {
      email: 'manager@gymwatch.com',
      password: managerPassword,
      role: UserRole.SUPER_MANAGER,
      firstName: 'Platform',
      lastName: 'Manager',
    },
  })
  await ensurePreference(superManager.id)

  const now = new Date()
  const todayStart = startOfDay(now)

  // Gyms
  const gym1 = await prisma.gym.upsert({
    where: { id: 'gym-fitzone' },
    update: {
      subscriptionPlan: GymPlanTier.PRO,
      billingInterval: GymBillingInterval.MONTHLY,
      subscriptionPrice: 350,
      analyticsSnapshot: buildAnalyticsSnapshot(13500),
      subscriptionStatus: GymSubscriptionStatus.ACTIVE,
      subscriptionExpiresAt: addDays(now, 5),
      subscriptionStartedAt: addDays(now, -24),
      subscriptionGracePeriodDays: 3,
      maxSessionMinutes: 180,
      maxAdminAccounts: 5,
      maxMembers: 1200,
      maxVariants: 6,
      capacity: 160,
      lastSettingsUpdateAt: now,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
    },
    create: {
      id: 'gym-fitzone',
      name: 'FitZone Casablanca',
      email: 'contact@fitzone.ma',
      city: 'Casablanca',
      country: 'Maroc',
      subscriptionPlan: GymPlanTier.PRO,
      billingInterval: GymBillingInterval.MONTHLY,
      subscriptionPrice: 350,
      subscriptionStatus: GymSubscriptionStatus.ACTIVE,
      subscriptionStartedAt: addDays(now, -24),
      subscriptionExpiresAt: addDays(now, 5),
      subscriptionGracePeriodDays: 3,
      maxSessionMinutes: 180,
      maxAdminAccounts: 5,
      maxMembers: 1200,
      maxVariants: 6,
      capacity: 160,
      lastSettingsUpdateAt: now,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(13500),
    },
  })

  const gym2 = await prisma.gym.upsert({
    where: { id: 'gym-powergym' },
    update: {
      subscriptionPlan: GymPlanTier.BASIC,
      billingInterval: GymBillingInterval.ANNUAL,
      subscriptionPrice: 2000,
      analyticsSnapshot: buildAnalyticsSnapshot(9800),
      subscriptionStatus: GymSubscriptionStatus.SUSPENDED,
      subscriptionExpiresAt: addDays(now, -3),
      subscriptionStartedAt: addDays(now, -300),
      subscriptionGracePeriodDays: 7,
      maxSessionMinutes: 180,
      maxAdminAccounts: 3,
      maxMembers: 800,
      maxVariants: 3,
      capacity: 110,
      lastSettingsUpdateAt: now,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
    },
    create: {
      id: 'gym-powergym',
      name: 'PowerGym Rabat',
      email: 'contact@powergym.ma',
      city: 'Rabat',
      country: 'Maroc',
      subscriptionPlan: GymPlanTier.BASIC,
      billingInterval: GymBillingInterval.ANNUAL,
      subscriptionPrice: 2000,
      subscriptionStatus: GymSubscriptionStatus.SUSPENDED,
      subscriptionStartedAt: addDays(now, -300),
      subscriptionExpiresAt: addDays(now, -3),
      subscriptionGracePeriodDays: 7,
      maxSessionMinutes: 180,
      maxAdminAccounts: 3,
      maxMembers: 800,
      maxVariants: 3,
      capacity: 110,
      lastSettingsUpdateAt: now,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(9800),
    },
  })

  const enterpriseGym = await prisma.gym.upsert({
    where: { id: 'gym-enterprise' },
    update: {
      subscriptionPlan: GymPlanTier.ENTERPRISE,
      billingInterval: GymBillingInterval.MONTHLY,
      subscriptionPrice: 520,
      subscriptionStatus: GymSubscriptionStatus.ACTIVE,
      subscriptionStartedAt: addDays(now, -45),
      subscriptionExpiresAt: addDays(now, 25),
      subscriptionGracePeriodDays: 5,
      maxSessionMinutes: 180,
      maxAdminAccounts: 10,
      maxMembers: 1800,
      maxVariants: -1,
      capacity: 260,
      lastSettingsUpdateAt: now,
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
      subscriptionPlan: GymPlanTier.ENTERPRISE,
      billingInterval: GymBillingInterval.MONTHLY,
      subscriptionPrice: 520,
      subscriptionStatus: GymSubscriptionStatus.ACTIVE,
      subscriptionStartedAt: addDays(now, -45),
      subscriptionExpiresAt: addDays(now, 25),
      subscriptionGracePeriodDays: 5,
      maxSessionMinutes: 180,
      maxAdminAccounts: 10,
      maxMembers: 1800,
      maxVariants: -1,
      capacity: 260,
      lastSettingsUpdateAt: now,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(18500),
    },
  })

  const demoGym = await prisma.gym.upsert({
    where: { id: 'gym-demo' },
    update: {
      subscriptionPlan: GymPlanTier.BASIC,
      billingInterval: GymBillingInterval.MONTHLY,
      subscriptionPrice: 0,
      subscriptionStatus: GymSubscriptionStatus.ACTIVE,
      subscriptionExpiresAt: addDays(now, 10),
      demoEndsAt: addDays(now, 15),
      isDemo: true,
      subscriptionGracePeriodDays: 3,
      maxSessionMinutes: 180,
      maxAdminAccounts: 2,
      maxMembers: 400,
      maxVariants: 3,
      capacity: 90,
      lastSettingsUpdateAt: now,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(5000),
    },
    create: {
      id: 'gym-demo',
      name: 'Demo Club',
      email: 'demo@gymwatch.ma',
      city: 'Marrakech',
      country: 'Maroc',
      subscriptionPlan: GymPlanTier.BASIC,
      billingInterval: GymBillingInterval.MONTHLY,
      subscriptionPrice: 0,
      subscriptionStatus: GymSubscriptionStatus.ACTIVE,
      subscriptionStartedAt: now,
      subscriptionExpiresAt: addDays(now, 10),
      demoEndsAt: addDays(now, 15),
      isDemo: true,
      subscriptionGracePeriodDays: 3,
      maxSessionMinutes: 180,
      maxAdminAccounts: 2,
      maxMembers: 400,
      maxVariants: 3,
      capacity: 90,
      lastSettingsUpdateAt: now,
      todayVisitorCount: 0,
      todayVisitorDate: todayStart,
      analyticsSnapshot: buildAnalyticsSnapshot(5000),
    },
  })

  const resolvePlanByTier = (tier) => planCatalog.get(tier) ?? planCatalog.values().next().value

  const tenantPlans = {
    fitzone: await attachTenantPlan(gym1, resolvePlanByTier(GymPlanTier.PRO)),
    power: await attachTenantPlan(gym2, resolvePlanByTier(GymPlanTier.BASIC), {
      freezeStatus: GymFreezeStatus.ACTIVE,
      freezeReason: 'Payment dispute',
      freezeUntil: addDays(now, 14),
    }),
    enterprise: await attachTenantPlan(enterpriseGym, resolvePlanByTier(GymPlanTier.ENTERPRISE)),
    demo: await attachTenantPlan(demoGym, resolvePlanByTier(GymPlanTier.BASIC)),
  }

  if (tenantPlans.power) {
    await prisma.tenantPlanFreeze.upsert({
      where: { id: `${tenantPlans.power.id}-freeze` },
      update: {
        reason: 'Billing freeze (demo)',
        requestedUntil: addDays(now, 14),
        liftedAt: null,
      },
      create: {
        id: `${tenantPlans.power.id}-freeze`,
        tenantPlanId: tenantPlans.power.id,
        reason: 'Billing freeze (demo)',
        requestedUntil: addDays(now, 14),
      },
    })
  }

  // Variants
  const gym1Variants = await createVariantsForGym(gym1.id, ['Principal'])
  await prisma.gymVariant.update({ where: { id: gym1Variants[0].id }, data: { maxSessionMinutes: 160, capacity: 150 } })

  const gym2Variants = await createVariantsForGym(gym2.id, ['Femmes', 'Hommes'])
  await prisma.gymVariant.update({ where: { id: gym2Variants[0].id }, data: { maxSessionMinutes: 140, capacity: 100 } })
  await prisma.gymVariant.update({ where: { id: gym2Variants[1].id }, data: { maxSessionMinutes: 120, capacity: 110 } })

  const enterpriseVariants = await createVariantsForGym(enterpriseGym.id, ['Centre', 'Nord', 'Sud'])
  await prisma.gymVariant.update({ where: { id: enterpriseVariants[0].id }, data: { maxSessionMinutes: 200, capacity: 180 } })

  const demoVariants = await createVariantsForGym(demoGym.id, ['Downtown', 'Uptown', 'Cardio'])
  await prisma.gymVariant.update({ where: { id: demoVariants[0].id }, data: { capacity: 70, maxSessionMinutes: 90 } })
  await prisma.gymVariant.update({ where: { id: demoVariants[1].id }, data: { capacity: 60, maxSessionMinutes: 130 } })
  await prisma.gymVariant.update({ where: { id: demoVariants[2].id }, data: { capacity: 50, maxSessionMinutes: 110 } })

  // Map fresh variants by id
  const variantsById = new Map()
  for (const v of [...gym1Variants, ...gym2Variants, ...enterpriseVariants, ...demoVariants]) {
    const fresh = await prisma.gymVariant.findUnique({ where: { id: v.id } })
    variantsById.set(v.id, fresh)
  }

  // Users (KEEP SAME PASSWORDS)
  const fitZoneOwner = await upsertOwner({
    email: 'owner@fitzone.ma',
    password: 'Owner123!',
    firstName: 'Sanae',
    lastName: 'Belkadi',
    gymId: gym1.id,
    gymVariantId: gym1Variants[0].id,
  })
  await prisma.gym.update({ where: { id: gym1.id }, data: { ownerId: fitZoneOwner.id } })

  const powerGymOwner = await upsertOwner({
    email: 'owner@powergym.ma',
    password: 'Owner123!',
    firstName: 'Yassine',
    lastName: 'Haddad',
    gymId: gym2.id,
    gymVariantId: gym2Variants[0].id,
  })
  await prisma.gym.update({ where: { id: gym2.id }, data: { ownerId: powerGymOwner.id } })

  const demoGymOwner = await upsertOwner({
    email: 'owner@demo.gymwatch.ma',
    password: 'Owner123!',
    firstName: 'Demo',
    lastName: 'Owner',
    gymId: demoGym.id,
    gymVariantId: demoVariants[0].id,
  })
  await prisma.gym.update({ where: { id: demoGym.id }, data: { ownerId: demoGymOwner.id } })

  const enterpriseOwner = await upsertOwner({
    email: 'owner@enterprise.ma',
    password: 'Owner123!',
    firstName: 'Kenza',
    lastName: 'El Idrissi',
    gymId: enterpriseGym.id,
    gymVariantId: enterpriseVariants[0].id,
  })
  await prisma.gym.update({ where: { id: enterpriseGym.id }, data: { ownerId: enterpriseOwner.id } })

  await Promise.all([
    upsertAdmin({ email: 'admin@fitzone.ma', password: 'Password123!', firstName: 'Manager', lastName: 'FitZone', gymId: gym1.id, gymVariantId: gym1Variants[0].id }),
    upsertAdmin({ email: 'coach@fitzone.ma', password: 'Password123!', firstName: 'Coach', lastName: 'Casablanca', gymId: gym1.id, gymVariantId: gym1Variants[0].id }),
    upsertAdmin({ email: 'admin@powergym.ma', password: 'Password123!', firstName: 'Manager', lastName: 'PowerGym', gymId: gym2.id, gymVariantId: gym2Variants[0].id }),
    upsertAdmin({ email: 'coach@powergym.ma', password: 'Password123!', firstName: 'Coach', lastName: 'Rabat', gymId: gym2.id, gymVariantId: gym2Variants[1].id }),
    upsertAdmin({ email: 'admin@enterprise.ma', password: 'Password123!', firstName: 'Youssef', lastName: 'Nord', gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[1].id }),
    upsertAdmin({ email: 'coach@enterprise.ma', password: 'Password123!', firstName: 'Imane', lastName: 'Sud', gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[2].id }),
  ])

  // Membership plans
  const plans1 = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym1.id}-monthly` },
      update: {},
      create: { id: `plan-${gym1.id}-monthly`, gymId: gym1.id, gymVariantId: gym1Variants[0].id, name: 'Mensuel', durationDays: 30, price: 300, isActive: true, maxSessionMinutes: 150, visitsPerDay: 1 },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym1.id}-quarterly` },
      update: {},
      create: { id: `plan-${gym1.id}-quarterly`, gymId: gym1.id, gymVariantId: gym1Variants[0].id, name: 'Trimestriel', durationDays: 90, price: 800, isActive: true, maxSessionMinutes: 180, visitsPerDay: 2 },
    }),
  ])

  const plans2 = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym2.id}-monthly` },
      update: {},
      create: { id: `plan-${gym2.id}-monthly`, gymId: gym2.id, gymVariantId: gym2Variants[0].id, name: 'Mensuel', durationDays: 30, price: 350, isActive: true, maxSessionMinutes: 140, visitsPerDay: 1 },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${gym2.id}-annual` },
      update: {},
      create: { id: `plan-${gym2.id}-annual`, gymId: gym2.id, gymVariantId: gym2Variants[1].id, name: 'Annuel', durationDays: 365, price: 3000, isActive: true, maxSessionMinutes: 170, visitsPerDay: 1 },
    }),
  ])

  const plansDemo = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${demoGym.id}-monthly` },
      update: {},
      create: { id: `plan-${demoGym.id}-monthly`, gymId: demoGym.id, gymVariantId: demoVariants[0].id, name: 'Essai 30j', durationDays: 30, price: 0, isActive: true, maxSessionMinutes: 90, visitsPerDay: 1 },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${demoGym.id}-uptown` },
      update: {},
      create: { id: `plan-${demoGym.id}-uptown`, gymId: demoGym.id, gymVariantId: demoVariants[1].id, name: 'Mensuel Uptown', durationDays: 30, price: 120, isActive: true, maxSessionMinutes: 130, visitsPerDay: 1 },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${demoGym.id}-cardio` },
      update: {},
      create: { id: `plan-${demoGym.id}-cardio`, gymId: demoGym.id, gymVariantId: demoVariants[2].id, name: 'Cardio illimité', durationDays: 45, price: 200, isActive: true, maxSessionMinutes: 110, visitsPerDay: 2 },
    }),
  ])

  const enterprisePlans = await Promise.all([
    prisma.membershipPlan.upsert({
      where: { id: `plan-${enterpriseGym.id}-centre` },
      update: {},
      create: { id: `plan-${enterpriseGym.id}-centre`, gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[0].id, name: 'Centre Premium', durationDays: 30, price: 450, isActive: true, maxSessionMinutes: 200, visitsPerDay: 1 },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${enterpriseGym.id}-nord` },
      update: {},
      create: { id: `plan-${enterpriseGym.id}-nord`, gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[1].id, name: 'Nord Annual', durationDays: 365, price: 4800, isActive: true, maxSessionMinutes: 190, visitsPerDay: 1 },
    }),
    prisma.membershipPlan.upsert({
      where: { id: `plan-${enterpriseGym.id}-sud` },
      update: {},
      create: { id: `plan-${enterpriseGym.id}-sud`, gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[2].id, name: 'Sud Family', durationDays: 90, price: 1100, isActive: true, maxSessionMinutes: 210, visitsPerDay: 2 },
    }),
  ])

  // Members
  const members1 = await Promise.all([
    prisma.member.create({ data: { gymId: gym1.id, gymVariantId: gym1Variants[0].id, firstName: 'Ahmed', lastName: 'Morocco', email: 'ahmed@example.com', phone: '+212600000001' } }),
    prisma.member.create({ data: { gymId: gym1.id, gymVariantId: gym1Variants[0].id, firstName: 'Fatima', lastName: 'Hassan', email: 'fatima@example.com', phone: '+212600000002' } }),
    prisma.member.create({ data: { gymId: gym1.id, gymVariantId: gym1Variants[0].id, firstName: 'Mohammed', lastName: 'Ali', email: 'mohammed@example.com', phone: '+212600000003' } }),
    prisma.member.create({ data: { gymId: gym1.id, gymVariantId: gym1Variants[0].id, firstName: 'Youssef', lastName: 'Karim', email: 'youssef@example.com', phone: '+212600000004' } }),
    prisma.member.create({ data: { gymId: gym1.id, gymVariantId: gym1Variants[0].id, firstName: 'Layla', lastName: 'Ibrahim', email: 'layla@example.com', phone: '+212600000005' } }),
    // One inactive member (no subscription) to demonstrate DENIED_INACTIVE
    prisma.member.create({ data: { gymId: gym1.id, gymVariantId: gym1Variants[0].id, firstName: 'Ines', lastName: 'Inactive', email: 'ines.inactive@example.com', phone: '+212600009999' } }),
  ])

  const members2 = await Promise.all([
    prisma.member.create({ data: { gymId: gym2.id, gymVariantId: gym2Variants[0].id, firstName: 'Hassan', lastName: 'Rashid', email: 'hassan@example.com', phone: '+212600000006' } }),
    prisma.member.create({ data: { gymId: gym2.id, gymVariantId: gym2Variants[0].id, firstName: 'Noor', lastName: 'Said', email: 'noor@example.com', phone: '+212600000007' } }),
    prisma.member.create({ data: { gymId: gym2.id, gymVariantId: gym2Variants[0].id, firstName: 'Zainab', lastName: 'Malik', email: 'zainab@example.com', phone: '+212600000008' } }),
    prisma.member.create({ data: { gymId: gym2.id, gymVariantId: gym2Variants[1].id, firstName: 'Omar', lastName: 'Farhan', email: 'omar@example.com', phone: '+212600000009' } }),
    prisma.member.create({ data: { gymId: gym2.id, gymVariantId: gym2Variants[1].id, firstName: 'Sara', lastName: 'Walid', email: 'sara@example.com', phone: '+212600000010' } }),
  ])

  const enterpriseMembers = await Promise.all([
    prisma.member.create({ data: { gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[0].id, firstName: 'Amine', lastName: 'Centre', email: 'amine.centre@example.com', phone: '+212600000015' } }),
    prisma.member.create({ data: { gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[0].id, firstName: 'Ikram', lastName: 'Premium', email: 'ikram.premium@example.com', phone: '+212600000016' } }),
    prisma.member.create({ data: { gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[1].id, firstName: 'Rachid', lastName: 'Nord', email: 'rachid.nord@example.com', phone: '+212600000017' } }),
    prisma.member.create({ data: { gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[1].id, firstName: 'Soumia', lastName: 'Nord', email: 'soumia.nord@example.com', phone: '+212600000018' } }),
    prisma.member.create({ data: { gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[2].id, firstName: 'Nizar', lastName: 'Sud', email: 'nizar.sud@example.com', phone: '+212600000019' } }),
    prisma.member.create({ data: { gymId: enterpriseGym.id, gymVariantId: enterpriseVariants[2].id, firstName: 'Dounia', lastName: 'Family', email: 'dounia.family@example.com', phone: '+212600000020' } }),
  ])

  const membersDemo = await Promise.all([
    prisma.member.create({ data: { gymId: demoGym.id, gymVariantId: demoVariants[0].id, firstName: 'Lina', lastName: 'North', email: 'lina.north@example.com', phone: '+212600000011' } }),
    prisma.member.create({ data: { gymId: demoGym.id, gymVariantId: demoVariants[1].id, firstName: 'Karim', lastName: 'East', email: 'karim.east@example.com', phone: '+212600000012' } }),
    prisma.member.create({ data: { gymId: demoGym.id, gymVariantId: demoVariants[2].id, firstName: 'Meryem', lastName: 'Cardio', email: 'meryem.cardio@example.com', phone: '+212600000013' } }),
    prisma.member.create({ data: { gymId: demoGym.id, gymVariantId: demoVariants[2].id, firstName: 'Salma', lastName: 'Atlas', email: 'salma.atlas@example.com', phone: '+212600000014' } }),
  ])

  // Subscriptions (note: the inactive member members1[5] gets NO subscription on purpose)
  await createSubscriptions(members1.slice(0, 5), gym1, plans1)
  await createSubscriptions(members2.slice(0, 3), gym2, [plans2[0]], 5)
  await createSubscriptions(members2.slice(3), gym2, [plans2[1]], 8)

  await createSubscriptions(enterpriseMembers.filter((m) => m.gymVariantId === enterpriseVariants[0].id), enterpriseGym, [enterprisePlans[0]])
  await createSubscriptions(enterpriseMembers.filter((m) => m.gymVariantId === enterpriseVariants[1].id), enterpriseGym, [enterprisePlans[1]], 3)
  await createSubscriptions(enterpriseMembers.filter((m) => m.gymVariantId === enterpriseVariants[2].id), enterpriseGym, [enterprisePlans[2]], 6)

  await createSubscriptions(membersDemo.filter((m) => m.gymVariantId === demoVariants[0].id), demoGym, [plansDemo[0]])
  await createSubscriptions(membersDemo.filter((m) => m.gymVariantId === demoVariants[1].id), demoGym, [plansDemo[1]], 2)
  await createSubscriptions(membersDemo.filter((m) => m.gymVariantId === demoVariants[2].id), demoGym, [plansDemo[2]], 4)

  console.log('✅ Created subscriptions and payments')

  // ====== REALISTIC ACCESS EVENTS ======
  // - Some granted -> create visits
  // - Some denied due to EXPIRED, INACTIVE, DAILY LIMIT, ALREADY CHECKED IN

  const base = new Date()

  // Gym1 entries
  await seedAccessEntry({ gym: gym1, variantsById, member: members1[0], attemptAt: buildDate(base, 0, 9, 0), durationMinutes: 80, checkout: false, source: AccessEventSource.QR_SCAN })
  // Same member tries again while still checked in => ALREADY_CHECKED_IN
  await seedAccessEntry({ gym: gym1, variantsById, member: members1[0], attemptAt: buildDate(base, 0, 9, 20), durationMinutes: 60, checkout: true, source: AccessEventSource.QR_SCAN })

  // Member with plan visitsPerDay=1 tries twice same day => second is DENIED_DAILY_LIMIT
  await seedAccessEntry({ gym: gym1, variantsById, member: members1[1], attemptAt: buildDate(base, 0, 11, 0), durationMinutes: 60, checkout: true, source: AccessEventSource.SIMULATOR })
  await seedAccessEntry({ gym: gym1, variantsById, member: members1[1], attemptAt: buildDate(base, 0, 18, 15), durationMinutes: 45, checkout: true, source: AccessEventSource.QR_SCAN })

  // Member likely expired (because seeding creates 3rd+ subs as expired) tries => DENIED_EXPIRED
  await seedAccessEntry({ gym: gym1, variantsById, member: members1[3], attemptAt: buildDate(base, 0, 8, 10), durationMinutes: 50, checkout: true, source: AccessEventSource.MANUAL })

  // Inactive member => DENIED_INACTIVE
  await seedAccessEntry({ gym: gym1, variantsById, member: members1[5], attemptAt: buildDate(base, 0, 10, 0), durationMinutes: 40, checkout: true, source: AccessEventSource.QR_SCAN })

  // Gym2 entries
  await seedAccessEntry({ gym: gym2, variantsById, member: members2[0], attemptAt: buildDate(base, 0, 8, 0), durationMinutes: 50, checkout: true, source: AccessEventSource.QR_SCAN })
  await seedAccessEntry({ gym: gym2, variantsById, member: members2[0], attemptAt: buildDate(base, -1, 19, 0), durationMinutes: 55, checkout: true, source: AccessEventSource.QR_SCAN })
  // This one stays checked-in (open session)
  await seedAccessEntry({ gym: gym2, variantsById, member: members2[1], attemptAt: buildDate(base, -2, 12, 0), durationMinutes: 150, checkout: false, source: AccessEventSource.SIMULATOR })
  await seedAccessEntry({ gym: gym2, variantsById, member: members2[3], attemptAt: buildDate(base, -3, 18, 15), durationMinutes: 65, checkout: true, source: AccessEventSource.MANUAL })

  // Enterprise entries
  await seedAccessEntry({ gym: enterpriseGym, variantsById, member: enterpriseMembers[0], attemptAt: buildDate(base, 0, 7, 0), durationMinutes: 60, checkout: true, source: AccessEventSource.QR_SCAN })
  // Overstay candidate (duration bigger than limits) => SESSION_OVERSTAY will be logged after checkout
  await seedAccessEntry({ gym: enterpriseGym, variantsById, member: enterpriseMembers[1], attemptAt: buildDate(base, -1, 18, 0), durationMinutes: 260, checkout: true, source: AccessEventSource.QR_SCAN })
  await seedAccessEntry({ gym: enterpriseGym, variantsById, member: enterpriseMembers[2], attemptAt: buildDate(base, -2, 9, 30), durationMinutes: 70, checkout: true, source: AccessEventSource.SIMULATOR })
  await seedAccessEntry({ gym: enterpriseGym, variantsById, member: enterpriseMembers[4], attemptAt: buildDate(base, -3, 14, 0), durationMinutes: 90, checkout: true, source: AccessEventSource.MANUAL })

  // Demo entries
  await seedAccessEntry({ gym: demoGym, variantsById, member: membersDemo[0], attemptAt: buildDate(base, -1, 10, 0), durationMinutes: 75, checkout: true, source: AccessEventSource.SIMULATOR })
  await seedAccessEntry({ gym: demoGym, variantsById, member: membersDemo[2], attemptAt: buildDate(base, 0, 7, 0), durationMinutes: 60, checkout: false, source: AccessEventSource.QR_SCAN })
  await seedAccessEntry({ gym: demoGym, variantsById, member: membersDemo[1], attemptAt: buildDate(base, -2, 16, 0), durationMinutes: 65, checkout: true, source: AccessEventSource.QR_SCAN })

  // Extra logs for analytics & pagination
  await seedAccessEntry({ gym: gym1, variantsById, member: members1[2], attemptAt: buildDate(base, -3, 17, 30), durationMinutes: 95, checkout: true, source: AccessEventSource.MANUAL })
  await seedAccessEntry({ gym: gym2, variantsById, member: members2[4], attemptAt: buildDate(base, -4, 6, 45), durationMinutes: 80, checkout: true, source: AccessEventSource.SIMULATOR })

  // Update lastVisitedAt for members that actually visited
  const allMembers = [...members1, ...members2, ...enterpriseMembers, ...membersDemo]
  await refreshMembersLastVisitedAt(allMembers.map((m) => m.id))

  // Update gyms daily stats from real visits
  await Promise.all([refreshGymDailyStats(gym1), refreshGymDailyStats(gym2), refreshGymDailyStats(enterpriseGym), refreshGymDailyStats(demoGym)])
  console.log('✅ Seeded realistic access events → visits only when granted')

  // Demo requests
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
        plan: GymPlanTier.PRO,
        message: 'Reseau de 2 salles en preparation.',
        status: DemoRequestStatus.PENDING,
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
        plan: GymPlanTier.BASIC,
        status: DemoRequestStatus.RESOLVED,
        resolvedAt: now,
        resolvedById: superAdmin.id,
        createdGymId: demoGym.id,
        resolutionNote: 'Compte demo et acces envoyes',
      },
      {
        gymName: 'Nordic Pulse',
        gymEmail: 'contact@nordicpulse.ma',
        adminEmail: 'ops@nordicpulse.ma',
        adminFirstName: 'Lamia',
        adminLastName: 'Fathi',
        phone: '+212633221199',
        city: 'Tanger',
        country: 'Maroc',
        plan: GymPlanTier.ENTERPRISE,
        message: 'Reseau premium avec controle d acces et exports.',
        status: DemoRequestStatus.PENDING,
      },
    ],
  })

  await seedPartnerClubs()

  const adminName = `${superAdmin.firstName || ''} ${superAdmin.lastName || ''}`.trim() || null
  const managerName = `${superManager.firstName || ''} ${superManager.lastName || ''}`.trim() || null

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: superAdmin.id,
        actorRole: UserRole.SUPER_ADMIN,
        actorEmail: superAdmin.email,
        actorName: adminName,
        action: 'platform.user.create',
        targetType: 'user',
        targetId: superManager.id,
        metadata: { role: UserRole.SUPER_MANAGER },
        createdAt: now,
      },
      {
        actorId: superAdmin.id,
        actorRole: UserRole.SUPER_ADMIN,
        actorEmail: superAdmin.email,
        actorName: adminName,
        action: 'platform.gym.create',
        targetType: 'gym',
        targetId: gym1.id,
        metadata: { name: gym1.name },
        createdAt: now,
      },
      {
        actorId: superAdmin.id,
        actorRole: UserRole.SUPER_ADMIN,
        actorEmail: superAdmin.email,
        actorName: adminName,
        action: 'platform.gym.create',
        targetType: 'gym',
        targetId: gym2.id,
        metadata: { name: gym2.name },
        createdAt: now,
      },
      {
        actorId: superAdmin.id,
        actorRole: UserRole.SUPER_ADMIN,
        actorEmail: superAdmin.email,
        actorName: adminName,
        action: 'platform.gym.create',
        targetType: 'gym',
        targetId: enterpriseGym.id,
        metadata: { name: enterpriseGym.name },
        createdAt: now,
      },
      {
        actorId: superAdmin.id,
        actorRole: UserRole.SUPER_ADMIN,
        actorEmail: superAdmin.email,
        actorName: adminName,
        action: 'platform.gym.create',
        targetType: 'gym',
        targetId: demoGym.id,
        metadata: { name: demoGym.name, isDemo: demoGym.isDemo },
        createdAt: now,
      },
      {
        actorId: superManager.id,
        actorRole: UserRole.SUPER_MANAGER,
        actorEmail: superManager.email,
        actorName: managerName,
        action: 'platform.gym.update',
        targetType: 'gym',
        targetId: gym2.id,
        metadata: { status: gym2.subscriptionStatus },
        createdAt: now,
      },
      {
        actorId: superAdmin.id,
        actorRole: UserRole.SUPER_ADMIN,
        actorEmail: superAdmin.email,
        actorName: adminName,
        action: 'platform.audit.seed',
        targetType: 'seed',
        targetId: 'initial',
        metadata: { gyms: 4, members: allMembers.length },
        createdAt: now,
      },
    ],
  })

  return {
    gymsSeeded: 4,
    membersSeeded: allMembers.length,
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
