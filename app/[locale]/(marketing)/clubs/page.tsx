// app/[locale]/(marketing)/clubs/page.tsx
import type { Metadata } from "next"
import Image from "next/image"
import { MapPin, ExternalLink, Sparkles } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link, type AppLocale } from "@/i18n/routing"
import { buildMarketingMetadata } from "@/lib/marketing-content"
import { getPublishedPartnerClubs } from "@/lib/partners"
import { cn } from "@/lib/utils"

export const revalidate = 1800

type ClubsPageProps = {
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return ["fr", "ar", "en"].map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: ClubsPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  return buildMarketingMetadata("clubs", locale as AppLocale)
}

export default async function ClubsPage({ params }: ClubsPageProps) {
  const { locale } = await params
  const appLocale = locale as AppLocale
  setRequestLocale(appLocale)

  const t = await getTranslations({ locale: appLocale, namespace: "marketing.clubsPage" })
  const clubs = await getPublishedPartnerClubs(appLocale)
  const isRtl = appLocale === "ar"

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.10),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.12),transparent_50%)]" />

      <main className={cn("relative z-10 mx-auto max-w-6xl px-4 py-16", isRtl ? "rtl text-right" : "ltr text-left")}>
        <section className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 px-6 py-12 shadow-xl backdrop-blur-sm md:px-12">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary ring-1 ring-primary/20">
                <Sparkles className="h-4 w-4" aria-hidden />
                {t("hero.eyebrow")}
              </p>
              <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">{t("hero.title")}</h1>
              <p className="text-lg font-semibold text-primary">{t("hero.subtitle")}</p>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{t("hero.description")}</p>

              <div className={cn("flex flex-wrap gap-3", isRtl ? "justify-end" : "justify-start")}>
                <Link
                  href="/request-demo"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
                >
                  {t("hero.primaryCta")}
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  {t("hero.secondaryCta")}
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-primary/5 via-card/80 to-card/60 p-6 shadow-lg">
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t("highlights.asset")}</p>
                    <p className="text-xs text-muted-foreground">{t("highlights.assetDesc")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t("highlights.localization")}</p>
                    <p className="text-xs text-muted-foreground">{t("highlights.localizationDesc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("grid.eyebrow")}</p>
              <h2 className="text-3xl font-bold">{t("grid.title")}</h2>
              <p className="max-w-3xl text-muted-foreground">{t("grid.subtitle")}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("grid.count", { count: clubs.length })}
            </div>
          </div>

          {clubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-6 text-center">
              <p className="text-lg font-semibold">{t("grid.empty.title")}</p>
              <p className="text-sm text-muted-foreground">{t("grid.empty.subtitle")}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {clubs.map((club) => (
                <article
                  key={club.id}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-lg transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl"
                >
                  <div className="relative h-48 w-full overflow-hidden border-b border-border/60 bg-muted">
                    {club.coverUrl ? (
                      <Image
                        src={club.coverUrl}
                        alt={club.name}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-linear-to-r from-primary/10 via-card to-secondary/10 text-sm text-muted-foreground">
                        {t("grid.missingCover")}
                      </div>
                    )}
                    {club.logoUrl && (
                      <div className={cn("absolute top-4", isRtl ? "right-4" : "left-4")}>
                        <div className="overflow-hidden rounded-xl border border-border/80 bg-background/90 p-2 shadow-lg backdrop-blur">
                          <Image src={club.logoUrl} alt={`${club.name} logo`} width={96} height={64} className="h-12 w-auto object-contain" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">{club.name}</p>
                        {club.tagline && <p className="text-sm text-primary">{club.tagline}</p>}
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
                        {t("grid.badge")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden />
                      <span>
                        {club.city || club.country
                          ? [club.city, club.country].filter(Boolean).join(", ")
                          : t("grid.locationUnknown")}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {club.description || club.tagline || t("grid.fallbackDescription")}
                    </p>

                    <div className={cn("flex items-center justify-between gap-3", isRtl ? "flex-row-reverse" : "flex-row")}>
                      <div className="text-xs text-muted-foreground">
                        {t("grid.slug", { slug: club.slug })}
                      </div>
                      {club.websiteUrl && (
                        <a
                          href={club.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40 hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden />
                          {t("grid.visit")}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
