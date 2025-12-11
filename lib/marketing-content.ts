import type {Metadata} from 'next'

import {routing, type AppLocale} from '@/i18n/routing'

type MarketingPage = 'home' | 'plans' | 'faqs'

type SeoEntry = {
  title: string
  description: string
  keywords?: string[]
}

type HeroEntry = {
  eyebrow: string
  title: string
  subtitle: string
  description: string
  primaryCta: string
  secondaryCta: string
}

type MarketingCopy = {
  localeLabel: string
  brandTagline: string
  nav: {
    features: string
    plans: string
    faqs: string
    contact: string
  }
  seo: Record<MarketingPage, SeoEntry>
  hero: Record<MarketingPage, HeroEntry>
}

const siteUrl = 'https://www.gymwatch.ma'

const marketingCopy: Record<AppLocale, MarketingCopy> = {
  fr: {
    localeLabel: 'Français',
    brandTagline: 'Gestion moderne des salles',
    nav: {
      features: 'Fonctionnalités',
      plans: 'Plans',
      faqs: 'FAQ',
      contact: 'Contact',
    },
    seo: {
      home: {
        title: 'GymWatch - Gestion moderne des salles de sport',
        description:
          "GymWatch aide les réseaux de salles de sport à piloter abonnements, accès et revenus avec une plateforme unifiée.",
        keywords: ['salle de sport', 'logiciel multi-salles', 'gestion abonnements', 'contrôle d’accès'],
      },
      plans: {
        title: 'Plans et tarifs GymWatch',
        description:
          'Comparez les plans GymWatch pour réseaux multi-salles : contrôle d’accès, automatisations et reporting exportable.',
        keywords: ['tarifs gym', 'SaaS fitness', 'contrôle d’accès', 'abonnements'],
      },
      faqs: {
        title: 'FAQ GymWatch | Gestion multi-salles et contrôle d’accès',
        description:
          'Questions fréquentes sur GymWatch : gestion d’abonnements, contrôle d’accès, déploiement multi-sites et sécurité.',
        keywords: ['FAQ GymWatch', 'logiciel salle de sport', 'multi-sites', 'support'],
      },
    },
    hero: {
      home: {
        eyebrow: 'SaaS de gestion de salles de sport',
        title: 'Le logiciel de gestion pour réseaux de salles de sport exigeants',
        subtitle: 'Abonnements, contrôle d’accès et paiements en temps réel.',
        description:
          'GymWatch centralise vos clubs, vos membres et vos finances dans une expérience premium pensée pour les réseaux multi-salles.',
        primaryCta: 'Demander une démo',
        secondaryCta: 'Se connecter',
      },
      plans: {
        eyebrow: 'Plans et tarifs',
        title: 'Plans et tarifs GymWatch',
        subtitle: 'Des offres pensées pour les réseaux multi-salles.',
        description:
          'Comparez mensuel et annuel (-20 %) et choisissez les modules : contrôle d’accès, automatisations et reporting.',
        primaryCta: 'Demander une démo',
        secondaryCta: 'Parler au support',
      },
      faqs: {
        eyebrow: 'FAQ',
        title: 'Questions fréquentes GymWatch',
        subtitle: 'Multi-sites, contrôle d’accès et facturation expliqués.',
        description:
          'Découvrez comment nous accompagnons les réseaux : déploiement, sécurité, support et évolutions produit.',
        primaryCta: 'Demander une démo',
        secondaryCta: 'Nous écrire',
      },
    },
  },
  en: {
    localeLabel: 'English',
    brandTagline: 'Modern gym operations',
    nav: {
      features: 'Features',
      plans: 'Pricing',
      faqs: 'FAQ',
      contact: 'Contact',
    },
    seo: {
      home: {
        title: 'GymWatch - Modern gym management',
        description:
          'Run memberships, access control and billing for multi-location fitness clubs from one dashboard.',
        keywords: ['gym software', 'membership management', 'access control', 'multi-location gyms'],
      },
      plans: {
        title: 'GymWatch pricing for multi-site gyms',
        description:
          'Compare monthly vs annual plans with access control, automations and exportable analytics for your clubs.',
        keywords: ['gym pricing', 'fitness software plans', 'access control SaaS'],
      },
      faqs: {
        title: 'GymWatch FAQs | Membership & access control',
        description:
          'Answers about onboarding, access permissions, billing and reporting for fitness franchises and gym networks.',
        keywords: ['gym faq', 'access control FAQ', 'membership software questions'],
      },
    },
    hero: {
      home: {
        eyebrow: 'Gym management SaaS',
        title: 'Modern operations for multi-site gyms',
        subtitle: 'Memberships, access control and billing in one place.',
        description:
          'GymWatch centralizes clubs, members and revenue so franchises can launch quickly with a reliable, bilingual platform.',
        primaryCta: 'Book a demo',
        secondaryCta: 'Sign in',
      },
      plans: {
        eyebrow: 'Pricing',
        title: 'Pricing built for growing gym networks',
        subtitle: 'Pick monthly or annual (-20%) plans.',
        description:
          'Choose the plan that fits your rollout: access control, automations, reporting and onboarding support.',
        primaryCta: 'Book a demo',
        secondaryCta: 'Talk to support',
      },
      faqs: {
        eyebrow: 'FAQ',
        title: 'Questions about GymWatch',
        subtitle: 'Access control, billing and rollout explained.',
        description:
          'Find answers on deployments, permissions, invoices and data security for multi-location clubs.',
        primaryCta: 'Book a demo',
        secondaryCta: 'Email us',
      },
    },
  },
  ar: {
    localeLabel: 'العربية',
    brandTagline: 'إدارة حديثة للأندية الرياضية',
    nav: {
      features: 'الميزات',
      plans: 'الأسعار',
      faqs: 'الأسئلة الشائعة',
      contact: 'تواصل معنا',
    },
    seo: {
      home: {
        title: 'GymWatch - إدارة حديثة للنوادي الرياضية',
        description: 'منصة لإدارة الاشتراكات، صلاحيات الدخول والفوترة لشبكات الأندية متعددة الفروع.',
        keywords: ['إدارة نادي رياضي', 'صلاحيات الدخول', 'اشتراكات', 'نظام نوادٍ متعددة الفروع'],
      },
      plans: {
        title: 'أسعار GymWatch للشبكات متعددة الفروع',
        description: 'قارن بين الاشتراك الشهري والسنوي مع تحكم في الدخول، أتمتة وتقارير قابلة للتصدير.',
        keywords: ['أسعار النوادي الرياضية', 'برمجية لياقة', 'صلاحيات دخول'],
      },
      faqs: {
        title: 'الأسئلة الشائعة حول GymWatch',
        description: 'إجابات حول الإطلاق، صلاحيات الدخول، الفوترة والتقارير للنوادي الرياضية.',
        keywords: ['أسئلة GymWatch', 'إدارة الاشتراكات', 'التحكم في الدخول'],
      },
    },
    hero: {
      home: {
        eyebrow: 'منصة لإدارة النوادي الرياضية',
        title: 'تشغيل حديث لشبكات متعددة الفروع',
        subtitle: 'الاشتراكات، صلاحيات الدخول والفوترة في لوحة واحدة.',
        description:
          'GymWatch تجمع بيانات الفروع والأعضاء والإيرادات مع دعم للغات متعددة وتجربة موثوقة.',
        primaryCta: 'احجز عرضاً توضيحياً',
        secondaryCta: 'تسجيل الدخول',
      },
      plans: {
        eyebrow: 'الأسعار',
        title: 'باقات تناسب نمو شبكتك',
        subtitle: 'اختر الاشتراك الشهري أو السنوي (-20%).',
        description:
          'ميزات للتحكم في الدخول، الأتمتة والتقارير مع دعم للإطلاق وتدريب الفرق.',
        primaryCta: 'احجز عرضاً',
        secondaryCta: 'تواصل مع الدعم',
      },
      faqs: {
        eyebrow: 'الأسئلة الشائعة',
        title: 'إجابات حول GymWatch',
        subtitle: 'الدخول، الفوترة وخطة الإطلاق.',
        description:
          'اعرف كيف نساعدك في الإعداد، إدارة الصلاحيات وحماية البيانات لشبكة الأندية.',
        primaryCta: 'احجز عرضاً',
        secondaryCta: 'راسلنا',
      },
    },
  },
}

