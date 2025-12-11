import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AuthProvider } from '@/app/providers/session-provider'
import { ReactQueryProvider } from '@/app/providers/react-query-provider'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { routing, type AppLocale } from '@/i18n/routing'

type LocaleLayoutProps = {
  children: ReactNode
  params: { locale: string }
}

const siteUrl = 'https://www.gymwatch.ma'

const baseMetadata = {
  title: {
    default: 'GymWatch - Gestion moderne des salles de sport',
    template: '%s | GymWatch',
  },
  description:
    "GymWatch aide les salles de sport à piloter leurs abonnements, leurs membres et leurs revenus grâce à un tableau de bord intelligent.",
  applicationName: 'GymWatch',
  generator: 'v0.app',
  keywords: ['salle de sport', 'abonnements', 'fitness', 'gestion', 'logiciel'],
  authors: [{ name: 'GymWatch' }],
  creator: 'GymWatch',
  publisher: 'GymWatch',
  openGraph: {
    title: 'GymWatch - Centralisez la gestion de vos clubs de fitness',
    description:
      'Tableau de bord multi-locataires pour suivre vos membres, abonnements et revenus en temps réel.',
    siteName: 'GymWatch',
    type: 'website',
    images: [
      {
        url: '/hero-grid.svg',
        width: 1600,
        height: 1200,
        alt: 'Motif abstrait GymWatch',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@gymwatch',
    title: 'GymWatch - La solution de gestion des salles de sport',
    description:
      'Automatisez vos abonnements, simplifiez vos opérations et inspirez vos membres avec GymWatch.',
    images: ['/hero-grid.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/GymWatch.svg',
  },
} satisfies Metadata

function normalizeLocale(locale: string): AppLocale {
  const supported = routing.locales.find((value) => value === locale) as AppLocale | undefined
  if (!supported) {
    notFound()
  }
  return supported
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const locale = normalizeLocale(params.locale)

  const languageAlternates = routing.locales.reduce(
    (acc, current) => ({ ...acc, [current]: `/${current}` }),
    {} as Record<AppLocale, string>
  )

  const openGraphLocale = locale === 'en' ? 'en_US' : locale === 'ar' ? 'ar' : 'fr_FR'

  return {
    ...baseMetadata,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates,
    },
    openGraph: {
      ...baseMetadata.openGraph,
      locale: openGraphLocale,
      url: `${siteUrl}/${locale}`,
    },
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = normalizeLocale(params.locale)

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <ReactQueryProvider>
            <Toaster />
            <main>{children}</main>
          </ReactQueryProvider>
        </AuthProvider>
      </ThemeProvider>
      <Analytics />
    </NextIntlClientProvider>
  )
}
