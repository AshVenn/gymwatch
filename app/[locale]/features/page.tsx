import type { Metadata } from 'next'
import Link from 'next/link'
import { BarChart3, Bell, CheckCircle2, LayoutDashboard, QrCode, ShieldCheck, Workflow } from 'lucide-react'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Fonctionnalités de GymWatch',
  description:
    'Découvrez GymWatch, SaaS pour salles de sport : vue multi-salles, contrôle d’accès, gestion des abonnements et reporting avancé.',
  keywords: [
    'logiciel de gestion de salle de sport',
    'SaaS pour salles de sport',
    'contrôle d’accès',
    'réseaux multi-salles',
    'gestion des abonnements',
  ],
}

const navLinks = [
  { label: 'Fonctionnalités', href: '/features' },
  { label: 'Plans', href: '/plans' },
  { label: 'FAQ', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
]

const featureSections = [
  {
    title: 'Vue multi-salles',
    description:
      'Surveillez vos clubs en un clin d’œil : fréquentation, revenus, NPS et incidents par site pour vos réseaux multi-salles / multi-sites.',
    points: [
      'Tableaux de bord consolidés par club et par réseau',
      'Filtrez par site, par équipe ou par segment de membres',
      'Alertes en temps réel sur les anomalies d’accès ou de paiement',
    ],
    icon: BarChart3,
  },
  {
    title: 'Contrôle d’accès et suivi de présence',
    description:
      'QR codes, badges ou tourniquets : validez les passages en quelques millisecondes avec journalisation complète.',
    points: [
      'Droits par salle, plage horaire et type d’abonnement',
      'Logs instantanés et alertes en cas d’échec ou de fraude',
      'Statistiques de passage pour ajuster vos équipes',
    ],
    icon: QrCode,
  },
  {
    title: 'Gestion des abonnements et paiements',
    description:
      'Contrats, reconduction, prorata et factures propres. Automatisez la facturation sans tableur ni double saisie.',
    points: [
      'Encaissement multi-moyens et facturation en marque blanche',
      'Suspension (freeze), reconduction automatique et changements de plans',
      'Gestion des remises et coupons contrôlés',
    ],
    icon: Workflow,
  },
  {
    title: 'Automatisations et relances',
    description:
      'Réduisez le churn grâce aux relances email/SMS sur échéances, impayés et retours d’accès refusés.',
    points: [
      'Scénarios prêts à l’emploi pour les renouvellements',
      'Relances sur impayés et suivi des paiements récurrents',
      'Notifications internes pour vos équipes front desk',
    ],
    icon: Bell,
  },
  {
    title: 'Reporting et tableaux de bord',
    description:
      'Indicateurs financiers et opérationnels pour vos salles et votre holding, exportables en CSV/PDF.',
    points: [
      'Revenus, marge, churn et fréquentation par site',
      'Exports comptables pour équipes finance et franchiseurs',
      'Partage sécurisé des rapports aux responsables locaux',
    ],
    icon: LayoutDashboard,
  },
  {
    title: 'Fiabilité, sécurité et API',
    description:
      'SaaS pour salles de sport sécurisé : chiffrement, sauvegardes, rôles granulaires et API ouverte.',
    points: [
      'Rôles et permissions par équipe et par site',
      'Journal d’activité pour les actions sensibles',
      'API pour CRM, site vitrine et tourniquets',
    ],
    icon: ShieldCheck,
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar links={navLinks} />

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Fonctionnalités
          </p>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">Fonctionnalités de GymWatch</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Un logiciel de gestion de salle de sport premium pour vos réseaux multi-salles : contrôle d’accès, abonnements, paiements et reporting dans une interface unifiée.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="hover:shadow-lg">
              <Link href="/plans">Comparer les plans</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">Parler à un expert</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {featureSections.map((section) => {
            const Icon = section.icon
            return (
              <Card
                key={section.title}
                className="group h-full border border-border/60 bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg animate-slide-up"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <CardTitle className="text-xl transition-colors group-hover:text-primary">{section.title}</CardTitle>
                  </div>
                  <CardDescription className="leading-relaxed">{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {section.points.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                      <span>{point}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Suivi de présence</CardTitle>
              <CardDescription>
                Contrôle d’accès et suivi des passages par tranche horaire pour mieux planifier vos équipes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Synchronisation en temps réel sur l’ensemble des clubs.</p>
              <p>Alertes sur tentatives refusées et capacité d’accueil.</p>
              <p>Exports pour vos audits et franchises.</p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Automatisation financière</CardTitle>
              <CardDescription>
                Réduisez les impayés avec des relances automatisées et des factures propres.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Relances email/SMS paramétrables et historiques traçables.</p>
              <p>Factures en marque blanche conformes aux exigences locales.</p>
              <p>Suivi des encaissements par club et par plan.</p>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Sécurité et API</CardTitle>
              <CardDescription>
                Sécurisez vos données et connectez GymWatch à vos outils existants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Chiffrement, sauvegardes régulières et journal d’activité.</p>
              <p>Permissions fines pour chaque équipe et rôle.</p>
              <p>API documentée pour CRM, sites web ou tourniquets.</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/60 bg-linear-to-r from-card via-card/70 to-card/50 px-6 py-10 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Prêt à explorer ?</p>
              <h2 className="text-2xl font-bold">Testez GymWatch sur votre réseau</h2>
              <p className="max-w-2xl text-muted-foreground">
                Un expert vous accompagne pour cadrer la gestion des abonnements, le contrôle d’accès et le reporting multi-salles.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="hover:shadow-lg">
                <Link href="/request-demo">Demander une démo</Link>
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