const marketingRoutes: Record<MarketingPage, keyof typeof routing.pathnames> = {
  home: '/',
  plans: '/plans',
  faqs: '/faqs',
}

function resolveMarketingPath(page: MarketingPage, locale: AppLocale): string {
  const mapping = routing.pathnames[marketingRoutes[page]]

  if (!mapping) return marketingRoutes[page]
  if (typeof mapping === 'string') return mapping

  return mapping[locale] ?? mapping[routing.defaultLocale] ?? marketingRoutes[page]
}

function formatPathWithLocale(locale: AppLocale, pathname: string) {
  const normalized = pathname === '/' ? '' : pathname.startsWith('/') ? pathname : `/${pathname}`
  const base = normalized || '/'

  if (routing.localePrefix === 'always' || locale !== routing.defaultLocale) {
    return `/${locale}${normalized || ''}`
  }

  return base
}

export function getMarketingCopy(locale: AppLocale): MarketingCopy {
  return marketingCopy[locale] ?? marketingCopy[routing.defaultLocale]
}

export function getMarketingNavLinks(locale: AppLocale, options: {useHomeAnchors?: boolean} = {}) {
  const labels = getMarketingCopy(locale).nav
  const {useHomeAnchors = false} = options

  return [
    {label: labels.features, href: useHomeAnchors ? '/#features' : '/features'},
    {label: labels.plans, href: useHomeAnchors ? '/#plans' : resolveMarketingPath('plans', locale)},
    {label: labels.faqs, href: resolveMarketingPath('faqs', locale)},
    {label: labels.contact, href: useHomeAnchors ? '/#contact' : '/contact'},
  ]
}

export function buildMarketingMetadata(page: MarketingPage, locale: AppLocale): Metadata {
  const content = getMarketingCopy(locale)
  const seo = content.seo[page]
  const localizedPath = resolveMarketingPath(page, locale)
  const canonicalPath = formatPathWithLocale(locale, localizedPath)

  const languageAlternates = routing.locales.reduce(
    (acc, current) => {
      const currentPath = resolveMarketingPath(page, current)
      acc[current] = formatPathWithLocale(current, currentPath)
      return acc
    },
    {} as Record<AppLocale, string>,
  )

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: canonicalPath,
      languages: languageAlternates,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${siteUrl}${canonicalPath}`,
      siteName: 'GymWatch',
      type: 'website',
      images: [{url: '/hero-grid.svg', width: 1600, height: 1200, alt: 'GymWatch'}],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/hero-grid.svg'],
    },
  }
}

export function resolveMarketingPathForLocale(page: MarketingPage, locale: AppLocale) {
  return resolveMarketingPath(page, locale)
}
