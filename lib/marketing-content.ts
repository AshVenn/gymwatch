import type { Metadata } from "next"

import { routing, type AppLocale } from "@/i18n/routing"

type MarketingPage = "home" | "plans" | "faqs" | "about" | "contact" | "ressources" | "clubs"

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
    docs: string
    faqs: string
    ressources: string
    about: string
    contact: string
    clubs: string
  }


  seo: Record<MarketingPage, SeoEntry>
  hero: Record<MarketingPage, HeroEntry>
}

const siteUrl = "https://www.gymwatch.ma"

const marketingCopy: Record<AppLocale, MarketingCopy> = {
  fr: {
    localeLabel: "Français",
    brandTagline: "Gestion moderne des salles",
    nav: {
      features: "Fonctionnalités",
      plans: "Plans",
      docs: "Docs",
      faqs: "FAQ",
      ressources: "Ressources",
      about: "À propos",
      contact: "Contact",
      clubs: "Clubs partenaires",
    },
    seo: {
      home: {
        title: "GymWatch - Gestion moderne des salles de sport",
        description:
          "GymWatch aide les réseaux de salles de sport à piloter abonnements, accès et revenus avec une plateforme unifiée.",
        keywords: ["salle de sport", "logiciel multi-salles", "gestion abonnements", "contrôle d’accès"],
      },
      plans: {
        title: "Plans et tarifs GymWatch",
        description:
          "Comparez les plans GymWatch pour réseaux multi-salles : contrôle d’accès, automatisations et reporting exportable.",
        keywords: ["tarifs gym", "SaaS fitness", "contrôle d’accès", "abonnements"],
      },
      faqs: {
        title: "FAQ GymWatch | Gestion multi-salles et contrôle d’accès",
        description:
          "Questions fréquentes sur GymWatch : gestion d’abonnements, contrôle d’accès, déploiement multi-sites et sécurité.",
        keywords: ["FAQ GymWatch", "logiciel salle de sport", "multi-sites", "support"],
      },
      about: {
        title: "À propos de GymWatch",
        description:
          "Découvrez la mission de GymWatch : optimiser la gestion des salles de sport et réseaux multi-salles avec fiabilité, sécurité et automatisation.",
        keywords: ["GymWatch", "SaaS salle de sport", "multi-salles", "contrôle d’accès"],
      },
      contact: {
        title: "Contact et support GymWatch",
        description:
          "Contactez GymWatch : support, onboarding et déploiement multi-salles pour votre logiciel de gestion de salle de sport.",
        keywords: ["contact GymWatch", "support", "onboarding", "multi-salles"],
      },
      clubs: {
        title: "Clubs partenaires GymWatch",
        description:
          "Réseaux et clubs qui utilisent GymWatch : contrôle d’accès, reporting exportable et support bilingue.",
        keywords: ["clubs partenaires", "réseaux multi-salles", "contrôle d’accès"],
      },
      ressources: {
        title: "Ressources GymWatch",
        description:
          "Guides et articles sur la gestion de salles de sport : fidélisation, contrôle d’accès, automatisation des abonnements et réseaux multi-salles.",
        keywords: ["ressources gym", "contrôle d’accès", "churn", "kpi salles de sport"],
      },
    },
    hero: {
      home: {
        eyebrow: "SaaS de gestion de salles de sport",
        title: "Le logiciel de gestion pour réseaux de salles de sport exigeants",
        subtitle: "Abonnements, contrôle d’accès et paiements en temps réel.",
        description:
          "GymWatch centralise vos clubs, vos membres et vos finances dans une expérience premium pensée pour les réseaux multi-salles.",
        primaryCta: "Demander une démo",
        secondaryCta: "Se connecter",
      },
      plans: {
        eyebrow: "Plans et tarifs",
        title: "Plans et tarifs GymWatch",
        subtitle: "Des offres pensées pour les réseaux multi-salles.",
        description:
          "Comparez mensuel et annuel (-20 %) et choisissez les modules : contrôle d’accès, automatisations et reporting.",
        primaryCta: "Demander une démo",
        secondaryCta: "Parler au support",
      },
      faqs: {
        eyebrow: "FAQ",
        title: "Questions fréquentes GymWatch",
        subtitle: "Multi-sites, contrôle d’accès et facturation expliqués.",
        description:
          "Découvrez comment nous accompagnons les réseaux : déploiement, sécurité, support et évolutions produit.",
        primaryCta: "Demander une démo",
        secondaryCta: "Nous écrire",
      },
      about: {
        eyebrow: "À propos",
        title: "À propos de GymWatch",
        subtitle: "Une plateforme unique, fiable et sécurisée.",
        description:
          "Nous aidons les réseaux de salles de sport à piloter membres, abonnements et contrôle d’accès avec une expérience moderne.",
        primaryCta: "Demander une démo",
        secondaryCta: "Voir les fonctionnalités",
      },
      contact: {
        eyebrow: "Contact / Support",
        title: "Contact et support",
        subtitle: "Onboarding multi-salles et accompagnement.",
        description: "Notre équipe vous accompagne : cadrage, migration, formation et support continu.",
        primaryCta: "Planifier une démo",
        secondaryCta: "Nous écrire",
      },
      clubs: {
        eyebrow: "Clubs partenaires",
        title: "Les clubs qui tournent sur GymWatch",
        subtitle: "Logos Cloudinary et contenus traduits.",
        description:
          "Exemples de réseaux multi-salles avec contrôle d’accès, reporting exportable et support bilingue.",
        primaryCta: "Demander une démo",
        secondaryCta: "Nous écrire",
      },
      ressources: {
        eyebrow: "Ressources",
        title: "Ressources et guides GymWatch",
        subtitle: "Contrôle d’accès, churn, KPI et multi-sites.",
        description: "Articles pour dirigeants : fidélisation, automatisations et pilotage des réseaux multi-sites.",
        primaryCta: "Demander une démo",
        secondaryCta: "Voir les fonctionnalités",
      },
    },
  },

  en: {
    localeLabel: "English",
    brandTagline: "Modern gym operations",
    nav: {
      features: "Features",
      plans: "Pricing",
      docs: "Docs",
      faqs: "FAQ",
      ressources: "Resources",
      about: "About",
      contact: "Contact",
      clubs: "Clubs",
    },
    seo: {
      home: {
        title: "GymWatch - Modern gym management",
        description: "Run memberships, access control and billing for multi-location fitness clubs from one dashboard.",
        keywords: ["gym software", "membership management", "access control", "multi-location gyms"],
      },
      plans: {
        title: "GymWatch pricing for multi-site gyms",
        description: "Compare monthly vs annual plans with access control, automations and exportable analytics for your clubs.",
        keywords: ["gym pricing", "fitness software plans", "access control SaaS"],
      },
      faqs: {
        title: "GymWatch FAQs | Membership & access control",
        description: "Answers about onboarding, access permissions, billing and reporting for fitness franchises and gym networks.",
        keywords: ["gym faq", "access control FAQ", "membership software questions"],
      },
      about: {
        title: "About GymWatch",
        description: "Learn how GymWatch helps multi-site gym networks run membership, access and operations with reliability and security.",
        keywords: ["GymWatch", "gym SaaS", "multi-location", "access control"],
      },
      contact: {
        title: "GymWatch contact & support",
        description: "Contact GymWatch for onboarding, rollout and support for your gym management platform.",
        keywords: ["GymWatch support", "contact", "onboarding", "rollout"],
      },
      clubs: {
        title: "GymWatch partner clubs",
        description: "Partner clubs and franchises running GymWatch with Cloudinary assets and bilingual marketing copy.",
        keywords: ["partner clubs", "gymwatch clubs", "multi-site gyms"],
      },
      ressources: {
        title: "GymWatch resources",
        description: "Guides on gym operations: retention, access control, automations and KPIs for multi-location networks.",
        keywords: ["gym resources", "retention", "kpi", "access control"],
      },
    },
    hero: {
      home: {
        eyebrow: "Gym management SaaS",
        title: "Modern operations for multi-site gyms",
        subtitle: "Memberships, access control and billing in one place.",
        description: "GymWatch centralizes clubs, members and revenue so franchises can launch quickly with a reliable, bilingual platform.",
        primaryCta: "Book a demo",
        secondaryCta: "Sign in",
      },
      plans: {
        eyebrow: "Pricing",
        title: "Pricing built for growing gym networks",
        subtitle: "Pick monthly or annual (-20%) plans.",
        description: "Choose the plan that fits your rollout: access control, automations, reporting and onboarding support.",
        primaryCta: "Book a demo",
        secondaryCta: "Talk to support",
      },
      faqs: {
        eyebrow: "FAQ",
        title: "Questions about GymWatch",
        subtitle: "Access control, billing and rollout explained.",
        description: "Find answers on deployments, permissions, invoices and data security for multi-location clubs.",
        primaryCta: "Book a demo",
        secondaryCta: "Email us",
      },
      about: {
        eyebrow: "About",
        title: "About GymWatch",
        subtitle: "Reliable, secure, modern.",
        description: "We help gym networks run memberships, access control and operations with one platform.",
        primaryCta: "Book a demo",
        secondaryCta: "See features",
      },
      contact: {
        eyebrow: "Contact / Support",
        title: "Contact & support",
        subtitle: "Multi-site onboarding and rollout.",
        description: "We help with scoping, migration, training and ongoing support.",
        primaryCta: "Schedule a demo",
        secondaryCta: "Email us",
      },
      clubs: {
        eyebrow: "Partner clubs",
        title: "Clubs running GymWatch",
        subtitle: "Cloudinary visuals and bilingual stories.",
        description: "Explore real clubs and franchises using GymWatch for access control, exports and multi-site oversight.",
        primaryCta: "Book a demo",
        secondaryCta: "Talk to support",
      },
      ressources: {
        eyebrow: "Resources",
        title: "GymWatch guides & resources",
        subtitle: "Access control, churn, KPIs, multi-site.",
        description: "Articles for owners: retention, automations, reporting and multi-location execution.",
        primaryCta: "Book a demo",
        secondaryCta: "See features",
      },
    },
  },

  ar: {
    localeLabel: "العربية",
    brandTagline: "إدارة حديثة للأندية الرياضية",
    nav: {
      features: "الميزات",
      plans: "الأسعار",
      docs: "التوثيق",
      faqs: "الأسئلة الشائعة",
      ressources: "الموارد",
      about: "من نحن",
      contact: "تواصل معنا",
      clubs: "الأندية الشريكة",
    },
    seo: {
      home: {
        title: "GymWatch - إدارة حديثة للنوادي الرياضية",
        description: "منصة لإدارة الاشتراكات، صلاحيات الدخول والفوترة لشبكات الأندية متعددة الفروع.",
        keywords: ["إدارة نادي رياضي", "صلاحيات الدخول", "اشتراكات", "نظام نوادٍ متعددة الفروع"],
      },
      plans: {
        title: "أسعار GymWatch للشبكات متعددة الفروع",
        description: "قارن بين الاشتراك الشهري والسنوي مع تحكم في الدخول، أتمتة وتقارير قابلة للتصدير.",
        keywords: ["أسعار النوادي الرياضية", "برمجية لياقة", "صلاحيات دخول"],
      },
      faqs: {
        title: "الأسئلة الشائعة حول GymWatch",
        description: "إجابات حول الإطلاق، صلاحيات الدخول، الفوترة والتقارير للنوادي الرياضية.",
        keywords: ["أسئلة GymWatch", "إدارة الاشتراكات", "التحكم في الدخول"],
      },
      about: {
        title: "من نحن | GymWatch",
        description: "تعرف على مهمة GymWatch: تحسين إدارة شبكات النوادي الرياضية بموثوقية وأمان وأتمتة.",
        keywords: ["GymWatch", "إدارة نوادي", "متعدد الفروع", "التحكم في الدخول"],
      },
      contact: {
        title: "التواصل والدعم | GymWatch",
        description: "تواصل مع GymWatch للدعم والإعداد والإطلاق لشبكتك متعددة الفروع.",
        keywords: ["دعم GymWatch", "تواصل", "إعداد", "إطلاق"],
      },
      clubs: {
        title: "الأندية الشريكة | GymWatch",
        description: "الأندية والشبكات التي تستخدم GymWatch للتحكم في الدخول والتقارير القابلة للتصدير.",
        keywords: ["أندية شريكة", "شبكات متعددة الفروع", "التحكم في الدخول"],
      },
      ressources: {
        title: "الموارد | GymWatch",
        description: "أدلة حول إدارة النوادي: الاحتفاظ، التحكم في الدخول، الأتمتة وقياس المؤشرات لشبكات متعددة الفروع.",
        keywords: ["موارد النوادي", "الاحتفاظ", "مؤشرات الأداء", "التحكم في الدخول"],
      },
    },
    hero: {
      home: {
        eyebrow: "منصة لإدارة النوادي الرياضية",
        title: "تشغيل حديث لشبكات متعددة الفروع",
        subtitle: "الاشتراكات، صلاحيات الدخول والفوترة في لوحة واحدة.",
        description: "GymWatch تجمع بيانات الفروع والأعضاء والإيرادات مع دعم للغات متعددة وتجربة موثوقة.",
        primaryCta: "احجز عرضاً توضيحياً",
        secondaryCta: "تسجيل الدخول",
      },
      plans: {
        eyebrow: "الأسعار",
        title: "باقات تناسب نمو شبكتك",
        subtitle: "اختر الاشتراك الشهري أو السنوي (-20%).",
        description: "ميزات للتحكم في الدخول، الأتمتة والتقارير مع دعم للإطلاق وتدريب الفرق.",
        primaryCta: "احجز عرضاً",
        secondaryCta: "تواصل مع الدعم",
      },
      faqs: {
        eyebrow: "الأسئلة الشائعة",
        title: "إجابات حول GymWatch",
        subtitle: "الدخول، الفوترة وخطة الإطلاق.",
        description: "اعرف كيف نساعدك في الإعداد، إدارة الصلاحيات وحماية البيانات لشبكة الأندية.",
        primaryCta: "احجز عرضاً",
        secondaryCta: "راسلنا",
      },
      about: {
        eyebrow: "من نحن",
        title: "من نحن | GymWatch",
        subtitle: "منصة موثوقة وآمنة وحديثة.",
        description: "نساعد شبكات النوادي على إدارة الأعضاء والاشتراكات والتحكم في الدخول من منصة واحدة.",
        primaryCta: "احجز عرضاً",
        secondaryCta: "عرض الميزات",
      },
      contact: {
        eyebrow: "تواصل / دعم",
        title: "التواصل والدعم",
        subtitle: "إعداد وإطلاق متعدد الفروع.",
        description: "نساعدك في التخطيط، نقل البيانات، التدريب والدعم المستمر.",
        primaryCta: "احجز عرضاً",
        secondaryCta: "راسلنا",
      },
      clubs: {
        eyebrow: "الأندية الشريكة",
        title: "أندية تعمل عبر GymWatch",
        subtitle: "صور Cloudinary ومحتوى متعدد اللغات.",
        description: "اكتشف أندية وشبكات تستخدم GymWatch للتحكم في الدخول والتقارير وإدارة الفروع.",
        primaryCta: "احجز عرضاً",
        secondaryCta: "تواصل مع الدعم",
      },
      ressources: {
        eyebrow: "الموارد",
        title: "موارد وأدلة GymWatch",
        subtitle: "الدخول، الاحتفاظ، المؤشرات، متعدد الفروع.",
        description: "مقالات للمديرين: الأتمتة، التقارير وتنفيذ شبكات متعددة الفروع.",
        primaryCta: "احجز عرضاً",
        secondaryCta: "عرض الميزات",
      },
    },
  },
}


