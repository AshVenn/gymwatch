"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ArrowRight, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getPlanCatalogAsList } from '@/lib/subscription-plans'

const navigationLinks = [
  { label: 'Fonctionnalites', href: '#features' },
  { label: 'Plans', href: '#plans' },
  { label: 'Contact', href: '#contact' },
]

const services = [
  { title: 'Pilotage unifie', description: 'Tableau de bord multi-salles, suivi des membres et revenus temps reel.', icon: TrendingUp },
  { title: 'Automatisations', description: "Alertes d'expiration, factures et relances orchestrees pour chaque club.", icon: Zap },
  { title: 'Analyses avancees', description: 'Revenus, frequentation et comparatifs pour guider vos decisions.', icon: Users },
]

const planCatalog = getPlanCatalogAsList()

export default function Home() {
  const router = useRouter()
  const [parallaxOffset, setParallaxOffset] = useState(0)
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')
  const priceFormatter = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' })

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('hero-section')
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect()
        const scrolled = window.scrollY
        const offset = (scrolled - (rect.top + window.scrollY)) * 0.5
        setParallaxOffset(offset)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar links={navigationLinks} />

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12">
        <section
          id="hero-section"
          className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-8 shadow-lg md:p-12"
        >
          <div className="floating-orb-primary left-1/4 top-0" />
          <div className="floating-orb-secondary right-0 top-1/2" />
          <div className="floating-orb-tertiary left-0 bottom-0" />

          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8 animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary animate-bounce-subtle">
                <Sparkles className="h-4 w-4" /> Plateforme multi-salles
              </span>

              <h1 className="text-balance text-5xl font-bold leading-tight md:text-6xl">
                L'OS de vos salles de sport <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">multi-sites</span>
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                GymWatch centralise vos abonnements, vos equipes et vos finances dans une experience unique, optimisee pour les reseaux de salles ambitieuses.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => router.push('/request-demo')}
                  className="group transition-all hover:scale-105 hover:shadow-xl"
                >
                  Demander une demo
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="transition hover:bg-primary/10"
                >
                  Acceder au tableau de bord
                </Button>
              </div>

              <div className="flex flex-wrap gap-8 border-t border-border/20 pt-6">
                <div className="group animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <p className="text-3xl font-bold text-foreground">+120</p>
                  <p className="text-sm text-muted-foreground">Salles accompagnees</p>
                </div>
                <div className="group animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <p className="text-3xl font-bold text-foreground">38k</p>
                  <p className="text-sm text-muted-foreground">Membres suivis</p>
                </div>
                <div className="group animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <p className="text-3xl font-bold text-foreground">98%</p>
                  <p className="text-sm text-muted-foreground">Clients satisfaits</p>
                </div>
              </div>
            </div>

            <div className="relative flex h-full min-h-96 items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="perspective relative h-full w-full">
                <div
                  className="relative h-full w-full transition-all duration-700 ease-out hover-lift"
                  style={{
                    transform: `translateY(${parallaxOffset * -0.3}px) ${hoveredDevice ? 'scale(1.05)' : 'scale(1)'}`,
                  }}
                  onMouseEnter={() => setHoveredDevice('devices')}
                  onMouseLeave={() => setHoveredDevice(null)}
                >
                  <Image
                    src="/featured-plateforme.png"
                    alt="GymWatch - Experience desktop et mobile"
                    width={800}
                    height={600}
                    quality={95}
                    priority
                    className={cn(
                      'h-auto w-full object-contain transition-all duration-700 drop-shadow-2xl',
                      hoveredDevice === 'devices'
                        ? 'brightness-110 drop-shadow-[0_20px_40px_rgba(59,130,246,0.3)]'
                        : 'drop-shadow-lg',
                    )}
                  />

                  <div
                    className={cn(
                      'absolute inset-0 rounded-lg bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500',
                      hoveredDevice === 'devices' && 'opacity-100 animate-shine',
                    )}
                  />

                  <div className="absolute top-4 -left-6 animate-float-left">
                    <div className="rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur-sm">
                      Multi-salles
                    </div>
                  </div>

                  <div className="absolute top-1/3 -right-8 animate-float-right">
                    <div className="rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur-sm">
                      Temps reel
                    </div>
                  </div>

                  <div className="absolute top-1/2 -right-12 -translate-y-1/2 animate-float-up">
                    <div className="rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur-sm">
                      Analytics
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="space-y-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Tout ce qu'il faut pour une exploitation sereine</h2>
            <p className="text-lg text-muted-foreground">Des modules penses pour les reseaux multi-sites.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <Card
                  key={service.title}
                  className="group relative overflow-hidden border border-border/70 transition-all duration-500 hover:border-primary/50 hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader>
                    <div className="mb-2 inline-block rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="transition-colors group-hover:text-primary">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        <section id="plans" className="rounded-3xl border border-primary/10 bg-card/70 px-6 py-12 shadow-lg backdrop-blur-sm">
          <div className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-primary/80">Plans</p>
            <h2 className="text-3xl font-bold">Deux offres, zero compromis</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Choisissez un rythme mensuel ou annuel. Le plan Pro debloque les QR codes, exports CSV/PDF et outils avances.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <button
              className={cn(
                'rounded-full border px-4 py-1 font-medium transition',
                billingCycle === 'MONTHLY' ? 'border-primary bg-primary text-white' : 'border-border',
              )}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Mensuel
            </button>
            <button
              className={cn(
                'rounded-full border px-4 py-1 font-medium transition',
                billingCycle === 'ANNUAL' ? 'border-primary bg-primary text-white' : 'border-border',
              )}
              onClick={() => setBillingCycle('ANNUAL')}
            >
              Annuel (-15%)
            </button>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {planCatalog.map((plan) => {
              const price = billingCycle === 'MONTHLY' ? plan.monthlyPrice : plan.annualPrice
              const cadenceLabel = billingCycle === 'MONTHLY' ? 'mois' : 'an'
              return (
                <Card
                  key={plan.tier}
                  className={cn(
                    'relative overflow-hidden border border-border/60 transition hover:shadow-lg',
                    plan.highlight ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10' : 'bg-card',
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute right-4 top-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
                      Pro
                    </span>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-2 text-4xl font-bold text-foreground">
                      {priceFormatter.format(price)}
                      <span className="text-base font-normal text-muted-foreground"> / {cadenceLabel}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {feature}
                      </div>
                    ))}
                    <Button className="w-full" variant={plan.highlight ? 'default' : 'outline'}>
                      Commencer
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section
          id="contact"
          className="animate-fade-in rounded-3xl border border-primary/20 bg-gradient-to-br from-card to-card/50 px-8 py-12 shadow-lg md:px-12"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Support</p>
              <h2 className="mt-2 text-3xl font-bold md:text-4xl">Besoin d'un plan sur-mesure ?</h2>
              <p className="mt-2 text-muted-foreground">Notre equipe vous repond sous 24h pour cadrer vos besoins.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => router.push('mailto:hello@gymwatch.ma')} className="transition hover:scale-105">
                hello@gymwatch.ma
              </Button>
              <Button onClick={() => router.push('/request-demo')} className="transition hover:scale-105 hover:shadow-lg">
                Commencer maintenant
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
