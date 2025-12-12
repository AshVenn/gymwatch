import type { ReactNode } from 'react'
import localFont from 'next/font/local'
import { headers } from 'next/headers'

import { routing, type AppLocale } from '@/i18n/routing'
import './globals.css'

type RootLayoutProps = {
  children: ReactNode
  params?: { locale?: string } | Promise<{ locale?: string }>
}

// --- Local Fonts ---
const latinFont = localFont({
  src: [
    {
      path: './fonts/VarelaRound-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-latin',
  display: 'swap',
})

const arabicFont = localFont({
  src: [
    {
      path: './fonts/NotoSansArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-arabic',
  display: 'swap',
})

const rtlLocales = new Set<AppLocale>(['ar'])

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const resolvedParams = await Promise.resolve(params)
  const localeFromParams = resolvedParams?.locale
  const localeFromHeader = (await headers()).get('x-next-intl-locale')

  const localeCandidates = [localeFromParams, localeFromHeader, routing.defaultLocale]
  const locale = localeCandidates.find((value) =>
    routing.locales.includes(value as AppLocale),
  ) as AppLocale

  const isRTL = rtlLocales.has(locale)
  const direction = isRTL ? 'rtl' : 'ltr'

  const fontClass = isRTL ? arabicFont.className : latinFont.className

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body
        className={[
          latinFont.variable,
          arabicFont.variable,
          fontClass,
          'antialiased',
        ].join(' ')}
      >
        {children}
      </body>
    </html>
  )
}
