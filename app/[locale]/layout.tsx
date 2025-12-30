// app/[locale]/layout.tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AuthProvider } from '@/app/providers/session-provider'
import { ReactQueryProvider } from '@/app/providers/react-query-provider'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { routing, type AppLocale } from '@/i18n/routing'

type LocaleLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

const siteUrl = 'https://gymwatch.ma'
const googleVerificationToken = process.env.GOOGLE_SITE_VERIFICATION?.trim()

function normalizeLocale(locale: string): AppLocale {
  const supported = routing.locales.find((value) => value === locale) as AppLocale | undefined
  if (!supported) notFound()
  return supported
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = normalizeLocale(rawLocale)

  const t = await getTranslations({ locale, namespace: 'metadata' })

  const languageAlternates = routing.locales.reduce(
    (acc, current) => ({ ...acc, [current]: `/${current}` }),
    {} as Record<AppLocale, string>
  )

  const openGraphLocale = locale === 'en' ? 'en_US' : locale === 'ar' ? 'ar' : 'fr_FR'

  const keywords = t('keywords')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  const googleVerification = googleVerificationToken?.replace(
    /^google-site-verification=/,
    ''
  )
  const verification = googleVerification ? { google: googleVerification } : undefined

  return {
    metadataBase: new URL(siteUrl),

    title: {
      default: t('titleDefault'),
      template: t('titleTemplate'),
    },

    description: t('description'),
    applicationName: 'GymWatch',
    generator: 'v0.app',
    keywords,

    authors: [{ name: 'GymWatch' }],
    creator: 'GymWatch',
    publisher: 'GymWatch',

    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates,
    },

    openGraph: {
      title: t('openGraphTitle'),
      description: t('openGraphDescription'),
      siteName: 'GymWatch',
      type: 'website',
      locale: openGraphLocale,
      url: `${siteUrl}/${locale}`,
      images: [
        {
          url: '/og_image.jpg',
          width: 1200,
          height: 630,
          alt: t('openGraphImageAlt'),
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      creator: '@gymwatch',
      title: t('twitterTitle'),
      description: t('twitterDescription'),
      images: ['/og_image.jpg'],
    },

    robots: { index: true, follow: true },

    verification,

    icons: { icon: '/GymWatch.svg' },
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params
  const locale = normalizeLocale(rawLocale)

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
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
