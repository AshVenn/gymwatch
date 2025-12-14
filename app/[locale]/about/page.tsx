import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Compass, ShieldCheck, Sparkles, Users } from "lucide-react"

import { MarketingNavbar } from "@/components/marketing/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "À propos de GymWatch",
  description:
    "Découvrez la mission de GymWatch : optimiser la gestion des salles de sport et réseaux multi-salles avec fiabilité, sécurité et automatisation.",
}

const navLinks = [
  { label: "Fonctionnalités", href: "/features" },
  { label: "Plans", href: "/plans" },
  { label: "FAQ", href: "/faqs" },
  { label: "Contact", href: "/contact" },
]

const timeline = [
  {
    title: "Création",
    detail: "Lancement de GymWatch pour simplifier la gestion des abonnements et du contrôle d'accès.",
  },
  {
    title: "Scale multi-salles",
    detail: "Support natif des réseaux multi-sites avec reporting consolidé et rôles granulaires.",
  },
  {
    title: "Automatisation",
    detail: "Relances, facturation et intégrations API pour réduire les tâches manuelles.",
  },
  {
    title: "Vision",
    detail: "Un logiciel de gestion de salle de sport premium, sécurisé et toujours à jour pour vos équipes.",
  },
]

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.06),transparent_50%)]" />

      <MarketingNavbar links={navLinks} />

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
            À propos
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">À propos de GymWatch</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Nous aidons les réseaux de salles de sport à piloter leurs membres, leurs abonnements et leur contrôle
            d\'accès avec une plateforme unique, fiable et sécurisée.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <Link href="/request-demo">Demander une démo</Link>
            </Button>
            <Button asChild variant="outline" className="transition-all duration-300 hover:bg-primary/5 bg-transparent">
              <Link href="/features">Voir les fonctionnalités</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.06s" }}>
          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                Mission
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Optimiser la gestion des salles de sport et réseaux multi-salles avec un SaaS fiable et élégant.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </span>
                Fiabilité & sécurité
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Chiffrement, sauvegardes et rôles granulaires pour protéger vos données et vos accès.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Compass className="h-4 w-4" aria-hidden />
                </span>
                Vision
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Automatiser vos opérations, réduire le churn et offrir une expérience moderne à vos membres.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-3xl font-bold tracking-tight">Notre trajectoire</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {timeline.map((item, index) => (
              <Card
                key={item.title}
                className="group border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg animate-slide-up"
                style={{ animationDelay: `${0.02 + index * 0.03}s` }}
              >
                <CardHeader>
                  <CardTitle className="text-xl transition-colors duration-300 group-hover:text-primary">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="leading-relaxed">{item.detail}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/90 px-6 py-10 shadow-lg backdrop-blur-sm">
          <div className="floating-orb-primary right-[10%] -top-24 opacity-30" />
          <div className="floating-orb-secondary left-[10%] -bottom-24 opacity-25" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Notre équipe</p>
              <h2 className="text-2xl font-bold tracking-tight">Experts produit, data et opérations</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                Nous combinons expérience terrain (front desk, opérations) et expertise SaaS pour livrer un logiciel de
                gestion de salle de sport fiable, orienté data et accessible.
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                Support et accompagnement dédiés
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                Livraison continue d'améliorations produit
              </div>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-3 mt-6">
            <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <Link href="/contact">Échanger avec nous</Link>
            </Button>
            <Button asChild variant="outline" className="transition-all duration-300 hover:bg-primary/5 bg-transparent">
              <Link href="/plans">Choisir un plan</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
