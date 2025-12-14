"use client"

import Image from "next/image"
import { Facebook, Instagram, Linkedin, Mail, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/routing"

export function MarketingFooter() {
  const t = useTranslations("footer")
  const currentYear = new Date().getFullYear()

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contact@gymwatch.com"
  const supportMailto = `mailto:${supportEmail}`

  return (
    <footer className="relative mt-20 border-t border-border/40 bg-card/30 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Image src="/GymWatch.svg" alt="GymWatch" width={300} height={300} className="h-8 w-auto" />
            <p className="text-sm leading-relaxed text-muted-foreground">{t("brand.description")}</p>

            <div className="flex gap-3">
              <a
                href={t("social.facebookHref")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                aria-label={t("social.facebookLabel")}
                rel="noreferrer"
                target="_blank"
              >
                <Facebook className="h-4 w-4" />
              </a>

              <a
                href={t("social.twitterHref")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                aria-label={t("social.twitterLabel")}
                rel="noreferrer"
                target="_blank"
              >
                <X className="h-4 w-4" />
              </a>

              <a
                href={t("social.instagramHref")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                aria-label={t("social.instagramLabel")}
                rel="noreferrer"
                target="_blank"
              >
                <Instagram className="h-4 w-4" />
              </a>

              <a
                href={t("social.linkedinHref")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                aria-label={t("social.linkedinLabel")}
                rel="noreferrer"
                target="_blank"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("product.title")}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/features" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("product.features")}
                </Link>
              </li>
              <li>
                <Link href="/plans" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("product.pricing")}
                </Link>
              </li>
              <li>
                <Link href="/ressources" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("product.resources")}
                </Link>
              </li>
              <li>
                <Link href="/request-demo" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("product.requestDemo")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("product.about")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("support.title")}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("support.contact")}
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("support.docs")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("legal.title")}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("legal.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("legal.terms")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("legal.cookies")}
                </Link>
              </li>
              <li>
                <Link href="/licenses" className="text-muted-foreground transition-colors hover:text-primary">
                  {t("legal.licenses")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-sm text-muted-foreground md:flex-row">
          <p>{t("bottom.copyright", { year: currentYear })}</p>

          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <a href={supportMailto} className="transition-colors hover:text-primary">
              {supportEmail}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
