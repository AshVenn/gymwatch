// app/[locale]/(marketing)/page.tsx
import type { Metadata } from "next"
import { cache } from "react"
import Image from "next/image"
import {
  ArrowRight,
  Headphones,
  Sparkles,
  Building2,
  QrCode,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Users,
  FileDown,
  Workflow,
  PlugZap,
} from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, type AppLocale } from "@/i18n/routing"
import { buildMarketingMetadata } from "@/lib/marketing-content"
import {
  DEFAULT_ANNUAL_DISCOUNT,
  getPlanCatalogAsList,
  getPlanCatalogAsListLocalized,
  PLAN_PRICING,
} from "@/lib/subscription-plans"
import { cn } from "@/lib/utils"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { PlanCard } from "../../../components/pricing/plan-card"
import { getPlanPricing } from "@/lib/plan-settings"

const getCachedPlanPricing = cache(async () => {
  try {
    return await getPlanPricing()
  } catch {
    return PLAN_PRICING
  }
})

type HomePageProps = {
  params: Promise<{ locale: string }>
}

type StatItem = { value: string; label: string; detail: string }
type PillarItem = { title: string; description: string; icon: React.ElementType }
type FeatureItem = { title: string; description: string; icon: React.ElementType }
type TestimonialItem = { quote: string; author: string; role: string }
type FaqItem = { question: string; answer: string }

function roundPrice(raw: number): number {
  if (raw >= 100) return Math.round(raw / 10) * 10
  if (raw >= 10) return Math.round(raw / 5) * 5
  return Math.round(raw)
}

