"use client"

import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  Check,
  Dumbbell,
  LineChart,
  Mail,
  Phone,
  Shield,
  Sparkles,
  Users,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const services = [
  {
    title: "Pilotage en temps réel",
    description:
      "Suivez vos ventes, revenus récurrents et retards de paiement depuis un tableau de bord unique.",
    icon: LineChart,
  },
  {
    title: "Gestion des membres",
    description:
      "Centralisez les profils, contrats et présences pour mieux accompagner chaque sportif.",
    icon: Users,
  },
  {
    title: "Automatisations",
    description:
      "Rappels d'échéances, emails intelligents et scénarios d'onboarding prêts à l'emploi.",
    icon: Sparkles,
  },
  {
    title: "Accès sécurisé",
    description: "Contrôlez les accès aux clubs et sécurisez la donnée sensible de vos adhérents.",
    icon: Shield,
  },
  {
    title: "Multi-sites",
    description: "Administrez plusieurs salles et suivez leurs performances dans une seule interface.",
    icon: Dumbbell,
  },
  {
    title: "API ouverte",
    description: "Connectez GymWatch à votre site, votre CRM ou vos outils marketing préférés.",
    icon: Sparkles,
  },
]

const plans = [
  {
    title: "Essentiel",
    price: "59€",
    cadence: "par mois",
    description: "Pour lancer la digitalisation d'une salle unique.",
    highlight: false,
    features: [
      "Jusqu'à 500 membres",
      "Support email",
      "Facturation récurrente",
      "Application membre en marque blanche",
    ],
  },
  {
    title: "Croissance",
    price: "129€",
    cadence: "par mois",
    description: "Idéal pour les réseaux en expansion.",
    highlight: true,
    features: [
      "Membres illimités",
      "Support prioritaire",
      "Automatisations avancées",
      "API + webhooks",
    ],
  },
  {
    title: "Enterprise",
    price: "Sur devis",
    cadence: "",
    description: "Accompagnement dédié pour groupes multi-marques.",
    highlight: false,
    features: [
      "Chef de projet dédié",
      "SLA contractuel",
      "Intégration SSO",
      "Connecteurs BI",
    ],
  },
]