const marketingRoutes: Record<MarketingPage, keyof typeof routing.pathnames> = {
  home: "/",
  plans: "/plans",
  faqs: "/faqs",
  about: "/about",
  contact: "/contact",
  clubs: "/clubs",
  ressources: "/ressources",
}

function resolveMarketingPath(page: MarketingPage, locale: AppLocale): string {
  const mapping = routing.pathnames[marketingRoutes[page]]

  if (!mapping) return marketingRoutes[page]
  if (typeof mapping === "string") return mapping

  return mapping[locale] ?? mapping[routing.defaultLocale] ?? marketingRoutes[page]
}

function formatPathWithLocale(locale: AppLocale, pathname: string) {
  const normalized = pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`
  const base = normalized || "/"

  if (routing.localePrefix === "always" || locale !== routing.defaultLocale) {
    return `/${locale}${normalized || ""}`
  }

  return base
}

export function getMarketingCopy(locale: AppLocale): MarketingCopy {
  return marketingCopy[locale] ?? marketingCopy[routing.defaultLocale]
}

export function getMarketingNavLinks(locale: AppLocale, options: { useHomeAnchors?: boolean } = {}) {
  const labels = getMarketingCopy(locale).nav
  const { useHomeAnchors = false } = options

  return [
    { label: labels.features, href: useHomeAnchors ? "/#features" : "/features" },
    { label: labels.clubs, href: resolveMarketingPath("clubs", locale) },
    { label: labels.plans, href: useHomeAnchors ? "/#plans" : resolveMarketingPath("plans", locale) },
    { label: labels.contact, href: useHomeAnchors ? "/#contact" : "/contact" },
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
      siteName: "GymWatch",
      type: "website",
      images: [{ url: "/hero-grid.svg", width: 1600, height: 1200, alt: "GymWatch" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/hero-grid.svg"],
    },
  }
}

export function resolveMarketingPathForLocale(page: MarketingPage, locale: AppLocale) {
  return resolveMarketingPath(page, locale)
}
