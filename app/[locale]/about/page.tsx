import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Compass, ShieldCheck, Sparkles, Users } from 'lucide-react'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'À propos de GymWatch',
  description:
    'Découvrez la mission de GymWatch : optimiser la gestion des salles de sport et réseaux multi-salles avec fiabilité, sécurité et automatisation.',
}

const navLinks = [
  { label: 'Fonctionnalités', href: '/features' },
  { label: 'Plans', href: '/plans' },
  { label: 'FAQ', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
]

const timeline = [
  {
    title: 'Création',
    detail: 'Lancement de GymWatch pour simplifier la gestion des abonnements et du contrôle d’accès.',
  },
  {
    title: 'Scale multi-salles',
    detail: 'Support natif des réseaux multi-sites avec reporting consolidé et rôles granulaires.',
  },
  {
    title: 'Automatisation',
    detail: 'Relances, facturation et intégrations API pour réduire les tâches manuelles.',
  },
  {
    title: 'Vision',
    detail: 'Un logiciel de gestion de salle de sport premium, sécurisé et toujours à jour pour vos équipes.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar links={navLinks} />

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            À propos
          </p>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">À propos de GymWatch</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Nous aidons les réseaux de salles de sport à piloter leurs membres, leurs abonnements et leur contrôle d’accès avec une plateforme unique, fiable et sécurisée.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="hover:shadow-lg">
              <Link href="/request-demo">Demander une démo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/features">Voir les fonctionnalités</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.06s' }}>
          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                Mission
              </CardTitle>
              <CardDescription>
                Optimiser la gestion des salles de sport et réseaux multi-salles avec un SaaS fiable et élégant.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                Fiabilité & sécurité
              </CardTitle>
              <CardDescription>Chiffrement, sauvegardes et rôles granulaires pour protéger vos données et vos accès.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Compass className="h-5 w-5 text-primary" aria-hidden />
                Vision
              </CardTitle>
              <CardDescription>
                Automatiser vos opérations, réduire le churn et offrir une expérience moderne à vos membres.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-3xl font-bold">Notre trajectoire</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {timeline.map((item) => (
              <Card
                key={item.title}
                className="border border-border/60 bg-card/70 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription>{item.detail}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border/60 bg-linear-to-r from-card via-card/70 to-card/50 px-6 py-10 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Notre équipe</p>
              <h2 className="text-2xl font-bold">Experts produit, data et opérations</h2>
              <p className="max-w-2xl text-muted-foreground">
                Nous combinons expérience terrain (front desk, opérations) et expertise SaaS pour livrer un logiciel de gestion de salle de sport fiable, orienté data et accessible.
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                Support et accompagnement dédiés
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                Livraison continue d’améliorations produit
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="hover:shadow-lg">
              <Link href="/contact">Échanger avec nous</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/plans">Choisir un plan</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
