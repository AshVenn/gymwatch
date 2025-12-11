import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock3, Headphones, Mail, Phone, Send, ShieldCheck } from 'lucide-react'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const metadata: Metadata = {
  title: 'Contact et support GymWatch',
  description:
    'Contactez GymWatch : support, onboarding et déploiement multi-salles pour votre logiciel de gestion de salle de sport.',
}

const navLinks = [
  { label: 'Fonctionnalités', href: '/features' },
  { label: 'Plans', href: '/plans' },
  { label: 'FAQ', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar links={navLinks} />

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Contact / Support
          </p>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">Contact et support</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Besoin d’un déploiement multi-salles complexe ? Notre équipe vous accompagne pour la mise en place de GymWatch dans votre réseau : cadrage, migration, formation et support continu.
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Écrivez-nous</CardTitle>
              <CardDescription>Réponse en moins de 24h ouvrées. Nous sécurisons vos données et vos échanges.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" action="mailto:hello@gymwatch.ma" method="post">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom et prénom</Label>
                    <Input id="nom" name="nom" placeholder="Votre nom" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel</Label>
                    <Input id="email" name="email" type="email" placeholder="you@entreprise.com" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="societe">Société / réseau</Label>
                    <Input id="societe" name="societe" placeholder="Nom de la salle ou du réseau" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sites">Nombre de sites</Label>
                    <Input id="sites" name="sites" placeholder="Ex. 3 salles" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Votre besoin</Label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Décrivez vos attentes : contrôle d’accès, abonnements, reporting, déploiement multi-salles…"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="gap-2">
                    Envoyer
                    <Send className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button asChild type="button" variant="outline" className="gap-2">
                    <Link href="mailto:hello@gymwatch.ma">
                      Nous écrire directement
                      <Mail className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Support dédié</CardTitle>
                <CardDescription>Assistance onboarding et run pour vos équipes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-primary" aria-hidden />
                  <span>Équipe support disponible 8h00 - 19h00 CET</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" aria-hidden />
                  <span>Réponse en moins de 24h ouvrées</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                  <span>Données sécurisées et journalisées</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Coordonnées</CardTitle>
                <CardDescription>Contactez-nous par le canal qui vous convient.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  <Link href="mailto:hello@gymwatch.ma" className="font-semibold text-primary hover:underline">
                    hello@gymwatch.ma
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" aria-hidden />
                  <span>+212 (0)6 12 34 56 78</span>
                </div>
                <p>Adresse : Casablanca & remote, déploiement dans tout le Maroc.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-linear-to-r from-card via-card/70 to-card/50 px-6 py-10 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Déploiement</p>
              <h2 className="text-2xl font-bold">Onboarding multi-salles en quelques jours</h2>
              <p className="max-w-2xl text-muted-foreground">
                Migration des membres, paramétrage du contrôle d’accès, formation des équipes : nous orchestrons le lancement pour que GymWatch soit opérationnel rapidement.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="hover:shadow-lg">
                <Link href="/request-demo">Planifier une démo</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/plans">Voir les plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
