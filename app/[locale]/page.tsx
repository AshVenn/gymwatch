import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  Headphones,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { routing, type AppLocale } from '@/i18n/routing'
import { buildMarketingMetadata, getMarketingCopy } from '@/lib/marketing-content'
import { DEFAULT_ANNUAL_DISCOUNT, getPlanCatalogAsList } from '@/lib/subscription-plans'

type HomePageProps = {
  params: { locale: string }
}

const stats = [
  { label: 'Clubs gérés', value: '+180', detail: 'SaaS pour salles de sport et réseaux multi-sites' },
  { label: 'Membres suivis', value: '42k', detail: 'Gestion des abonnements et du contrôle d’accès' },
  { label: 'Satisfaction', value: '98%', detail: 'Accompagnement premium et support dédié' },
]

const pillars = [
  {
    title: 'Multi-salles / multi-sites',
    description: 'Vue consolidée des clubs, pilotage centralisé et droits granulaires par équipe.',
    icon: Building2,
  },
  {
    title: 'Contrôle d’accès en temps réel',
    description: 'QR codes, badges et suivi de présence pour sécuriser vos entrées.',
    icon: ShieldCheck,
  },
  {
    title: 'Abonnements et paiements',
    description: 'Encaissement, factures propres et relances automatiques sans tableur.',
    icon: CreditCard,
  },
]

const featureCards = [
  {
    title: 'Vue directeur réseau',
    description: 'Tableaux de bord consolidés pour vos KPI multi-sites et la fréquentation par club.',
    icon: BarChart3,
  },
  {
    title: 'Contrôle d’accès',
    description: 'Logs instantanés, alertes et contrôle des droits par salle, badge ou QR code.',
    icon: QrCode,
  },
  {
    title: 'Automatisations et relances',
    description: 'Emails/SMS sur échéances, impayés et renouvellements pour réduire le churn.',
    icon: Bell,
  },
  {
    title: 'Gestion des abonnements',
    description: 'Contrats, freeze, reconductions et prorata pour une facturation claire.',
    icon: Workflow,
  },
  {
    title: 'Supervision des équipes',
    description: 'Rôles, permissions et audit des actions sensibles pour chaque club.',
    icon: Users,
  },
  {
    title: 'Reporting exportable',
    description: 'Exports CSV/PDF pour finances, comptabilité et franchiseurs.',
    icon: LayoutDashboard,
  },
  {
    title: 'Fiabilité et sécurité',
    description: 'Chiffrement, sauvegardes et disponibilité pour un logiciel de gestion de salle de sport robuste.',
    icon: ShieldCheck,
  },
  {
    title: 'API et intégrations',
    description: 'Connexion à votre CRM, site vitrine ou tourniquets sans perdre de données.',
    icon: Globe2,
  },
]

const testimonials = [
  {
    quote:
      'GymWatch a structuré notre réseau multi-salles. Les indicateurs sont clairs et le contrôle d’accès évite les abus.',
    author: 'Amine L.',
    role: 'Directeur réseau (8 salles)',
  },
  {
    quote:
      'Les relances automatisées ont fait baisser nos impayés et libéré du temps à l’accueil. Interface premium, zéro friction.',
    author: 'Sarah M.',
    role: 'COO franchise fitness',
  },
  {
    quote:
      'Onboarding en 48h, équipe réactive, données sécurisées. C’est le SaaS pour salles de sport que l’on cherchait.',
    author: 'Youssef K.',
    role: 'Responsable opérations',
  },
]

const faqItems = [
  {
    question: 'Le logiciel gère-t-il les réseaux multi-salles / multi-sites ?',
    answer:
      'Oui. GymWatch offre une vue consolidée et des filtres par club pour vos membres, abonnements, contrôle d’accès et reporting.',
  },
  {
    question: 'Comment fonctionne le contrôle d’accès ?',
    answer:
      'QR codes ou badges, validation en temps réel et alertes immédiates. Les droits sont pilotés par site, type d’abonnement et plage horaire.',
  },
  {
    question: 'Peut-on automatiser les relances et paiements ?',
    answer:
      'Oui, les relances email/SMS sur échéances et impayés sont natives. Les factures sont générées automatiquement et exportables.',
  },
  {
    question: 'Y a-t-il un accompagnement au déploiement ?',
    answer:
      'Notre équipe vous accompagne dans la migration des données, la mise en place des accès et la formation des équipes en quelques jours.',
  },
  {
    question: 'Le service est-il sécurisé ?',
    answer:
      'Chiffrement, sauvegardes, rôles granulaires et audit des actions sensibles pour un logiciel de gestion de salle de sport fiable.',
  },
]

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const locale = routing.locales.includes(params.locale as AppLocale)
    ? (params.locale as AppLocale)
    : routing.defaultLocale

  return buildMarketingMetadata('home', locale)
}

