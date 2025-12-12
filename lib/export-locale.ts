export type ExportLocale = "fr" | "en" | "ar"

const localeAliases: Record<string, ExportLocale> = {
  fr: "fr",
  "fr-fr": "fr",
  en: "en",
  "en-us": "en",
  ar: "ar",
  "ar-ma": "ar",
}

export function resolveExportLocale(raw?: string | null): ExportLocale {
  if (!raw) return "fr"
  const key = raw.toLowerCase()
  return localeAliases[key] ?? "fr"
}

export function formatExportCurrency(
  value: number,
  locale: ExportLocale,
  currency: string = "MAD",
): string {
  const tag = locale === "en" ? "en-US" : locale === "ar" ? "ar" : "fr-FR"
  return new Intl.NumberFormat(tag, { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
}

export function formatExportDate(
  value: Date,
  locale: ExportLocale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "2-digit" },
): string {
  const tag = locale === "en" ? "en-US" : locale === "ar" ? "ar" : "fr-FR"
  return new Intl.DateTimeFormat(tag, options).format(value)
}
