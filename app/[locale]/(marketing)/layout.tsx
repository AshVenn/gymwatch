import type { ReactNode } from "react"
import type { AppLocale } from "@/i18n/routing"
import { MarketingNavbar } from "@/components/marketing/navbar"
import { MarketingFooter } from "@/components/marketing/footer"

export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = locale as AppLocale

  return (
    <>
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter locale={resolvedLocale} />
    </>
  )
}
