import type { Metadata } from "next"
import { ShieldCheck, Database, Clock3, Lock, UserCheck, Mail, Phone, MapPin } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link, type AppLocale } from "@/i18n/routing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PrivacyPageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "privacyPage.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "privacyPage" })

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@gymwatch.ma"
  const supportPhone = process.env.SUPPORT_PHONE || process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+212 6 00 00 00 00"
  const companyAddress =
    process.env.COMPANY_ADDRESS ||
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    (locale === "ar" ? "الدار البيضاء، المغرب" : "Casablanca, Maroc")

  const supportMailto = `mailto:${supportEmail}`

  const dirClass = locale === "ar" ? "rtl text-right" : "ltr text-left"

  const collected = (t.raw("sections.collected.items") as string[]) ?? []
  const purposes = (t.raw("sections.purposes.items") as string[]) ?? []
  const legal = (t.raw("sections.legal.items") as string[]) ?? []
  const rights = (t.raw("sections.rights.items") as string[]) ?? []

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-background text-foreground", dirClass)}>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.06),transparent_50%)]" />
      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        {/* Hero */}
        <section className="space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("hero.badge")}
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">{t("hero.title")}</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{t("hero.subtitle")}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <Link href="/request-demo">{t("hero.primaryCta")}</Link>
            </Button>
            <Button asChild variant="outline" className="bg-transparent transition-all duration-300 hover:bg-primary/5">
              <a href={supportMailto}>{t("hero.secondaryCta")}</a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/80">{t("hero.disclaimer")}</p>
        </section>

        {/* Intro */}
        <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">{t("sections.intro.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>{t("sections.intro.body")}</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-semibold text-foreground">{supportEmail}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <Phone className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-semibold text-foreground">{supportPhone}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-semibold text-foreground">{companyAddress}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Database className="h-5 w-5 text-primary" aria-hidden />
              {t("sections.collected.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="space-y-2">
              {collected.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Purposes */}
        <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserCheck className="h-5 w-5 text-primary" aria-hidden />
              {t("sections.purposes.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="space-y-2">
              {purposes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Legal basis */}
        <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              {t("sections.legal.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="space-y-2">
              {legal.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Retention + Security + Rights */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-4 w-4 text-primary" aria-hidden />
                {t("sections.retention.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">{t("sections.retention.body")}</CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-4 w-4 text-primary" aria-hidden />
                {t("sections.security.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">{t("sections.security.body")}</CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-4 w-4 text-primary" aria-hidden />
                {t("sections.rights.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="space-y-2">
                {rights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Contact */}
        <Card className="border border-primary/20 bg-linear-to-br from-card to-card/60 shadow-lg animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">{t("sections.contact.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t("sections.contact.body")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <a href={supportMailto}>{t("sections.contact.actions.email")}</a>
              </Button>
              <Button asChild variant="outline" className="bg-transparent transition-all duration-300 hover:bg-primary/5">
                <Link href="/contact">{t("sections.contact.actions.contactPage")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Changes */}
        <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle className="text-xl">{t("sections.changes.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            {t("sections.changes.body")}
            <div className="mt-3 text-xs text-muted-foreground/80">
              {t("sections.changes.lastUpdatedLabel")} {t("sections.changes.lastUpdatedValue")}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
