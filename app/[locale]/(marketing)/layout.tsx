import type { ReactNode } from "react"
import { MarketingFooter } from "@/components/marketing/footer"

type MarketingLayoutProps = {
  children: ReactNode
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