// Static params per locale
export function generateStaticParams() {
  return ["fr", "ar", "en"].map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  return buildMarketingMetadata("home", locale as AppLocale)
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params
      setRequestLocale(locale)

  // IMPORTANT:
  // This file expects translations under namespace: "marketing.home"
  // (so your JSON should have: { "marketing": { "home": { ... }}} )
  const t = await getTranslations({ locale, namespace: "marketing.home" })

  const pricing = await getCachedPlanPricing()

  let planCatalog = getPlanCatalogAsList(pricing)
  try {
    const tCatalog = await getTranslations({ locale, namespace: "subscriptionPlans" })
    planCatalog = getPlanCatalogAsListLocalized(tCatalog, pricing)
  } catch {
    // fallback to default FR catalog
  }

  const currencyFormatter = new Intl.NumberFormat(
  locale === "fr" ? "fr-MA" : locale === "ar" ? "ar-MA" : "en-US",
  {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
)

  const stats: StatItem[] = [
    { value: t("stats.clubs.value"), label: t("stats.clubs.label"), detail: t("stats.clubs.detail") },
    { value: t("stats.members.value"), label: t("stats.members.label"), detail: t("stats.members.detail") },
    { value: t("stats.satisfaction.value"), label: t("stats.satisfaction.label"), detail: t("stats.satisfaction.detail") },
  ]

  const pillars: PillarItem[] = [
    { title: t("pillars.multiSite.title"), description: t("pillars.multiSite.body"), icon: Building2 },
    { title: t("pillars.accessControl.title"), description: t("pillars.accessControl.body"), icon: QrCode },
    { title: t("pillars.billing.title"), description: t("pillars.billing.body"), icon: CreditCard },
  ]

  const features: FeatureItem[] = [
    { title: t("features.directorView.title"), description: t("features.directorView.body"), icon: BarChart3 },
    { title: t("features.access.title"), description: t("features.access.body"), icon: QrCode },
    { title: t("features.automation.title"), description: t("features.automation.body"), icon: Workflow },
    { title: t("features.subscriptions.title"), description: t("features.subscriptions.body"), icon: CreditCard },
    { title: t("features.teams.title"), description: t("features.teams.body"), icon: Users },
    { title: t("features.reporting.title"), description: t("features.reporting.body"), icon: FileDown },
    { title: t("features.security.title"), description: t("features.security.body"), icon: ShieldCheck },
    { title: t("features.api.title"), description: t("features.api.body"), icon: PlugZap },
  ]

  const testimonials: TestimonialItem[] = [
    { quote: t("testimonials.amine.quote"), author: t("testimonials.amine.author"), role: t("testimonials.amine.role") },
    { quote: t("testimonials.sarah.quote"), author: t("testimonials.sarah.author"), role: t("testimonials.sarah.role") },
    {
      quote: t("testimonials.youssef.quote"),
      author: t("testimonials.youssef.author"),
      role: t("testimonials.youssef.role"),
    },
  ]

  const faq: FaqItem[] = [
    { question: t("faq.q1.question"), answer: t("faq.q1.answer") },
    { question: t("faq.q2.question"), answer: t("faq.q2.answer") },
    { question: t("faq.q3.question"), answer: t("faq.q3.answer") },
    { question: t("faq.q4.question"), answer: t("faq.q4.answer") },
    { question: t("faq.q5.question"), answer: t("faq.q5.answer") },
  ]

  const renderPlanCards = (mode: "monthly" | "annual") =>
    planCatalog.map((plan, index) => {
      const annualTotal = plan.annualPrice ?? plan.monthlyPrice * 12
      const annualMonthly = annualTotal / 12
      const rawPrice = mode === "annual" ? annualMonthly : plan.monthlyPrice
      const price = roundPrice(rawPrice)

      const billingHint =
        mode === "annual"
          ? t("plans.billing.annualHint", { amount: currencyFormatter.format(roundPrice(annualTotal)) })
          : t("plans.billing.monthlyHint")

      const tierKey = plan.tier.toLowerCase() as "basic" | "pro" | "enterprise"
      const planName = t(`plans.catalog.${tierKey}.name`)
      const planDescription = t(`plans.catalog.${tierKey}.description`)
      const badges = (t.raw(`plans.catalog.${tierKey}.badges`) ?? []) as string[]
      const planFeatures = (t.raw(`plans.catalog.${tierKey}.features`) ?? []) as string[]

      return (
        <PlanCard
          key={`${plan.tier}-${mode}`}
          tier={tierKey}
          planName={planName}
          description={planDescription}
          price={price}
          priceLabel={currencyFormatter.format(price)}
          billingHint={billingHint}
          badges={badges}
          features={planFeatures}
          ctaLabel={t("plans.cta")}
          ctaHref="/request-demo"
          isHighlighted={plan.highlight}
          highlightLabel={plan.highlight ? t("plans.recommended") : undefined}
          showAnnualSavings={mode === "annual"}
          annualSavingsText={
            mode === "annual" ? t("plans.billing.annualSave", { discount: DEFAULT_ANNUAL_DISCOUNT }) : undefined
          }
          perMonthLabel={t("plans.billing.perMonth")}
          animationDelay={`${0.08 + index * 0.05}s`}
        />
      )
    })

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_75%_10%,rgba(99,102,241,0.10),transparent_40%),radial-gradient(circle_at_65%_75%,rgba(14,165,233,0.11),transparent_50%)] animate-pulse-slow" />
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl animate-float-slow-reverse" />
      </div>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-16 pt-10 md:pt-16">
        <header
          id="hero"
          className={cn(
            "relative overflow-hidden rounded-3xl border border-border/50 bg-card/95 px-6 py-14 shadow-2xl backdrop-blur-md md:px-16",
            locale === "ar" ? "rtl text-right" : "ltr text-left",
          )}
        >
          <div className="floating-orb-primary -left-16 -top-24 opacity-90" />
          <div className="floating-orb-secondary -right-24 top-[15%] opacity-80" />
          <div className="floating-orb-tertiary left-[8%] -bottom-24 opacity-75" />

          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6 animate-fade-in">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
                <Sparkles className="h-4 w-4" aria-hidden />
                {t("hero.eyebrow")}
              </p>

              <h1 className="text-balance text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl">
                {t("hero.title")}
              </h1>

              <p className="max-w-xl text-lg font-semibold text-primary">{t("hero.subtitle")}</p>

              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {t("hero.description")}
              </p>

              <div className={cn("flex flex-wrap gap-3 pt-2", locale === "ar" ? "justify-end" : "justify-start")}>
                <Button asChild size="lg" className="group transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <Link href="/request-demo">
                    <span className="inline-flex items-center gap-2">
                      {t("hero.primaryCta")}
                      <ArrowRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-300 group-hover:translate-x-1",
                          locale === "ar" && "rotate-180 group-hover:-translate-x-1",
                        )}
                        aria-hidden
                      />
                    </span>
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-transparent transition-all duration-300 hover:border-primary/30 hover:bg-primary/5"
                >
                  <Link href="/login">{t("hero.secondaryCta")}</Link>
                </Button>
              </div>

              <div className="grid gap-6 border-t border-border/40 pt-6 sm:grid-cols-3">
                {stats.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="animate-slide-up space-y-1"
                    style={{ animationDelay: `${0.05 * (index + 1)}s` }}
                  >
                    <p className="text-3xl font-bold tracking-tight text-foreground">{item.value}</p>
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground/70">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="perspective mx-auto flex w-full max-w-xl items-center justify-center">
                <div className="group relative w-full hover-lift">
                  <Image
                    src="/featured-plateforme.png"
                    alt={t("hero.dashboard.imageAlt")}
                    width={1200}
                    height={900}
                    priority
                    className="h-auto w-full rounded-2xl border border-border/50 object-contain shadow-2xl ring-1 ring-black/5 transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:shadow-3xl dark:ring-white/5"
                  />

                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

                  <div
                    className={cn(
                      "absolute top-3 md:top-4",
                      locale === "ar" ? "-right-4 md:-right-6" : "-left-4 md:-left-6",
                      "animate-float-left",
                    )}
                  >
                    <div className="rounded-full border border-primary/20 bg-primary/95 px-2 py-1 text-[10px] font-semibold text-primary-foreground shadow-lg backdrop-blur-sm md:px-3 md:py-1.5 md:text-xs">
                      {t("hero.dashboard.chips.access")}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "absolute top-1/3",
                      locale === "ar" ? "-left-6 md:-left-8" : "-right-6 md:-right-8",
                      "animate-float-right",
                    )}
                  >
                    <div className="rounded-full border border-primary/20 bg-primary/95 px-2 py-1 text-[10px] font-semibold text-primary-foreground shadow-lg backdrop-blur-sm md:px-3 md:py-1.5 md:text-xs">
                      {t("hero.dashboard.chips.kpi")}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2",
                      locale === "ar" ? "-left-8 md:-left-12" : "-right-8 md:-right-12",
                      "animate-float-up",
                    )}
                  >
                    <div className="rounded-full border border-primary/20 bg-primary/95 px-2 py-1 text-[10px] font-semibold text-primary-foreground shadow-lg backdrop-blur-sm md:px-3 md:py-1.5 md:text-xs">
                      {t("hero.dashboard.chips.analytics")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section id="pourquoi" className="space-y-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("sections.why.eyebrow")}</p>
              <h2 className="text-3xl font-bold tracking-tight">{t("sections.why.title")}</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">{t("sections.why.description")}</p>
            </div>
            <Button asChild variant="ghost" className="text-primary underline-offset-4 transition-all hover:underline">
              <Link href="/features">{t("sections.why.cta")}</Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon
              return (
                <Card
                  key={`${pillar.title}-${index}`}
                  className="group relative overflow-hidden border border-border/60 bg-card/95 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40 hover:shadow-xl animate-slide-up"
                  style={{ animationDelay: `${0.05 + index * 0.05}s` }}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardHeader className="relative space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <CardTitle className="text-xl transition-colors duration-300 group-hover:text-primary">
                      {pillar.title}
                    </CardTitle>
                    <CardDescription className="leading-relaxed">{pillar.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        <section id="features" className="space-y-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                {t("sections.features.eyebrow")}
              </p>
              <h2 className="text-3xl font-bold">{t("sections.features.title")}</h2>
              <p className="max-w-2xl text-muted-foreground">{t("sections.features.description")}</p>
            </div>
            <Button asChild variant="outline" className="rounded-full bg-transparent">
              <Link href="/features">{t("sections.features.cta")}</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={`${feature.title}-${index}`}
                  className="group flex h-full flex-col justify-between border border-border/60 bg-card/90 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-xl animate-slide-up"
                  style={{ animationDelay: `${0.05 + index * 0.04}s` }}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-105 group-hover:bg-primary/15">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <CardTitle className="text-xl transition-colors group-hover:text-primary">
                        {feature.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        <section
          id="plans"
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 px-6 py-12 shadow-lg backdrop-blur"
        >
          <div className="floating-orb-primary right-[12%] -top-35 opacity-30" />
          <div className="floating-orb-secondary left-[8%] -bottom-30 opacity-20" />

          <div className="relative space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("sections.plans.eyebrow")}</p>
            <h2 className="text-3xl font-bold">{t("sections.plans.title")}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {t("sections.plans.description", { discount: DEFAULT_ANNUAL_DISCOUNT })}
            </p>
          </div>

          <div className="relative mt-8 space-y-8">
            <input
              type="radio"
              name="billing-mode"
              id="billing-monthly"
              value="monthly"
              defaultChecked
              className="peer/billing-monthly sr-only"
            />
            <input type="radio" name="billing-mode" id="billing-annual" value="annual" className="peer/billing-annual sr-only" />

            <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1.5 shadow-inner">
              <label
                htmlFor="billing-monthly"
                className="cursor-pointer rounded-full px-6 py-2.5 text-sm font-semibold transition-all
                peer-checked/billing-monthly:bg-primary peer-checked/billing-monthly:text-primary-foreground peer-checked/billing-monthly:shadow-md
                text-muted-foreground hover:text-foreground"
              >
                {t("plans.toggle.monthly")}
              </label>

              <label
                htmlFor="billing-annual"
                className="flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all
                peer-checked/billing-annual:bg-primary peer-checked/billing-annual:text-primary-foreground peer-checked/billing-annual:shadow-md
                text-muted-foreground hover:text-foreground"
              >
                {t("plans.toggle.annual", { discount: DEFAULT_ANNUAL_DISCOUNT })}
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-3 peer-checked/billing-annual:hidden">{renderPlanCards("monthly")}</div>
            <div className="hidden gap-6 md:grid-cols-3 peer-checked/billing-annual:grid peer-checked/billing-monthly:hidden">
              {renderPlanCards("annual")}
            </div>
          </div>
        </section>

        <section id="temoignages" className="space-y-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("sections.testimonials.eyebrow")}</p>
            <h2 className="text-3xl font-bold">{t("sections.testimonials.title")}</h2>
            <p className="max-w-2xl text-muted-foreground">{t("sections.testimonials.description")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item, index) => (
              <Card
                key={`${item.author}-${index}`}
                className="relative h-full border border-border/70 bg-card/70 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg animate-slide-up"
                style={{ animationDelay: `${0.04 + index * 0.06}s` }}
              >
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <p className="text-lg font-semibold text-foreground">“{item.quote}”</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Headphones className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.author}</p>
                      <p>{item.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="space-y-6 animate-fade-in" style={{ animationDelay: "0.12s" }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("sections.faq.eyebrow")}</p>
              <h2 className="text-3xl font-bold">{t("sections.faq.title")}</h2>
              <p className="max-w-2xl text-muted-foreground">{t("sections.faq.description")}</p>
            </div>
            <Button asChild variant="ghost" className="text-primary underline-offset-4 hover:underline">
              <Link href="/faqs">{t("sections.faq.cta")}</Link>
            </Button>
          </div>

          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur">
            <CardContent className="p-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faq.map((item, index) => (
                  <AccordionItem
                    key={`${item.question}-${index}`}
                    value={`faq-${index + 1}`}
                    className="rounded-xl border border-border/60 px-3 data-[state=open]:border-primary/50 data-[state=open]:bg-primary/5"
                  >
                    <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-base leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        <section
          id="contact"
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-card via-card/80 to-card/60 px-8 py-12 shadow-lg animate-fade-in"
          style={{ animationDelay: "0.14s" }}
        >
          <div className="floating-orb-secondary -right-15 -top-20 opacity-25" />
          <div className="floating-orb-tertiary -left-10 -bottom-20 opacity-20" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("sections.contact.eyebrow")}</p>
              <h2 className="text-3xl font-bold">{t("sections.contact.title")}</h2>
              <p className="max-w-2xl text-muted-foreground">{t("sections.contact.description")}</p>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="transition hover:scale-[1.02] hover:shadow-lg">
                  <Link href="/request-demo">{t("sections.contact.primaryCta")}</Link>
                </Button>

                <Button asChild variant="secondary" className="transition hover:scale-[1.02] hover:shadow-lg">
                  <a
                    href={`mailto:${t("sections.contact.supportEmail")}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("sections.contact.secondaryCta")}
                  </a>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Headphones className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("sections.contact.supportTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("sections.contact.supportSubtitle")}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  {t("sections.contact.emailLabel")}{" "}
                  <a
                    href={`mailto:${t("sections.contact.supportEmail")}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("sections.contact.supportEmail")}
                  </a>
                </p>
                <p>{t("sections.contact.availability")}</p>
                <p>{t("sections.contact.deployment")}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
