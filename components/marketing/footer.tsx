import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react"

export function MarketingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-border/40 bg-card/30 backdrop-blur-sm mt-20">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Image src="/logo.svg" alt="GymWatch" width={140} height={48} className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              La plateforme tout-en-un pour gérer votre salle de sport avec intelligence et simplicité.
            </p>
            <div className="flex gap-3">
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Produit</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/features" className="text-muted-foreground transition-colors hover:text-primary">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="/plans" className="text-muted-foreground transition-colors hover:text-primary">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/request-demo" className="text-muted-foreground transition-colors hover:text-primary">
                  Demander une démo
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                  À propos
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Support</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground transition-colors hover:text-primary">
                  Centre d'aide
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-muted-foreground transition-colors hover:text-primary">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-muted-foreground transition-colors hover:text-primary">
                  Statut
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Légal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground transition-colors hover:text-primary">
                  Conditions
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-muted-foreground transition-colors hover:text-primary">
                  Cookies
                </Link>
              </li>
              <li>
                <Link href="/licenses" className="text-muted-foreground transition-colors hover:text-primary">
                  Licences
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-sm text-muted-foreground md:flex-row">
          <p>© {currentYear} GymWatch. Tous droits réservés.</p>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <a href="mailto:contact@gymwatch.com" className="transition-colors hover:text-primary">
              contact@gymwatch.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
