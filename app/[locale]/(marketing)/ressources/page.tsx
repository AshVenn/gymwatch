import type { Metadata } from "next"
import { ArrowUpRight, BarChart3, Bell, BookOpen, QrCode } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link, type AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type RessourcesPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: RessourcesPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "ressources.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

const ICONS = {
  qr: QrCode,
  automations: Bell,
  kpi: BarChart3,
} as const

type ResourceKey = keyof typeof ICONS

export default async function RessourcesPage({ params }: RessourcesPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "ressources" })

  const resources =
    (t.raw("resources") as Array<{
      key: ResourceKey
      title: string
      description: string
    }>) ?? []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            {t("hero.badge")}
          </p>

          <h1 className="text-balance text-4xl font-bold md:text-5xl">{t("hero.title")}</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">{t("hero.description")}</p>

          <Button asChild className="hover:shadow-lg">
            <Link href="/request-demo">{t("hero.primaryCta")}</Link>
          </Button>
        </section>

        <section className="grid gap-6 md:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.06s" }}>
          {resources.map((resource) => {
            const Icon = ICONS[resource.key] ?? BookOpen
            return (
              <Card
                key={resource.title}
                className="group h-full border border-border/60 bg-card/70 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <CardTitle className="text-xl">{resource.title}</CardTitle>
                  </div>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex items-center justify-between text-sm text-primary">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    {t("resourcesCta.read")}
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </span>
                  <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="rounded-3xl border border-border/60 bg-linear-to-r from-card via-card/70 to-card/50 px-6 py-10 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("bottom.kicker")}</p>
              <h2 className="text-2xl font-bold">{t("bottom.title")}</h2>
              <p className="max-w-2xl text-muted-foreground">{t("bottom.description")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="hover:shadow-lg">
                <Link href="/features">{t("bottom.actions.features")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/plans">{t("bottom.actions.plans")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
