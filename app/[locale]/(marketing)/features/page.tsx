import type { Metadata } from "next"
import { BarChart3, Bell, CheckCircle2, LayoutDashboard, QrCode, ShieldCheck, Workflow } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link, type AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type PageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "featuresPage.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
  }
}

export default async function FeaturesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "featuresPage" })

  const navLinks = [
    { label: t("nav.features"), href: "/features" as const },
    { label: t("nav.plans"), href: "/plans" as const },
    { label: t("nav.faq"), href: "/faqs" as const },
    { label: t("nav.contact"), href: "/contact" as const },
  ]

  const featureSections = [
    {
      title: t("sections.multi.title"),
      description: t("sections.multi.description"),
      points: t.raw("sections.multi.points") as string[],
      icon: BarChart3,
    },
    {
      title: t("sections.access.title"),
      description: t("sections.access.description"),
      points: t.raw("sections.access.points") as string[],
      icon: QrCode,
    },
    {
      title: t("sections.subscriptions.title"),
      description: t("sections.subscriptions.description"),
      points: t.raw("sections.subscriptions.points") as string[],
      icon: Workflow,
    },
    {
      title: t("sections.automations.title"),
      description: t("sections.automations.description"),
      points: t.raw("sections.automations.points") as string[],
      icon: Bell,
    },
    {
      title: t("sections.reporting.title"),
      description: t("sections.reporting.description"),
      points: t.raw("sections.reporting.points") as string[],
      icon: LayoutDashboard,
    },
    {
      title: t("sections.security.title"),
      description: t("sections.security.description"),
      points: t.raw("sections.security.points") as string[],
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.06),transparent_50%)]" />
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
            {t("badge")}
          </p>

          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">{t("hero.title")}</h1>

          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{t("hero.description")}</p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <Link locale={locale} href="/plans">
                {t("hero.actions.comparePlans")}
              </Link>
            </Button>

            <Button asChild variant="outline" className="transition-all duration-300 hover:bg-primary/5 bg-transparent">
              <Link locale={locale} href="/contact">
                {t("hero.actions.talkToExpert")}
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {featureSections.map((section, index) => {
            const Icon = section.icon
            return (
              <Card
                key={section.title}
                className="group h-full border border-border/50 bg-card/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg animate-slide-up"
                style={{ animationDelay: `${0.04 + index * 0.04}s` }}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <CardTitle className="text-xl transition-colors duration-300 group-hover:text-primary">
                      {section.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="leading-relaxed">{section.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  {section.points.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="leading-relaxed">{point}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">{t("mini.presence.title")}</CardTitle>
              <CardDescription>{t("mini.presence.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {(t.raw("mini.presence.points") as string[]).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">{t("mini.finance.title")}</CardTitle>
              <CardDescription>{t("mini.finance.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {(t.raw("mini.finance.points") as string[]).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">{t("mini.security.title")}</CardTitle>
              <CardDescription>{t("mini.security.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {(t.raw("mini.security.points") as string[]).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/90 px-6 py-10 shadow-lg backdrop-blur-sm">
          <div className="floating-orb-primary right-[10%] -top-24 opacity-30" />
          <div className="floating-orb-secondary left-[10%] -bottom-24 opacity-25" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("cta.kicker")}</p>
              <h2 className="text-2xl font-bold tracking-tight">{t("cta.title")}</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">{t("cta.description")}</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <Link locale={locale} href="/request-demo">
                  {t("cta.actions.requestDemo")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="transition-all duration-300 hover:bg-primary/5 bg-transparent">
                <Link locale={locale} href="/plans">
                  {t("cta.actions.viewPlans")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
