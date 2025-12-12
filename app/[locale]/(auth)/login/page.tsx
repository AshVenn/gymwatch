import type { AppLocale } from '@/i18n/routing'
import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'

import { LoginClient } from './login-client'
import { routing } from '@/i18n/routing'

type LoginPageProps = {
  params: { locale: string }
}

function resolveLocale(rawLocale: string): AppLocale | null {
  return routing.locales.includes(rawLocale as AppLocale)
    ? (rawLocale as AppLocale)
    : null
}

export default async function LoginPage({ params }: LoginPageProps) {
  const locale = resolveLocale(params.locale)
  if (!locale) {
    notFound()
  }

  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LoginClient localeFromServer={locale} />
    </NextIntlClientProvider>
  )
}
