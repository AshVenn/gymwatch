import type { Metadata } from "next"
import { CheckCircle2, Compass, ShieldCheck, Sparkles, Users } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link, type AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AboutPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "about.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

type TimelineItem = { title: string; detail: string }

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "about" })

  const navLinks = [
    { label: t("nav.features"), href: "/features" as const },
    { label: t("nav.plans"), href: "/plans" as const },
    { label: t("nav.faq"), href: "/faqs" as const },
    { label: t("nav.contact"), href: "/contact" as const },
  ]

  const timeline = t.raw("timeline") as TimelineItem[]

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.06),transparent_50%)]" />

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        {/* Hero */}
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
            {t("badge")}
          </p>

          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">{t("hero.title")}</h1>

          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{t("hero.description")}</p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <Link href="/request-demo">{t("hero.actions.requestDemo")}</Link>
            </Button>

            <Button asChild variant="outline" className="transition-all duration-300 hover:bg-primary/5 bg-transparent">
              <Link href="/features">{t("hero.actions.viewFeatures")}</Link>
            </Button>
          </div>
        </section>

        {/* 3 cards */}
        <section className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.06s" }}>
          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                {t("cards.mission.title")}
              </CardTitle>
              <CardDescription className="leading-relaxed">{t("cards.mission.description")}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </span>
                {t("cards.security.title")}
              </CardTitle>
              <CardDescription className="leading-relaxed">{t("cards.security.description")}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Compass className="h-4 w-4" aria-hidden />
                </span>
                {t("cards.vision.title")}
              </CardTitle>
              <CardDescription className="leading-relaxed">{t("cards.vision.description")}</CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Timeline */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-3xl font-bold tracking-tight">{t("trajectory.title")}</h2>

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

        {/* Team + CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/90 px-6 py-10 shadow-lg backdrop-blur-sm">
          <div className="floating-orb-primary right-[10%] -top-24 opacity-30" />
          <div className="floating-orb-secondary left-[10%] -bottom-24 opacity-25" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("team.kicker")}</p>
              <h2 className="text-2xl font-bold tracking-tight">{t("team.title")}</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">{t("team.description")}</p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" aria-hidden />
                {t("team.bullets.0")}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                {t("team.bullets.1")}
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3">
            <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <Link href="/contact">{t("team.actions.contact")}</Link>
            </Button>
            <Button asChild variant="outline" className="transition-all duration-300 hover:bg-primary/5 bg-transparent">
              <Link href="/plans">{t("team.actions.choosePlan")}</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
