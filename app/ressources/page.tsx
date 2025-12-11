import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, BarChart3, Bell, BookOpen, QrCode } from 'lucide-react'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Ressources GymWatch',
  description:
    'Guides et articles sur la gestion de salles de sport : fidélisation, contrôle d’accès, automatisation des abonnements et réseaux multi-salles.',
}

const navLinks = [
  { label: 'Fonctionnalités', href: '/features' },
  { label: 'Plans', href: '/plans' },
  { label: 'FAQ', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
]

const resources = [
  {
    title: 'Mettre en place un contrôle d’accès fiable en réseau multi-salles',
    description:
      'Checklist pour sécuriser vos entrées avec QR codes, badges et règles par site, sans bloquer l’expérience membre.',
    icon: QrCode,
  },
  {
    title: 'Réduire le churn avec des relances automatisées',
    description:
      'Emails/SMS sur échéances et impayés : exemples de scénarios pour conserver vos abonnements actifs.',
    icon: Bell,
  },
  {
    title: 'Piloter les KPI d’un groupe de salles de sport',
    description:
      'Les indicateurs essentiels : revenus, fréquentation, marge, et comment les suivre dans un SaaS pour salles de sport.',
    icon: BarChart3,
  },
]

export default function RessourcesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar links={navLinks} />

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Ressources
          </p>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">Ressources et guides GymWatch</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Articles pour les dirigeants de salles de sport : contrôle d’accès, fidélisation des membres, automatisation des abonnements et pilotage des réseaux multi-sites.
          </p>
          <Button asChild className="hover:shadow-lg">
            <Link href="/request-demo">Demander une démo</Link>
          </Button>
        </section>

        <section className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.06s' }}>
          {resources.map((resource) => {
            const Icon = resource.icon
            return (
              <Card
                key={resource.title}
                className="group h-full border border-border/60 bg-card/70 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <CardTitle className="text-xl">{resource.title}</CardTitle>
                  </div>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-primary">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    Lire
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </span>
                  <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="rounded-3xl border border-border/60 bg-linear-to-r from-card via-card/70 to-card/50 px-6 py-10 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Envie d’aller plus loin ?</p>
              <h2 className="text-2xl font-bold">Accélérez votre réseau avec GymWatch</h2>
              <p className="max-w-2xl text-muted-foreground">
                Un SaaS de gestion de salle de sport qui combine contrôle d’accès, abonnements, reporting et automatisations pour vos clubs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="hover:shadow-lg">
                <Link href="/features">Voir les fonctionnalités</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/plans">Comparer les plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
