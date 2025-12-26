import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link, type AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type TermsPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "termsPage.metadata" })
  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "termsPage" })

  const supportEmail = process.env.SUPPORT_EMAIL || "hello@gymwatch.ma"
  const supportMailto = `mailto:${supportEmail}`

  return (
    <div className="min-h-screen bg-background text-foreground">

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-16 pt-12">
        <section className="space-y-3 animate-fade-in">
          <p className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            {t("badge")}
          </p>
          <h1 className="text-balance text-4xl font-bold md:text-5xl">{t("title")}</h1>
          <p className="max-w-3xl text-muted-foreground">{t("subtitle")}</p>
          <p className="text-xs text-muted-foreground">{t("updatedAt", { date: t("updatedAtDate") })}</p>
        </section>

        <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">{t("sections.overview.title")}</CardTitle>
            <CardDescription>{t("sections.overview.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 leading-relaxed text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.scope.title")}</h2>
              <p>{t("sections.scope.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.definitions.title")}</h2>
              <ul className="list-disc space-y-2 pl-5">
                {(t.raw("sections.definitions.items") as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.account.title")}</h2>
              <p>{t("sections.account.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.acceptableUse.title")}</h2>
              <ul className="list-disc space-y-2 pl-5">
                {(t.raw("sections.acceptableUse.items") as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.data.title")}</h2>
              <p>{t("sections.data.body")}</p>
              <div className="pt-2">
                <Button asChild variant="outline" className="bg-transparent">
                  <Link locale={locale} href="/privacy">
                    {t("sections.data.cta")}
                  </Link>
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.availability.title")}</h2>
              <p>{t("sections.availability.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.ip.title")}</h2>
              <p>{t("sections.ip.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.liability.title")}</h2>
              <p>{t("sections.liability.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.termination.title")}</h2>
              <p>{t("sections.termination.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.changes.title")}</h2>
              <p>{t("sections.changes.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.law.title")}</h2>
              <p>{t("sections.law.body")}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t("sections.contact.title")}</h2>
              <p>{t("sections.contact.body")}</p>
              <a href={supportMailto} className="font-semibold text-primary hover:underline">
                {supportEmail}
              </a>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
