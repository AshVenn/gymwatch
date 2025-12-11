import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { routing, type AppLocale } from '@/i18n/routing'
import { buildMarketingMetadata, getMarketingCopy } from '@/lib/marketing-content'
import { DEFAULT_ANNUAL_DISCOUNT, getPlanCatalogAsList } from '@/lib/subscription-plans'

type PlansPageProps = {
  params: { locale: string }
}

const pricingFaqs = [
  {
    question: 'Comment fonctionne la facturation annuelle ?',
    answer: `Le mode annuel applique automatiquement une remise de ${DEFAULT_ANNUAL_DISCOUNT}% et présente un montant mensuel équivalent. La facture annuelle est émise en une fois.`,
  },
  {
    question: 'Peut-on changer de plan en cours de route ?',
    answer:
      'Oui, vous pouvez passer du plan Basic au plan Pro ou Enterprise à tout moment. Les nouvelles fonctionnalités sont débloquées immédiatement.',
  },
  {
    question: 'Le contrôle d’accès est-il inclus ?',
    answer:
      'Oui dans les plans Pro et Enterprise. Vous pouvez gérer les droits par salle, suivre les passages et déclencher des alertes en temps réel.',
  },
  {
    question: 'Proposez-vous une assistance au déploiement multi-sites ?',
    answer:
      'Oui, nous accompagnons les réseaux pour la migration des données, la configuration des accès et la formation des équipes locales.',
  },
]

export async function generateMetadata({ params }: PlansPageProps): Promise<Metadata> {
  const locale = routing.locales.includes(params.locale as AppLocale)
    ? (params.locale as AppLocale)
    : routing.defaultLocale

  return buildMarketingMetadata('plans', locale)
}

export default async function PlansPage() {
  const locale = (await getLocale()) as AppLocale
  const heroCopy = getMarketingCopy(locale).hero.plans

  const planCatalog = getPlanCatalogAsList()
  const priceFormatter = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' })
  const renderPlanCards = (mode: 'monthly' | 'annual') =>
    planCatalog.map((plan, index) => {
      const annualTotal = plan.annualPrice ?? plan.monthlyPrice * 12
      const annualMonthly = Math.round((annualTotal / 12) * 100) / 100
      const price = mode === 'annual' ? annualMonthly : plan.monthlyPrice
      const billingHint =
        mode === 'annual'
          ? `Facturé ${priceFormatter.format(annualTotal)} / an`
          : 'Facturation mensuelle, sans engagement'

      return (
        <Card
          key={`${plan.tier}-${mode}`}
          className={`relative overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            plan.highlight ? 'border-primary/60 bg-primary/5' : 'border-border/70 bg-background/80'
          } animate-slide-up`}
          style={{ animationDelay: `${0.05 + index * 0.05}s` }}
        >
          {plan.highlight && (
            <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-md">
              Recommandé
            </span>
          )}
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">{priceFormatter.format(price)}</span>
              <span className="text-sm text-muted-foreground">/ mois</span>
            </div>
            <p className="text-sm text-muted-foreground">{billingHint}</p>
            {mode === 'annual' && (
              <p className="text-xs font-semibold text-primary">Économisez {DEFAULT_ANNUAL_DISCOUNT}% avec l&apos;annuel</p>
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
            <Button asChild variant={plan.highlight ? 'default' : 'outline'} className="w-full mt-2">
              <Link href="/request-demo">Démarrer</Link>
            </Button>
          </CardContent>
        </Card>
      )
    })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            {heroCopy.eyebrow}
          </p>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">{heroCopy.title}</h1>
          <p className="max-w-3xl text-lg font-semibold text-primary">{heroCopy.subtitle}</p>
          <p className="max-w-3xl text-lg text-muted-foreground">{heroCopy.description}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="hover:shadow-lg">
              <Link href="/request-demo">{heroCopy.primaryCta}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">{heroCopy.secondaryCta}</Link>
            </Button>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 px-6 py-10 shadow-lg backdrop-blur">
          <div className="floating-orb-primary right-[15%] top-[-120px] opacity-25" />
          <div className="floating-orb-secondary left-[10%] bottom-[-120px] opacity-20" />
          <div className="relative space-y-6">
            <input id="pricing-monthly" type="radio" name="pricing" defaultChecked className="peer/pricing-monthly sr-only" />
            <input id="pricing-annual" type="radio" name="pricing" className="peer/pricing-annual sr-only" />
            <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur">
              <label
                htmlFor="pricing-monthly"
                className="flex-1 cursor-pointer rounded-full px-3 py-2 text-center text-sm font-semibold text-muted-foreground transition peer-checked/pricing-monthly:bg-primary peer-checked/pricing-monthly:text-primary-foreground peer-checked/pricing-monthly:shadow-md"
              >
                Mensuel
              </label>
              <label
                htmlFor="pricing-annual"
                className="flex-1 cursor-pointer rounded-full px-3 py-2 text-center text-sm font-semibold text-muted-foreground transition peer-checked/pricing-annual:bg-primary peer-checked/pricing-annual:text-primary-foreground peer-checked/pricing-annual:shadow-md"
              >
                Annuel (-{DEFAULT_ANNUAL_DISCOUNT}%)
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-3 peer-checked/pricing-annual:hidden">
              {renderPlanCards('monthly')}
            </div>
            <div className="hidden gap-6 md:grid-cols-3 peer-checked/pricing-annual:grid peer-checked/pricing-monthly:hidden">
              {renderPlanCards('annual')}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 animate-fade-in" style={{ animationDelay: '0.08s' }}>
          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Inclus dans tous les plans</CardTitle>
              <CardDescription>Support, sécurité et mise à jour continue pour vos clubs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Accès web sécurisé, sauvegardes régulières et chiffrement des données.</p>
              <p>Support email prioritaire pour vos équipes siège et clubs.</p>
              <p>Améliorations produit continues sans interruption de service.</p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Déploiement multi-salles</CardTitle>
              <CardDescription>Onboarding et migration guidée pour les réseaux.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Migration des membres, abonnements et historiques de paiements.</p>
              <p>Configuration des droits par site et formation des équipes front desk.</p>
              <p>Support dédié pendant la phase de lancement.</p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.12s' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">FAQ Tarifs</p>
              <h2 className="text-3xl font-bold">Questions sur la tarification</h2>
              <p className="max-w-2xl text-muted-foreground">
                Tout savoir sur la facturation, les remises annuelles et le déploiement pour votre réseau de salles de sport.
              </p>
            </div>
            <Button asChild variant="ghost" className="text-primary underline-offset-4 hover:underline">
              <Link href="/faqs">Voir toutes les FAQs</Link>
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
