import type { Metadata } from "next"
import { Cookie, ShieldCheck, Settings2, Info, ExternalLink } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { type AppLocale, Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type CookiesPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: CookiesPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "cookiesPage.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

export default async function CookiesPage({ params }: CookiesPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "cookiesPage" })

  const supportEmail = process.env.SUPPORT_EMAIL || "hello@gymwatch.ma"
  const supportMailto = `mailto:${supportEmail}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        {/* Hero */}
        <section className="space-y-4 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            <Cookie className="h-3.5 w-3.5" aria-hidden />
            {t("hero.badge")}
          </div>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">{t("hero.title")}</h1>
          <p className="mx-auto max-w-3xl text-balance text-muted-foreground">{t("hero.description")}</p>
        </section>

        {/* What are cookies */}
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Info className="h-5 w-5 text-primary" aria-hidden />
              {t("sections.what.title")}
            </CardTitle>
            <CardDescription>{t("sections.what.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{t("sections.what.p1")}</p>
            <p>{t("sections.what.p2")}</p>
          </CardContent>
        </Card>

        {/* What we use */}
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              {t("sections.use.title")}
            </CardTitle>
            <CardDescription>{t("sections.use.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">{t("sections.use.necessary.title")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("sections.use.necessary.items.0")}</li>
                <li>{t("sections.use.necessary.items.1")}</li>
                <li>{t("sections.use.necessary.items.2")}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-foreground">{t("sections.use.preferences.title")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("sections.use.preferences.items.0")}</li>
                <li>{t("sections.use.preferences.items.1")}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-foreground">{t("sections.use.analytics.title")}</p>
              <p>{t("sections.use.analytics.body")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Manage cookies */}
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Settings2 className="h-5 w-5 text-primary" aria-hidden />
              {t("sections.manage.title")}
            </CardTitle>
            <CardDescription>{t("sections.manage.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{t("sections.manage.p1")}</p>
            <p>{t("sections.manage.p2")}</p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/privacy">
                  <span className="inline-flex items-center gap-2">
                    {t("sections.manage.actions.privacy")}
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </Button>

              <Button asChild>
                <a href={supportMailto} className="inline-flex items-center gap-2">
                  {t("sections.manage.actions.contact")}
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
