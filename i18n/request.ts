import {getRequestConfig} from 'next-intl/server'

import type {AppLocale} from './routing'
import {routing} from './routing'

export default getRequestConfig(async ({locale}) => {
  const resolvedLocale = routing.locales.includes(locale as AppLocale) ? (locale as AppLocale) : routing.defaultLocale

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  }
})
