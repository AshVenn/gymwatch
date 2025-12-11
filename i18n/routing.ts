import {createNavigation} from 'next-intl/navigation'
import {defineRouting} from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'fr', 'ar'] as const,
  defaultLocale: 'fr',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/about': '/about',
    '/contact': '/contact',
    '/features': '/features',
    '/plans': {
      en: '/pricing',
      fr: '/plans',
      ar: '/plans',
    },
    '/faqs': {
      en: '/faq',
      fr: '/faq',
      ar: '/faq',
    },
    '/ressources': '/ressources',
    '/login': '/login',
    '/register': '/register',
    '/request-demo': '/request-demo',
    '/dashboard': '/dashboard',
    '/admin': '/admin',
    '/super-admin': '/super-admin',
  },
})

export const {Link, redirect, usePathname, useRouter, getPathname} = createNavigation(routing)
export type AppLocale = (typeof routing.locales)[number]
