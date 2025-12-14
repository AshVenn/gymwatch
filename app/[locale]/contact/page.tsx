import type { Metadata } from "next"
import Link from "next/link"
import { Clock3, Headphones, Mail, Phone, Send, ShieldCheck } from "lucide-react"

import { MarketingNavbar } from "@/components/marketing/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const metadata: Metadata = {
  title: "Contact et support GymWatch",
  description:
    "Contactez GymWatch : support, onboarding et déploiement multi-salles pour votre logiciel de gestion de salle de sport.",
}

// ✅ fix: type the links based on MarketingNavbar props (so href isn't just `string`)
type MarketingNavbarProps = React.ComponentProps<typeof MarketingNavbar>

const navLinks: MarketingNavbarProps["links"] = [
  { label: "Fonctionnalités", href: "/features" },
  { label: "Plans", href: "/plans" },
  { label: "FAQ", href: "/faqs" },
  { label: "Contact", href: "/contact" },
]

export default function ContactPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.06),transparent_50%)]" />

      <MarketingNavbar links={navLinks} />

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
            Contact / Support
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">Contact et support</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Besoin d&apos;un déploiement multi-salles complexe ? Notre équipe vous accompagne pour la mise en place de
            GymWatch dans votre réseau : cadrage, migration, formation et support continu.
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <Card className="border border-border/50 bg-card/90 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Écrivez-nous</CardTitle>
              <CardDescription className="leading-relaxed">
                Réponse en moins de 24h ouvrées. Nous sécurisons vos données et vos échanges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" action="mailto:hello@gymwatch.ma" method="post">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom et prénom</Label>
                    <Input
                      id="nom"
                      name="nom"
                      placeholder="Votre nom"
                      className="transition-all duration-200 focus:shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@entreprise.com"
                      className="transition-all duration-200 focus:shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="societe">Société / réseau</Label>
                    <Input
                      id="societe"
                      name="societe"
                      placeholder="Nom de la salle ou du réseau"
                      className="transition-all duration-200 focus:shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sites">Nombre de sites</Label>
                    <Input
                      id="sites"
                      name="sites"
                      placeholder="Ex. 3 salles"
                      className="transition-all duration-200 focus:shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Votre besoin</Label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Décrivez vos attentes : contrôle d'accès, abonnements, reporting, déploiement multi-salles…"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-all duration-200 focus-visible:border-ring focus-visible:shadow-sm focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="gap-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                    Envoyer
                    <Send className="h-4 w-4" aria-hidden />
                  </Button>

                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="gap-2 transition-all duration-300 hover:bg-primary/5 bg-transparent"
                  >
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
            <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Support dédié</CardTitle>
                <CardDescription className="leading-relaxed">
                  Assistance onboarding et run pour vos équipes.
                </CardDescription>
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

            <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Coordonnées</CardTitle>
                <CardDescription className="leading-relaxed">
                  Contactez-nous par le canal qui vous convient.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  <Link
                    href="mailto:hello@gymwatch.ma"
                    className="font-semibold text-primary transition-colors hover:underline"
                  >
                    hello@gymwatch.ma
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" aria-hidden />
                  <span>+212 (0)6 12 34 56 78</span>
                </div>
                <p className="leading-relaxed">Adresse : Casablanca & remote, déploiement dans tout le Maroc.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/90 px-6 py-10 shadow-lg backdrop-blur-sm">
          <div className="floating-orb-primary right-[10%] -top-24 opacity-30" />
          <div className="floating-orb-secondary left-[10%] -bottom-24 opacity-25" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Déploiement</p>
              <h2 className="text-2xl font-bold tracking-tight">Onboarding multi-salles en quelques jours</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">
                Migration des membres, paramétrage du contrôle d&apos;accès, formation des équipes : nous orchestrons le
                lancement pour que GymWatch soit opérationnel rapidement.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <Link href="/request-demo">Planifier une démo</Link>
              </Button>
              <Button asChild variant="outline" className="transition-all duration-300 hover:bg-primary/5 bg-transparent">
                <Link href="/plans">Voir les plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
