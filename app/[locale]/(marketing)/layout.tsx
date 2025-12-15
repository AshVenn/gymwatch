import type { ReactNode } from "react"
import type { AppLocale } from "@/i18n/routing"
import { MarketingNavbar } from "@/components/marketing/navbar"
import { MarketingFooter } from "@/components/marketing/footer"

export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: AppLocale }>
}) {
  const { locale } = await params

  return (
    <>
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter locale={locale} />
    </>
  )
}
