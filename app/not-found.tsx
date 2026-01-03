import Link from "next/link"
import Image from "next/image"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { Compass, Home, LayoutDashboard, Search } from "lucide-react"

import { routing, type AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"

export default async function NotFound() {
  const localeFromHeader = (await headers()).get("x-next-intl-locale")
  const locale = routing.locales.includes(localeFromHeader as AppLocale)
    ? (localeFromHeader as AppLocale)
    : routing.defaultLocale
  const t = await getTranslations({ locale, namespace: "notFound" })

  const homeHref = `/${locale}`
  const dashboardHref = `/${locale}/dashboard`

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-background via-muted/30 to-background">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-12">
        <div className="relative w-full overflow-hidden rounded-[32px] border border-border/60 bg-card/85 p-6 shadow-xl backdrop-blur md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-transparent" />

          <div className="relative grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-6">
              <Image src="/GymWatch.svg" alt="GymWatch" width={140} height={40} className="h-10 w-[140px]" priority />

              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t("eyebrow")}
                </span>

                <div className="text-[clamp(4.5rem,12vw,8rem)] font-bold leading-none tracking-tight text-foreground/80">
                  404
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold text-balance md:text-4xl">{t("title")}</h1>
                  <p className="text-lg text-muted-foreground text-balance">{t("description")}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                  <Link href={homeHref}>
                    <Home className="h-4 w-4" />
                    {t("primaryCta")}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2 border-border/70 bg-transparent">
                  <Link href={dashboardHref}>
                    <LayoutDashboard className="h-4 w-4" />
                    {t("secondaryCta")}
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                {t("hint")}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{t("cardTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("cardDescription")}</p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                  {t("cardHint")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
