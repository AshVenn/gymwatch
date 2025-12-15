import type { Metadata } from "next"
import { Clock3, Headphones, Mail, Phone, Send, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link, type AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ContactPageProps = {
  params: Promise<{ locale: AppLocale }>
}

function normalizePhoneForTel(value: string) {
  const trimmed = (value || "").trim()
  const normalized = trimmed.replace(/[^\d+]/g, "")
  return normalized || "+212000000000"
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "contact.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "contact" })

  const supportEmail =
    process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact@gymwatch.ma"
  const supportPhoneRaw =
    process.env.SUPPORT_PHONE || process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+212 (0)6 12 34 56 78"

  const supportMailto = `mailto:${supportEmail}`
  const supportTel = `tel:${normalizePhoneForTel(supportPhoneRaw)}`

  const dirClass = locale === "ar" ? "rtl text-right" : "ltr text-left"

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-background text-foreground", dirClass)}>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.06),transparent_50%)]" />

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-4 pb-16 pt-12">
        {/* Hero */}
        <section className="space-y-4 animate-fade-in">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary shadow-sm">
            {t("hero.badge")}
          </p>

          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">{t("hero.title")}</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{t("hero.description")}</p>
        </section>

        <section
          className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] animate-fade-in"
          style={{ animationDelay: "0.05s" }}
        >
          {/* Form */}
          <Card className="border border-border/50 bg-card/90 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">{t("form.title")}</CardTitle>
              <CardDescription className="leading-relaxed">{t("form.description")}</CardDescription>
            </CardHeader>

            <CardContent>
              {/* NOTE: mailto form submissions are unreliable across browsers.
                  Keep form for UI + add "Email direct" as the reliable path. */}
              <form className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nom">{t("form.fields.name.label")}</Label>
                    <Input
                      id="nom"
                      name="nom"
                      placeholder={t("form.fields.name.placeholder")}
                      className="transition-all duration-200 focus:shadow-sm"
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("form.fields.email.label")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t("form.fields.email.placeholder")}
                      className="transition-all duration-200 focus:shadow-sm"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="societe">{t("form.fields.company.label")}</Label>
                    <Input
                      id="societe"
                      name="societe"
                      placeholder={t("form.fields.company.placeholder")}
                      className="transition-all duration-200 focus:shadow-sm"
                      autoComplete="organization"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sites">{t("form.fields.sites.label")}</Label>
                    <Input
                      id="sites"
                      name="sites"
                      placeholder={t("form.fields.sites.placeholder")}
                      className="transition-all duration-200 focus:shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("form.fields.message.label")}</Label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder={t("form.fields.message.placeholder")}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-all duration-200 focus-visible:border-ring focus-visible:shadow-sm focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* UI submit button (no backend wiring here) */}
                  <Button type="submit" className="gap-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                    {t("form.actions.send")}
                    <Send className="h-4 w-4" aria-hidden />
                  </Button>

                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="gap-2 bg-transparent transition-all duration-300 hover:bg-primary/5"
                  >
                    <a href={supportMailto}>
                      {t("form.actions.emailDirect")}
                      <Mail className="h-4 w-4" aria-hidden />
                    </a>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Side cards */}
          <div className="space-y-4">
            <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">{t("side.support.title")}</CardTitle>
                <CardDescription className="leading-relaxed">{t("side.support.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-primary" aria-hidden />
                  <span>{t("side.support.items.0")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" aria-hidden />
                  <span>{t("side.support.items.1")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                  <span>{t("side.support.items.2")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">{t("side.details.title")}</CardTitle>
                <CardDescription className="leading-relaxed">{t("side.details.description")}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  <a href={supportMailto} className="font-semibold text-primary transition-colors hover:underline">
                    {supportEmail}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" aria-hidden />
                  <a href={supportTel} className="font-semibold text-primary transition-colors hover:underline">
                    {supportPhoneRaw}
                  </a>
                </div>

                <p className="leading-relaxed">{t("side.details.address")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/90 px-6 py-10 shadow-lg backdrop-blur-sm">
          <div className="floating-orb-primary right-[10%] -top-24 opacity-30" />
          <div className="floating-orb-secondary left-[10%] -bottom-24 opacity-25" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{t("bottom.kicker")}</p>
              <h2 className="text-2xl font-bold tracking-tight">{t("bottom.title")}</h2>
              <p className="max-w-2xl leading-relaxed text-muted-foreground">{t("bottom.description")}</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <Link href="/request-demo">{t("bottom.actions.primary")}</Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent transition-all duration-300 hover:bg-primary/5">
                <Link href="/plans">{t("bottom.actions.secondary")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