export default async function Home() {
  const locale = (await getLocale()) as AppLocale
  const heroCopy = getMarketingCopy(locale).hero.home

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
          style={{ animationDelay: `${0.08 + index * 0.05}s` }}
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
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                <span>{feature}</span>
              </div>
            ))}
            <Button asChild variant={plan.highlight ? 'default' : 'outline'} className="w-full mt-2">
              <Link href="/request-demo">Demander une démo</Link>
            </Button>
          </CardContent>
        </Card>
      )
    })

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.12),transparent_32%),radial-gradient(circle_at_70%_60%,rgba(14,165,233,0.1),transparent_30%)]" />

      <MarketingNavbar />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-16 pt-10 md:pt-16">
        <header
          id="hero"
          className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 px-6 py-12 shadow-lg backdrop-blur md:px-12"
        >
          <div className="floating-orb-primary left-[-60px] top-[-80px]" />
          <div className="floating-orb-secondary right-[-40px] top-[20%]" />
          <div className="floating-orb-tertiary left-[10%] bottom-[-60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.08),transparent_32%)]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6 animate-fade-in">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
                {heroCopy.eyebrow}
              </p>
              <h1 className="text-balance text-5xl font-bold leading-tight md:text-6xl">{heroCopy.title}</h1>
              <h2 className="text-lg font-semibold text-primary">{heroCopy.subtitle}</h2>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{heroCopy.description}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="group transition-transform hover:scale-[1.02] hover:shadow-lg">
                  <Link href="/request-demo">
                    {heroCopy.primaryCta}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="transition hover:bg-primary/10">
                  <Link href="/login">{heroCopy.secondaryCta}</Link>
                </Button>
              </div>

              <div className="grid gap-6 border-t border-border/30 pt-6 sm:grid-cols-3">
                {stats.map((item, index) => (
                  <div key={item.label} className="animate-slide-up" style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
                    <p className="text-3xl font-bold text-foreground">{item.value}</p>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground/80">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <Card className="relative overflow-hidden border-border/70 bg-background/70 shadow-2xl backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Dashboard GymWatch</CardTitle>
                  <CardDescription>Vue consolidée multi-salles, contrôles d’accès et flux financiers.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-card/70 shadow-lg">
                    <Image
                      src="/featured-plateforme.png"
                      alt="Dashboard GymWatch – logiciel de gestion de salle de sport"
                      width={1200}
                      height={900}
                      priority
                      className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent animate-shine opacity-40" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                      <ShieldCheck className="h-4 w-4" aria-hidden /> Contrôle d’accès
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                      <BarChart3 className="h-4 w-4" aria-hidden /> KPI en direct
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                      <CreditCard className="h-4 w-4" aria-hidden /> Paiements sécurisés
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </header>

        <section id="pourquoi" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Pourquoi GymWatch ?</p>
              <h2 className="text-3xl font-bold">Pensé pour les réseaux multi-salles</h2>
              <p className="max-w-2xl text-muted-foreground">
                Un logiciel de gestion de salle de sport qui aligne vos équipes siège et clubs : contrôle d’accès, abonnements, reporting et automatisations dans une seule interface.
              </p>
            </div>
            <Button asChild variant="ghost" className="text-primary underline-offset-4 hover:underline">
              <Link href="/features">Voir toutes les fonctionnalités</Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon
              return (
                <Card
                  key={pillar.title}
                  className="group relative overflow-hidden border border-border/70 bg-background/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${0.05 + index * 0.05}s` }}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader className="relative space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <CardTitle className="text-xl transition-colors group-hover:text-primary">{pillar.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{pillar.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        <section id="features" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Fonctionnalités</p>
              <h2 className="text-3xl font-bold">Une plateforme complète et évolutive</h2>
              <p className="max-w-2xl text-muted-foreground">
                Pilotage multi-sites, gestion des abonnements et du contrôle d’accès, automatisations et reporting exportable.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/features">Explorer en détail</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featureCards.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="group flex h-full flex-col justify-between border border-border/60 bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${0.05 + index * 0.04}s` }}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-105 group-hover:bg-primary/15">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <CardTitle className="text-xl transition-colors group-hover:text-primary">{feature.title}</CardTitle>
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
          <div className="floating-orb-primary right-[12%] top-[-140px] opacity-30" />
          <div className="floating-orb-secondary left-[8%] bottom-[-120px] opacity-20" />
          <div className="relative space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Plans</p>
            <h2 className="text-3xl font-bold">Plans et tarifs conçus pour la croissance</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Comparez les offres mensuelles ou annuelles (-{DEFAULT_ANNUAL_DISCOUNT}%) et déployez GymWatch sur une ou plusieurs salles en quelques jours.
            </p>
          </div>

          <div className="relative mt-8 space-y-8">
            <input type="radio" id="billing-monthly" name="billing" defaultChecked className="peer/billing-monthly sr-only" />
            <input type="radio" id="billing-annual" name="billing" className="peer/billing-annual sr-only" />

            <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur">
              <label
                htmlFor="billing-monthly"
                className="flex-1 cursor-pointer rounded-full px-3 py-2 text-center text-sm font-semibold text-muted-foreground transition peer-checked/billing-monthly:bg-primary peer-checked/billing-monthly:text-primary-foreground peer-checked/billing-monthly:shadow-md"
              >
                Mensuel
              </label>
              <label
                htmlFor="billing-annual"
                className="flex-1 cursor-pointer rounded-full px-3 py-2 text-center text-sm font-semibold text-muted-foreground transition peer-checked/billing-annual:bg-primary peer-checked/billing-annual:text-primary-foreground peer-checked/billing-annual:shadow-md"
              >
                Annuel (-{DEFAULT_ANNUAL_DISCOUNT}%)
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-3 peer-checked/billing-annual:hidden">
              {renderPlanCards('monthly')}
            </div>
            <div className="hidden gap-6 md:grid-cols-3 peer-checked/billing-annual:grid peer-checked/billing-monthly:hidden">
              {renderPlanCards('annual')}
            </div>
          </div>
        </section>

        <section id="temoignages" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Témoignages</p>
            <h2 className="text-3xl font-bold">Des réseaux qui exploitent déjà GymWatch</h2>
            <p className="max-w-2xl text-muted-foreground">
              Des franchises et groupes indépendants qui pilotent leurs clubs avec un SaaS de gestion de salle de sport premium.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item, index) => (
              <Card
                key={item.author}
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

        <section id="faq" className="space-y-6 animate-fade-in" style={{ animationDelay: '0.12s' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">FAQ</p>
              <h2 className="text-3xl font-bold">Questions fréquentes</h2>
              <p className="max-w-2xl text-muted-foreground">
                Les réponses clés sur le contrôle d’accès, la gestion des abonnements, les réseaux multi-salles et la sécurité.
              </p>
            </div>
            <Button asChild variant="ghost" className="text-primary underline-offset-4 hover:underline">
              <Link href="/faqs">Voir toutes les questions</Link>
            </Button>
          </div>
          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur">
            <CardContent className="p-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faqItems.map((item, index) => (
                  <AccordionItem
                    key={item.question}
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
          style={{ animationDelay: '0.14s' }}
        >
          <div className="floating-orb-secondary right-[-60px] top-[-80px] opacity-25" />
          <div className="floating-orb-tertiary left-[-40px] bottom-[-80px] opacity-20" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Contact / Support</p>
              <h2 className="text-3xl font-bold">Besoin d’un déploiement multi-salles ?</h2>
              <p className="max-w-2xl text-muted-foreground">
                Notre équipe vous accompagne pour la mise en place de GymWatch dans votre réseau : cadrage, migration, formation et optimisation continue.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="transition hover:scale-[1.02] hover:shadow-lg">
                  <Link href="/request-demo">Demander une démo</Link>
                </Button>
                <Button asChild variant="secondary" className="transition hover:scale-[1.02] hover:shadow-lg">
                  <Link href="mailto:hello@gymwatch.ma">Nous écrire</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Headphones className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Support premium</p>
                  <p className="text-sm text-muted-foreground">Réponse en moins de 24h ouvrées</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  Email :{' '}
                  <Link href="mailto:hello@gymwatch.ma" className="font-semibold text-primary hover:underline">
                    hello@gymwatch.ma
                  </Link>
                </p>
                <p>Disponibilité : 8h00 - 19h00 CET</p>
                <p>Déploiement : multi-salles, multi-sites, franchises.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
