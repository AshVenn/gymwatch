import type { ReactNode } from 'react'

import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'

import { routing, type AppLocale } from '@/i18n/routing'

type DashboardGroupLayoutProps = {
  children: ReactNode
  params: { locale: string }
}

function resolveLocale(rawLocale: string): AppLocale | null {
  return routing.locales.includes(rawLocale as AppLocale)
    ? (rawLocale as AppLocale)
    : null
}

export default async function DashboardGroupLayout({ children, params }: DashboardGroupLayoutProps) {
  const locale = resolveLocale(params.locale)
  if (!locale) {
    notFound()
  }

  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
