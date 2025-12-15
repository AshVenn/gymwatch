import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link, type AppLocale } from "@/i18n/routing"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DEFAULT_ANNUAL_DISCOUNT,
  getPlanCatalogAsListLocalized,
  getPlanCatalogAsList,
} from "@/lib/subscription-plans"

type PlansPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: PlansPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "plans.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
  }
}

function getNumberLocale(locale: AppLocale) {
  if (locale === "ar") return "ar-MA"
  if (locale === "en") return "en-US"
  return "fr-MA"
}

export default async function PlansPage({ params }: PlansPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "plans" })

  // ✅ Plans catalog translated via next-intl (fallback to FR if missing keys)
  let planCatalog = getPlanCatalogAsList()
  try {
    const tCatalog = await getTranslations({ locale, namespace: "subscriptionPlans" })
    planCatalog = getPlanCatalogAsListLocalized(tCatalog)
  } catch {
    // if subscriptionPlans namespace not ready yet, keep default FR catalog
  }

  const priceFormatter = new Intl.NumberFormat(getNumberLocale(locale), { style: "currency", currency: "MAD" })

  const pricingFaqs = [
    {
      question: t("faq.items.annualBilling.q"),
      answer: t("faq.items.annualBilling.a", { discount: DEFAULT_ANNUAL_DISCOUNT }),
    },
    {
      question: t("faq.items.changePlan.q"),
      answer: t("faq.items.changePlan.a"),
    },
    {
      question: t("faq.items.accessControl.q"),
      answer: t("faq.items.accessControl.a"),
    },
    {
      question: t("faq.items.multiSiteHelp.q"),
      answer: t("faq.items.multiSiteHelp.a"),
    },
  ]

  const renderPlanCards = (mode: "monthly" | "annual") =>
    planCatalog.map((plan, index) => {
      const annualTotal = plan.annualPrice ?? plan.monthlyPrice * 12
      const annualMonthly = Math.round((annualTotal / 12) * 100) / 100
      const price = mode === "annual" ? annualMonthly : plan.monthlyPrice

      const billingHint =
        mode === "annual"
          ? t("pricing.billingHintAnnual", { total: priceFormatter.format(annualTotal) })
          : t("pricing.billingHintMonthly")

      return (
        <Card
          key={`${plan.tier}-${mode}`}
          className={`relative overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            plan.highlight ? "border-primary/60 bg-primary/5" : "border-border/70 bg-background/80"
          } animate-slide-up`}
          style={{ animationDelay: `${0.05 + index * 0.05}s` }}
        >
          {plan.highlight && (
            <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-md">
              {t("pricing.recommended")}
            </span>
          )}

          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">{priceFormatter.format(price)}</span>
              <span className="text-sm text-muted-foreground">{t("pricing.perMonth")}</span>
            </div>

            <p className="text-sm text-muted-foreground">{billingHint}</p>

            {mode === "annual" && (
              <p className="text-xs font-semibold text-primary">
                {t("pricing.saveAnnual", { discount: DEFAULT_ANNUAL_DISCOUNT })}
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {plan.badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-border/70 bg-primary/5 px-2 py-1 text-[12px] font-semibold text-primary"
                >
                  {badge}
                </span>
              ))}
            </div>

            {plan.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden />
                <span>{feature}</span>
              </div>
            ))}

            <Button asChild variant={plan.highlight ? "default" : "outline"} className="w-full mt-2">
              <Link href="/request-demo">{t("pricing.start")}</Link>
            </Button>
          </CardContent>
        </Card>
      )
    })

  return (
    <div className="min-h-screen bg-background text-foreground">

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-12">
        {/* HERO */}
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            {t("hero.eyebrow")}
          </p>

          <h1 className="text-balance text-4xl font-bold md:text-5xl">{t("hero.title")}</h1>

          <p className="max-w-3xl text-lg font-semibold text-primary">{t("hero.subtitle")}</p>

          <p className="max-w-3xl text-lg text-muted-foreground">{t("hero.description")}</p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="hover:shadow-lg">
              <Link href="/request-demo">{t("hero.primaryCta")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">{t("hero.secondaryCta")}</Link>
            </Button>
          </div>
        </section>

        {/* PRICING */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 px-6 py-10 shadow-lg backdrop-blur">
          <div className="floating-orb-primary right-[15%] top-[-120px] opacity-25" />
          <div className="floating-orb-secondary left-[10%] bottom-[-120px] opacity-20" />

          <div className="relative space-y-6">
            <input
              id="pricing-monthly"
              type="radio"
              name="pricing"
              defaultChecked
              className="peer/pricing-monthly sr-only"
            />
            <input id="pricing-annual" type="radio" name="pricing" className="peer/pricing-annual sr-only" />

            {/* ✅ Selected = primary */}
            <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur">
              <label
                htmlFor="pricing-monthly"
                className="flex-1 cursor-pointer rounded-full border border-transparent px-3 py-2 text-center text-sm font-semibold text-muted-foreground transition
                  hover:bg-primary/5
                  peer-checked/pricing-monthly:bg-primary peer-checked/pricing-monthly:text-primary-foreground
                  peer-checked/pricing-monthly:border-primary peer-checked/pricing-monthly:ring-2 peer-checked/pricing-monthly:ring-primary/30
                  peer-checked/pricing-monthly:shadow-md"
              >
                {t("pricing.monthly")}
              </label>

              <label
                htmlFor="pricing-annual"
                className="flex-1 cursor-pointer rounded-full border border-transparent px-3 py-2 text-center text-sm font-semibold text-muted-foreground transition
                  hover:bg-primary/5
                  peer-checked/pricing-annual:bg-primary peer-checked/pricing-annual:text-primary-foreground
                  peer-checked/pricing-annual:border-primary peer-checked/pricing-annual:ring-2 peer-checked/pricing-annual:ring-primary/30
                  peer-checked/pricing-annual:shadow-md"
              >
                {t("pricing.annual", { discount: DEFAULT_ANNUAL_DISCOUNT })}
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-3 peer-checked/pricing-annual:hidden">
              {renderPlanCards("monthly")}
            </div>

            <div className="hidden gap-6 md:grid-cols-3 peer-checked/pricing-annual:grid peer-checked/pricing-monthly:hidden">
              {renderPlanCards("annual")}
            </div>
          </div>
        </section>

        {/* INFO */}
        <section className="grid gap-6 md:grid-cols-2 animate-fade-in" style={{ animationDelay: "0.08s" }}>
          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">{t("info.allPlans.title")}</CardTitle>
              <CardDescription>{t("info.allPlans.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {(t.raw("info.allPlans.points") as string[]).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">{t("info.multisite.title")}</CardTitle>
              <CardDescription>{t("info.multisite.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {(t.raw("info.multisite.points") as string[]).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.12s" }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("faq.kicker")}</p>
              <h2 className="text-3xl font-bold">{t("faq.title")}</h2>
              <p className="max-w-2xl text-muted-foreground">{t("faq.description")}</p>
            </div>

            <Button asChild variant="ghost" className="text-primary underline-offset-4 hover:underline">
              <Link href="/faqs">{t("faq.viewAll")}</Link>
            </Button>
          </div>

          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur">
            <CardContent className="p-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {pricingFaqs.map((item, index) => (
                  <AccordionItem
                    key={item.question}
                    value={`pricing-${index + 1}`}
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
      </main>
    </div>
  )
}
