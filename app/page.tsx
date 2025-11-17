"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CheckCircle2, ArrowRight, Sparkles, Menu, X, TrendingUp, Users, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

const navigationLinks = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Plans', href: '#plans' },
  { label: 'Contact', href: '#contact' },
]

const services = [
  { title: 'Pilotage unifié', description: 'Tableau de bord multi-salles, suivi des membres et revenus temps réel.', icon: TrendingUp },
  { title: 'Automatisations', description: 'Alertes d\'expiration, factures et relances orchestrées pour chaque club.', icon: Zap },
  { title: 'Analyses avancées', description: 'Revenus, fréquentation et comparatifs pour guider vos décisions.', icon: Users },
]

const plans = [
  {
    name: 'Essentiel',
    price: '299 MAD',
    description: 'Parfait pour une salle unique',
    features: ['Gestion des membres', 'Alertes d\'échéance', 'Support email'],
  },
  {
    name: 'Business',
    price: '499 MAD',
    description: 'Pensé pour les réseaux multi-sites',
    features: ['Automatisation avancée', 'Rapports personnalisés', 'Support prioritaire'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Sur devis',
    description: 'Accompagnement premium pour groupes',
    features: ['SLA dédié', 'Audit sécurité', 'Onboarding personnalisé'],
  },
]

const carouselSlides = [
  {
    title: 'Pilotage multi-salles',
    description: 'Vue consolidée des membres, paiements et incidents pour chaque site.',
  },
  {
    title: 'Alertes automatisées',
    description: 'Notifications intelligentes avant les expirations et incidents critiques.',
  },
  {
    title: 'Analyses financières',
    description: 'Prévisions et tendances pour guider vos décisions d\'investissements.',
  },
]

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [parallaxOffset, setParallaxOffset] = useState(0)
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/dashboard')
    }
  }, [router, session?.user, status])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
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
      <header className={cn(
        "sticky top-0 z-30 transition-all duration-500",
        isScrolled ? "border-b border-border/40 bg-background/80 backdrop-blur-xl shadow-sm" : "border-b border-border/20 bg-background/50 backdrop-blur"
      )}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="group flex items-center gap-3 transition-transform hover:scale-105">
            <div className="relative overflow-hidden rounded-lg">
              <Image src="/GymWatch.svg" alt="GymWatch" width={56} height={56} priority className="transition-transform group-hover:scale-110" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">GymWatch</p>
              <p className="text-base font-semibold">Gestion moderne des salles</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {navigationLinks.map((link) => (
              <Link key={link.href} href={link.href} className="relative transition hover:text-foreground group">
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => router.push('/login')} className="transition hover:text-primary">
              Se connecter
            </Button>
            <Button onClick={() => router.push('/register')} className="transition hover:scale-105 hover:shadow-lg">
              Créer un compte
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border/60 bg-background md:hidden animate-in slide-in-from-top">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium">Navigation</p>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-2 px-4 pb-4">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-border/60 px-4 py-2 text-sm transition hover:bg-primary/10"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button className="w-full transition hover:scale-105" onClick={() => router.push('/register')}>
                Démarrer
              </Button>
              <Button variant="ghost" className="w-full transition hover:text-primary" onClick={() => router.push('/login')}>
                Se connecter
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12">
        <section id="hero-section" className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-8 md:p-12 shadow-lg">
          <div className="floating-orb-primary left-1/4 top-0" />
          <div className="floating-orb-secondary right-0 top-1/2" />
          <div className="floating-orb-tertiary left-0 bottom-0" />
          
          <div className="relative grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-8 animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary font-semibold animate-bounce-subtle">
                <Sparkles className="h-4 w-4" /> Plateforme multi-salles
              </span>

              <h1 className="text-5xl md:text-6xl font-bold leading-tight text-balance">
                L'OS de vos salles de sport <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">multi-sites</span>
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                GymWatch centralise vos abonnements, vos équipes et vos finances dans une expérience unique, optimisée pour les réseaux de salles ambitieuses.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="lg" onClick={() => router.push('/register')} className="group transition-all hover:scale-105 hover:shadow-xl">
                  Demander une démo <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push('/login')} className="transition hover:bg-primary/10">
                  Accéder au tableau de bord
                </Button>
              </div>

              <div className="flex flex-wrap gap-8 pt-6 border-t border-border/20">
                <div className="group animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <p className="text-3xl font-bold text-foreground">+120</p>
                  <p className="text-sm text-muted-foreground">Salles accompagnées</p>
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

            <div className="relative h-full min-h-96 flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative w-full h-full perspective">
                <div 
                  className="relative w-full h-full transition-all duration-700 ease-out hover-lift"
                  style={{
                    transform: `translateY(${parallaxOffset * -0.3}px) ${hoveredDevice ? 'scale(1.05)' : 'scale(1)'}`,
                  }}
                  onMouseEnter={() => setHoveredDevice('devices')}
                  onMouseLeave={() => setHoveredDevice(null)}
                >
                  <Image 
                    src="/featured-plateforme.png"
                    alt="GymWatch Platform - Desktop and Mobile Showcase"
                    width={800}
                    height={600}
                    quality={95}
                    priority
                    className={cn(
                      "w-full h-auto object-contain transition-all duration-700 drop-shadow-2xl",
                      hoveredDevice === 'devices' ? 'brightness-110 drop-shadow-[0_20px_40px_rgba(59,130,246,0.3)]' : 'drop-shadow-lg'
                    )}
                  />
                  
                  <div className={cn(
                    "absolute inset-0 rounded-lg bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500",
                    hoveredDevice === 'devices' && 'opacity-100 animate-shine'
                  )} />

                  <div className="absolute top-4 -left-6 animate-float-left">
                    <div className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
                      ✓ Multi-salles
                    </div>
                  </div>

                  <div className="absolute bottom-8 -right-8 animate-float-right">
                    <div className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
                      ✓ Temps réel
                    </div>
                  </div>

                  <div className="absolute top-1/2 -translate-y-1/2 -right-12 animate-float-up">
                    <div className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
                      ✓ Analytics
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
            <p className="text-lg text-muted-foreground">Des modules pensés pour les réseaux multi-sites.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <Card 
                  key={service.title} 
                  className="group relative overflow-hidden transition-all duration-500 hover:shadow-lg hover:border-primary/50 animate-slide-up"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader>
                    <div className="mb-2 inline-block p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        <section id="plans" className="space-y-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold">Plans transparents</h2>
              <p className="text-lg text-muted-foreground">Choisissez la formule adaptée à votre réseau.</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/contact')} className="transition hover:bg-primary/10">
              Contacter l'équipe commerciale
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan, index) => (
              <Card 
                key={plan.name} 
                className={cn(
                  'relative overflow-hidden transition-all duration-500 hover:shadow-xl animate-slide-up',
                  plan.highlight ? 'border-2 border-primary shadow-lg md:scale-105' : 'hover:border-primary/30'
                )}
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                {plan.highlight && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.highlight && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary animate-pulse">Populaire</span>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-4xl font-bold text-foreground pt-2">{plan.price}</div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-muted-foreground">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  <Button className="mt-6 w-full transition hover:scale-105" variant={plan.highlight ? 'default' : 'outline'}>
                    Choisir {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="contact" className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card to-card/50 px-8 py-12 md:px-12 shadow-lg animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Support</p>
              <h2 className="text-3xl md:text-4xl font-bold mt-2">Besoin d'un plan sur-mesure ?</h2>
              <p className="text-muted-foreground mt-2">Notre équipe vous répond sous 24h pour cadrer vos besoins.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => router.push('mailto:hello@gymwatch.ma')} className="transition hover:scale-105">
                hello@gymwatch.ma
              </Button>
              <Button onClick={() => router.push('/register')} className="transition hover:scale-105 hover:shadow-lg">
                Commencer maintenant
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
