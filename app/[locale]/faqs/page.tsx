import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { routing, type AppLocale } from '@/i18n/routing'
import { buildMarketingMetadata, getMarketingCopy } from '@/lib/marketing-content'

type FaqPageProps = {
  params: { locale: string }
}

const faqs = [
  {
    question: "Qu’est-ce que GymWatch ?",
    answer:
      "GymWatch est une plateforme web pour piloter vos salles de sport : abonnements, paiements, contrôle d’accès et reporting, le tout en temps réel depuis un simple navigateur.",
  },
  {
    question: 'GymWatch gère-t-il plusieurs salles ou franchises ?',
    answer:
      "Oui. L’interface multi-sites vous permet de suivre chaque club (membres, revenus, passages) et d’agréger les chiffres clés pour comparer vos performances.",
  },
  {
    question: "Faut-il installer un logiciel ?",
    answer:
      "Non. GymWatch est 100 % web : un navigateur suffit. Les QR codes et le scan fonctionnent via une tablette ou un smartphone connecté.",
  },
  {
    question: "Comment se passe le passage de l’offre Basic à Pro / Enterprise ?",
    answer:
      "Vous pouvez changer d’offre à tout moment. Le passage à Pro ou Enterprise débloque les QR codes, les exports CSV/PDF, les statistiques détaillées ainsi que les scénarios d’automatisation avancés.",
  },
  {
    question: 'Puis-je commencer avec une salle et en ajouter d’autres plus tard ?',
    answer:
      "Oui. Ajoutez de nouvelles salles en quelques clics, puis rattachez vos équipes et vos membres. Les droits d’accès et les rapports peuvent être filtrés par salle.",
  },
  {
    question: 'Comment sont gérées les données et la sécurité ?',
    answer:
      "Les données sont chiffrées en transit et sauvegardées régulièrement. Les accès sont liés à des comptes administrateurs avec rôles, et nous appliquons les bonnes pratiques de journalisation et de séparation des environnements.",
  },
]

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const locale = routing.locales.includes(params.locale as AppLocale)
    ? (params.locale as AppLocale)
    : routing.defaultLocale

  return buildMarketingMetadata('faqs', locale)
}

export default async function FaqPage() {
  const locale = (await getLocale()) as AppLocale
  const heroCopy = getMarketingCopy(locale).hero.faqs

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12">
        {/* Hero */}
        <section className="space-y-4 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            {heroCopy.eyebrow}
          </div>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">{heroCopy.title}</h1>
          <p className="mx-auto max-w-2xl text-balance text-primary font-semibold">{heroCopy.subtitle}</p>
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">{heroCopy.description}</p>
        </section>

        {/* Accordion */}
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">Questions fréquentes</CardTitle>
            <CardDescription>
              Découvrez comment GymWatch accompagne les réseaux de salles : multi-sites, analytics, contrôle d’accès et
              roadmap marketing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={`item-${index + 1}`}
                  className="rounded-xl border border-border/60 px-3 data-[state=open]:border-primary/50 data-[state=open]:bg-primary/5"
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-base leading-relaxed text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA */}
          <Card className="rounded-3xl border border-primary/20 bg-linear-to-br from-card to-card/60 shadow-lg animate-slide-up">
            <CardContent className="flex flex-col items-start gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Support</p>
                <h2 className="text-balance text-2xl font-bold md:text-3xl">{heroCopy.subtitle}</h2>
                <p className="max-w-md text-muted-foreground">
                  {heroCopy.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="transition-transform hover:scale-105 hover:shadow-lg">
                  <Link href="/request-demo">{heroCopy.primaryCta}</Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  className="transition-transform hover:scale-105 hover:shadow-lg"
                >
                  <Link href="mailto:hello@gymwatch.ma">{heroCopy.secondaryCta}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
      </main>
    </div>
  )
}