const contacts = [
  { label: "Email", value: "bonjour@gymwatch.fr", icon: Mail, href: "mailto:bonjour@gymwatch.fr" },
  { label: "Téléphone", value: "+33 1 84 88 99 00", icon: Phone, href: "tel:+33184889900" },
]

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard")
    }
  }, [status, session, router])

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="hero-parallax absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-background" aria-hidden="true" />

      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="#hero" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="text-primary">GymWatch</span>
            <span className="text-muted-foreground hidden sm:inline">Gestion des clubs</span>
          </Link>
          <nav
            aria-label="Navigation principale"
            className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium sm:gap-4"
          >
            <Link href="#services" className="text-muted-foreground transition hover:text-foreground">
              Services
            </Link>
            <Link href="#plans" className="text-muted-foreground transition hover:text-foreground">
              Plans
            </Link>
            <Link href="#contact" className="text-muted-foreground transition hover:text-foreground">
              Contact
            </Link>
            <ThemeToggle />
            <Button variant="ghost" onClick={() => router.push("/login")}>Se connecter</Button>
            <Button onClick={() => router.push("/register")}>Créer un compte</Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-16 sm:py-24" id="hero">
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-10 text-center shadow-lg shadow-primary/5 lg:text-left">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/20" aria-hidden="true" />
          <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge variant="secondary" className="inline-flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Plateforme SaaS française
              </Badge>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
                Simplifiez la gestion de vos abonnements et engagez vos communautés sportives.
              </h1>
              <p className="text-lg text-muted-foreground">
                Suivez vos ventes, automatisez vos encaissements et collaborez avec vos équipes depuis un espace unique, pensé
                pour les réseaux de fitness modernes.
              </p>
              <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                <Button size="lg" onClick={() => router.push("/register")}>Essayer gratuitement</Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/login")}>Voir un démo live</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                14 jours d'essai • Aucune carte bancaire requise • Assistance en français
              </p>
            </div>
            <Card className="relative overflow-hidden border-border/60 bg-background/80 p-6 shadow-xl backdrop-blur">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_65%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_70%)]" aria-hidden="true" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Performance globale</span>
                  <span>+18% ce mois</span>
                </div>
                <Image
                  src="/window.svg"
                  width={520}
                  height={320}
                  alt="Aperçu du tableau de bord GymWatch"
                  className="h-auto w-full rounded-2xl border border-border/50 bg-card/40 p-4"
                />
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Membres actifs</p>
                    <p className="text-2xl font-semibold">1 842</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Revenus récurrents</p>
                    <p className="text-2xl font-semibold">76 500 €</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left">
                  <p className="text-sm font-medium">Alertes intelligentes</p>
                  <p className="text-sm text-muted-foreground">
                    GymWatch propose automatiquement les actions prioritaires pour relancer les adhérents ou ouvrir une nouvelle
                    session.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="services" aria-labelledby="services-title" className="space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline">Services</Badge>
            <h2 id="services-title" className="text-3xl font-semibold tracking-tight">Tout pour orchestrer votre réseau</h2>
            <p className="text-lg text-muted-foreground">
              Des outils conçus avec les responsables de clubs pour gagner du temps chaque semaine.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.title} className="flex flex-col gap-4 border-border/60 bg-card/70 p-6">
                <service.icon className="h-10 w-10 text-primary" aria-hidden="true" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{service.title}</h3>
                  <p className="text-muted-foreground">{service.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="plans" aria-labelledby="plans-title" className="space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline">Plans tarifaires</Badge>
            <h2 id="plans-title" className="text-3xl font-semibold tracking-tight">Choisissez un plan adapté à votre croissance</h2>
            <p className="text-lg text-muted-foreground">
              Tous nos plans incluent les mises à jour produit, la sécurité et les exports illimités.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.title}
                className={`flex flex-col gap-6 border ${plan.highlight ? 'border-primary shadow-xl shadow-primary/20' : 'border-border/60'} bg-card/80 p-6`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold">{plan.title}</h3>
                    {plan.highlight && <Badge className="bg-primary text-primary-foreground">Populaire</Badge>}
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.cadence && <span className="text-muted-foreground"> / {plan.cadence}</span>}
                </div>
                <ul className="space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.highlight ? "default" : "outline"} className="mt-auto" onClick={() => router.push('/register')}>
                  Démarrer
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section id="contact" aria-labelledby="contact-title" className="space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline">Contact</Badge>
            <h2 id="contact-title" className="text-3xl font-semibold tracking-tight">Parlons de votre projet</h2>
            <p className="text-lg text-muted-foreground">
              Réservez une démonstration ou écrivez-nous pour construire un déploiement sur-mesure.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-6 border-border/60 bg-card/80 p-6">
              <form className="space-y-4" aria-label="Formulaire de contact">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nom complet
                  </label>
                  <Input id="name" placeholder="Sophie Durand" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email professionnel
                  </label>
                  <Input id="email" type="email" placeholder="vous@entreprise.com" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    className="w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="Dites-nous en plus sur vos salles et vos objectifs."
                  />
                </div>
                <Button type="submit" className="w-full">Envoyer ma demande</Button>
              </form>
            </Card>
            <Card className="space-y-6 border-border/60 bg-card/80 p-6">
              <div>
                <h3 className="text-2xl font-semibold">Équipe Customer Success</h3>
                <p className="text-muted-foreground">
                  Nous répondons sous 24h ouvrées et planifions un atelier de cadrage gratuit.
                </p>
              </div>
              <dl className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.label} className="flex items-center gap-4 rounded-2xl border border-border/60 p-4">
                    <contact.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <dt className="text-sm text-muted-foreground">{contact.label}</dt>
                      <dd>
                        <Link href={contact.href} className="font-medium hover:underline">
                          {contact.value}
                        </Link>
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Disponible dans toute l'Europe</p>
                <p>Nos experts vous accompagnent dans la mise en conformité RGPD et les intégrations locales.</p>
              </div>
            </Card>
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
