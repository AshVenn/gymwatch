import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link, type AppLocale } from "@/i18n/routing"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type FaqPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "faqs.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
  }
}

type FaqItem = { question: string; answer: string }

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "faqs" })
  const faqs = t.raw("items") as FaqItem[]

  const supportEmail = process.env.SUPPORT_EMAIL || "contact@gymwatch.ma"
  const supportHref = `mailto:${supportEmail}`

  return (
    <div className="min-h-screen bg-background text-foreground">

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12">
        {/* Hero */}
        <section className="space-y-4 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            {t("hero.eyebrow")}
          </div>

          <h1 className="text-balance text-4xl font-bold md:text-5xl">{t("hero.title")}</h1>

          <p className="mx-auto max-w-2xl text-balance text-primary font-semibold">{t("hero.subtitle")}</p>

          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">{t("hero.description")}</p>
        </section>

        {/* Accordion */}
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">{t("accordion.title")}</CardTitle>
            <CardDescription>{t("accordion.description")}</CardDescription>
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("cta.kicker")}</p>
              <h2 className="text-balance text-2xl font-bold md:text-3xl">{t("cta.title")}</h2>
              <p className="max-w-md text-muted-foreground">{t("cta.description")}</p>

              {/* Optional: show the email (remove if you don't want it visible) */}
              <p className="text-sm text-muted-foreground">{supportEmail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="transition-transform hover:scale-105 hover:shadow-lg">
                <Link href="/request-demo">{t("cta.primaryCta")}</Link>
              </Button>

              {/* ✅ mailto must NOT use typed Link */}
              <Button asChild variant="secondary" className="transition-transform hover:scale-105 hover:shadow-lg">
                <a href={supportHref}>{t("cta.secondaryCta")}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
