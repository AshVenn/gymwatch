import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'

import { routing, type AppLocale } from '@/i18n/routing'

import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

type RootLayoutProps = {
  children: ReactNode
  params: { locale?: string }
}

const rtlLocales = new Set<AppLocale>(['ar'])

export default function RootLayout({ children, params }: RootLayoutProps) {
  const locale = routing.locales.includes(params?.locale as AppLocale)
    ? (params?.locale as AppLocale)
    : routing.defaultLocale
  const direction = rtlLocales.has(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
