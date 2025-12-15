import type { Metadata } from "next"
import { BookOpen, ShieldCheck, Users, QrCode, Wrench, ArrowRight, Mail } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Link, type AppLocale } from "@/i18n/routing"

import { CometCardsCarousel, type CometCarouselItem } from "@/components/home/carousel"

type DocsPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "docs.metadata" })
  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "docs" })

  const supportEmail = process.env.SUPPORT_EMAIL || "contact@gymwatch.ma"
  const supportMailto = `mailto:${supportEmail}`

  const sections = [
    {
      title: t("sections.gettingStarted.title"),
      description: t("sections.gettingStarted.description"),
      icon: BookOpen,
      bullets: t.raw("sections.gettingStarted.bullets") as string[],
    },
    {
      title: t("sections.roles.title"),
      description: t("sections.roles.description"),
      icon: Users,
      bullets: t.raw("sections.roles.bullets") as string[],
    },
    {
      title: t("sections.access.title"),
      description: t("sections.access.description"),
      icon: QrCode,
      bullets: t.raw("sections.access.bullets") as string[],
    },
    {
      title: t("sections.security.title"),
      description: t("sections.security.description"),
      icon: ShieldCheck,
      bullets: t.raw("sections.security.bullets") as string[],
    },
  ] as const

  const faq = t.raw("faq.items") as { q: string; a: string }[]

  // Carousel: representative images only (NO links)
  const carouselItems: CometCarouselItem[] = [
    {
      kicker: t("carousel.kickers.overview"),
      title: t("carousel.items.dashboard.title"),
      description: t("carousel.items.dashboard.description"),
      imageSrc: "/Docs/dashboard.png",
      imageAlt: t("carousel.items.dashboard.alt"),
    },
    {
      kicker: t("carousel.kickers.management"),
      title: t("carousel.items.members.title"),
      description: t("carousel.items.members.description"),
      imageSrc: "/Docs/members.png",
      imageAlt: t("carousel.items.members.alt"),
    },
    {
      kicker: t("carousel.kickers.security"),
      title: t("carousel.items.accessLogs.title"),
      description: t("carousel.items.accessLogs.description"),
      imageSrc: "/Docs/access-logs.png",
      imageAlt: t("carousel.items.accessLogs.alt"),
    },
    {
      kicker: t("carousel.kickers.tracking"),
      title: t("carousel.items.presence.title"),
      description: t("carousel.items.presence.description"),
      imageSrc: "/Docs/presence.png",
      imageAlt: t("carousel.items.presence.alt"),
    },
    {
      kicker: t("carousel.kickers.planning"),
      title: t("carousel.items.classes.title"),
      description: t("carousel.items.classes.description"),
      imageSrc: "/Docs/classes.png",
      imageAlt: t("carousel.items.classes.alt"),
    },
    {
      kicker: t("carousel.kickers.billing"),
      title: t("carousel.items.subscriptions.title"),
      description: t("carousel.items.subscriptions.description"),
      imageSrc: "/Docs/subscriptions.png",
      imageAlt: t("carousel.items.subscriptions.alt"),
    },
    {
      kicker: t("carousel.kickers.offers"),
      title: t("carousel.items.plans.title"),
      description: t("carousel.items.plans.description"),
      imageSrc: "/Docs/plans.png",
      imageAlt: t("carousel.items.plans.alt"),
    },
  ]

  const carouselLabels = {
    eyebrow: t("carousel.eyebrow"),
    prevAriaLabel: t("carousel.controls.prev"),
    nextAriaLabel: t("carousel.controls.next"),
    modalAriaLabel: t("carousel.modal.aria"),
    closeAriaLabel: t("carousel.modal.close"),
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        {/* Hero */}
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            <Wrench className="h-3.5 w-3.5" aria-hidden />
            {t("hero.badge")}
          </p>

          <h1 className="text-balance text-4xl font-bold md:text-5xl">{t("hero.title")}</h1>

          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{t("hero.description")}</p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="group hover:shadow-lg">
              <Link href="/request-demo">
                <span className="inline-flex items-center gap-2">
                  {t("hero.primaryCta")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="bg-transparent">
              <Link href="/contact">{t("hero.secondaryCta")}</Link>
            </Button>

            {/* typed Link can't handle mailto */}
            <Button asChild variant="secondary">
              <a href={supportMailto} className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden />
                {t("hero.emailCta")}
              </a>
            </Button>
          </div>
        </section>

        {/* Carousel */}
        <section className="space-y-3 animate-fade-in" style={{ animationDelay: "0.04s" }}>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("carousel.sectionEyebrow")}</p>
            <h2 className="text-3xl font-bold tracking-tight">{t("carousel.sectionTitle")}</h2>
            <p className="max-w-2xl text-muted-foreground">{t("carousel.sectionDescription")}</p>
          </div>

          <CometCardsCarousel items={carouselItems} labels={carouselLabels} ariaLabel={t("carousel.aria")} />
        </section>

        {/* Cards */}
        <section className="grid gap-6 md:grid-cols-2 animate-fade-in" style={{ animationDelay: "0.06s" }}>
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <Card
                key={s.title}
                className="group border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <CardTitle className="text-xl">{s.title}</CardTitle>
                      <CardDescription className="leading-relaxed">{s.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {s.bullets.map((b) => (
                    <div key={b} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{b}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </section>

        {/* FAQ */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("faq.eyebrow")}</p>
            <h2 className="text-3xl font-bold tracking-tight">{t("faq.title")}</h2>
            <p className="max-w-2xl text-muted-foreground">{t("faq.description")}</p>
          </div>

          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm">
            <CardContent className="p-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faq.map((item, idx) => (
                  <AccordionItem
                    key={`${item.q}-${idx}`}
                    value={`docs-faq-${idx + 1}`}
                    className="rounded-xl border border-border/60 px-3 data-[state=open]:border-primary/50 data-[state=open]:bg-primary/5"
                  >
                    <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-base leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* Bottom CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 px-6 py-10 shadow-lg backdrop-blur-sm animate-fade-in">
          <div className="floating-orb-primary right-[12%] -top-24 opacity-25" />
          <div className="floating-orb-secondary left-[10%] -bottom-24 opacity-20" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("bottom.kicker")}</p>
              <h2 className="text-2xl font-bold tracking-tight">{t("bottom.title")}</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">{t("bottom.description")}</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild className="hover:shadow-lg">
                <Link href="/request-demo">{t("bottom.primary")}</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/features">{t("bottom.secondary")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
