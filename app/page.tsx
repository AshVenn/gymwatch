"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'

const navigationLinks = [
  { label: 'Fonctionnalités', href: '#services' },
  { label: 'Plans', href: '#plans' },
  { label: 'Contact', href: '#contact' },
]

const services = [
  {
    title: 'Gestion complète',
    description: 'Suivez vos salles, coaches et membres depuis une seule interface.',
    icon: '🏋️',
  },
  {
    title: 'Automatisation',
    description: 'Alertes d\'expiration, relances e-mail et synchronisation des abonnements.',
    icon: '⚙️',
  },
  {
    title: 'Analyses avancées',
    description: 'Visualisez les revenus, la fréquentation et les tendances.',
    icon: '📈',
  },
]

const plans = [
  {
    name: 'Essentiel',
    price: '299 MAD',
    description: 'Parfait pour les nouvelles salles',
    features: ['Tableau de bord unifié', 'Gestion des membres', 'Support e-mail'],
    highlight: false,
  },
  {
    name: 'Business',
    price: '499 MAD',
    description: 'Idéal pour les réseaux multi-sites',
    features: [
      'Automatisation des renouvellements',
      'Rapports personnalisés',
      'Support prioritaire',
    ],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Sur devis',
    description: 'Pour les franchises et groupes',
    features: ['SLA dédié', 'Audit sécurité', 'Onboarding personnalisé'],
    highlight: false,
  },
]

const stats = [
  { label: 'Salles accompagnées', value: '+120' },
  { label: 'Membres gérés', value: '38k' },
  { label: 'Taux de satisfaction', value: '98%' },
]

export default function Home() {
  const { status } = useSession()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard")
    }
  }, [status, session, router])

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_55%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-b from-transparent via-slate-900/40 to-transparent blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-bold text-slate-950">
              GW
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">GymWatch</p>
              <p className="text-xs text-slate-300">SaaS pour salles de sport modernes</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-200 md:flex">
            {navigationLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Se connecter
            </Button>
            <Button onClick={() => router.push('/register')}>
              Créer un compte
            </Button>
          </div>

          <button
            className="rounded-lg border border-white/10 p-2 text-white md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden">
          <div className="ml-auto flex h-full w-72 flex-col gap-6 border-l border-white/10 bg-slate-950 p-6">
            <button className="self-end rounded-full border border-white/20 p-2" onClick={() => setMenuOpen(false)}>
              <X size={18} />
            </button>
            <nav className="flex flex-col gap-4 text-lg">
              {navigationLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-slate-200 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Button variant="ghost" onClick={() => router.push('/login')}>
                Se connecter
              </Button>
              <Button onClick={() => router.push('/register')}>
                Créer un compte
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]" id="hero">
          <div className="space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
              <Sparkles size={14} /> Plateforme SaaS 100% marocaine
            </p>
            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                Une plateforme moderne pour piloter toutes vos salles de sport
              </h1>
              <p className="text-lg text-slate-300">
                Automatiser les renouvellements, suivre vos encaissements et offrir une expérience fluide à vos membres sans ajouter de paiement en ligne.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => router.push('/register')}>
                Démarrer gratuitement
                <ArrowRight className="ml-2" size={18} />
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
                Accéder à mon espace
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <Card key={stat.label} className="border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-300">{stat.label}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-6 shadow-2xl">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 blur-3xl" />
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4">
                <ShieldCheck className="text-cyan-300" />
                <div>
                  <p className="text-sm font-semibold">Super administrateur</p>
                  <p className="text-xs text-slate-300">Contrôle total sur les gyms, abonnements et membres</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Temps réel</p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold">1 248</p>
                    <p className="text-sm text-slate-400">Abonnements actifs</p>
                  </div>
                  <p className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-300">+12% cette semaine</p>
                </div>
                <div className="mt-6 h-28 rounded-2xl bg-gradient-to-r from-cyan-400/20 to-blue-500/20" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-300">Prochaine expiration</p>
                <p className="text-xl font-semibold text-white">Gym Atlas - 4 jours restants</p>
                <p className="text-xs text-slate-400">Rappel automatique envoyé</p>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">Services</p>
            <h2 className="text-3xl font-semibold">Ce que GymWatch automatise pour vous</h2>
            <p className="text-slate-300">Du suivi des abonnements aux relances intelligentes, tout est pensé pour vos équipes.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <Card key={service.title} className="border-white/10 bg-white/5 p-6">
                <div className="text-4xl">{service.icon}</div>
                <h3 className="mt-4 text-xl font-semibold">{service.title}</h3>
                <p className="mt-2 text-slate-300">{service.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="plans" className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">Plans</p>
            <h2 className="text-3xl font-semibold">Choisissez la formule qui vous correspond</h2>
            <p className="text-slate-300">Contactez-nous pour activer votre salle, sans paiement en ligne.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`flex flex-col border ${plan.highlight ? 'border-cyan-400 bg-slate-900/80 shadow-cyan-500/20 shadow-2xl' : 'border-white/10 bg-white/5'}`}
              >
                <div className="p-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">{plan.name}</p>
                  <p className="mt-4 text-4xl font-bold">{plan.price}</p>
                  <p className="text-sm text-slate-300">{plan.description}</p>
                </div>
                <div className="flex flex-1 flex-col gap-3 border-t border-white/10 p-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-slate-200">
                      <CheckCircle2 className="text-cyan-300" size={18} /> {feature}
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 p-6">
                  <Button
                    variant={plan.highlight ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => router.push('/register')}
                  >
                    Discuter avec l'équipe
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="contact" className="rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-500/20 to-blue-500/10 p-8 text-center">
          <h2 className="text-3xl font-semibold">Prêt à moderniser votre gestion ?</h2>
          <p className="mt-3 text-slate-100">
            Écrivez-nous sur <a className="font-semibold underline" href="mailto:contact@gymwatch.ma">contact@gymwatch.ma</a> et nous activerons votre salle en moins de 24h.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button onClick={() => router.push('/register')}>Créer mon espace</Button>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Déjà client ? Se connecter
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} GymWatch. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link href="/legal" className="hover:text-foreground">
              Mentions légales
            </Link>
            <Link href="#contact" className="hover:text-foreground">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
