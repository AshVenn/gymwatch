import type { Metadata } from "next"
import { FileText, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, type AppLocale } from "@/i18n/routing"

type LicensesPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: LicensesPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "licensesPage.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

export default async function LicensesPage({ params }: LicensesPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "licensesPage" })

  // Must exist in /public
  const licensesFilePath = "/THIRD_PARTY_LICENSES.txt"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        {/* Hero */}
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t("hero.badge")}
          </p>

          <h1 className="text-balance text-4xl font-bold md:text-5xl">{t("hero.title")}</h1>

          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{t("hero.description")}</p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 hover:shadow-lg">
              <a href={licensesFilePath} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4" aria-hidden />
                {t("hero.openFile")}
              </a>
            </Button>

            <Button asChild variant="outline" className="bg-transparent">
              <a href={licensesFilePath} download>
                {t("hero.downloadFile")}
              </a>
            </Button>
          </div>
        </section>

        {/* Content */}
        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">{t("content.title")}</CardTitle>
            <CardDescription className="leading-relaxed">{t("content.description")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t("content.listIntro")}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{t("content.items.framework")}</li>
                <li>{t("content.items.ui")}</li>
                <li>{t("content.items.fonts")}</li>
                <li>{t("content.items.i18n")}</li>
                <li>{t("content.items.auth")}</li>
                <li>{t("content.items.analytics")}</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{t("content.fullListTitle")}</p>
              <p className="mt-1">
                {t("content.fullListBody")}{" "}
                <a href={licensesFilePath} className="font-semibold text-primary hover:underline">
                  {licensesFilePath}
                </a>
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{t("content.fontsTitle")}</p>
              <p className="mt-1">{t("content.fontsBody")}</p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{t("content.brandTitle")}</p>
              <p className="mt-1">{t("content.brandBody")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/contact">{t("content.contactCta")}</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent">
                <Link href="/">{t("content.backHome")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">{t("footerNote")}</p>
      </main>
    </div>
  )
}
