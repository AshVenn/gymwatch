"use client"

import { CheckCircle2 } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CometCard } from "@/components/home/comet-card"
import { cn } from "@/lib/utils"

type PlanCardProps = {
  planName: string
  description: string
  price: number
  priceLabel: string
  billingHint: string
  badges: string[]
  features: string[]
  ctaLabel: string
  ctaHref: string
  isHighlighted?: boolean
  highlightLabel?: string
  showAnnualSavings?: boolean
  annualSavingsText?: string
  perMonthLabel?: string
  animationDelay?: string
  tier: "basic" | "pro" | "enterprise"
}

export function PlanCard({
  planName,
  description,
  priceLabel,
  billingHint,
  badges,
  features,
  ctaLabel,
  ctaHref,
  isHighlighted = false,
  highlightLabel,
  showAnnualSavings = false,
  annualSavingsText,
  perMonthLabel,
  animationDelay = "0s",
  tier,
}: PlanCardProps) {
  /**
   * PRIMARY-ANCHORED SYSTEM
   * - Same base color (primary)
   * - Different saturation / warmth / glow
   */
  const tierStyles =
    tier === "enterprise"
      ? {
          card: "bg-linear-to-br from-primary via-indigo-600 to-sky-600 border-primary/40",
          glow:
            "bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.28),transparent_55%),radial-gradient(circle_at_78%_22%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(circle_at_70%_82%,rgba(56,189,248,0.30),transparent_60%)]",
          cta: "bg-white text-primary hover:bg-white/90",
        }
      : tier === "pro"
        ? {
            card: "bg-linear-to-br from-primary/90 via-amber-500 to-orange-600 border-primary/30",
            glow:
              "bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.20),transparent_55%),radial-gradient(circle_at_75%_30%,rgba(245,158,11,0.35),transparent_55%)]",
            cta: "bg-white text-slate-900 hover:bg-white/90",
          }
        : {
            // Basic = primary desaturated / graphite
            card: "bg-linear-to-br from-primary/80 via-slate-800 to-zinc-900 border-primary/20",
            glow:
              "bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.12),transparent_60%),radial-gradient(circle_at_75%_30%,rgba(148,163,184,0.18),transparent_60%)]",
            cta: "bg-white text-slate-900 hover:bg-white/90",
          }

  return (
    <CometCard className="animate-slide-up h-full" rotateDepth={12} translateDepth={15}>
      <Card
        className={cn(
          "relative h-full overflow-hidden border text-white transition-all duration-300",
          tierStyles.card,
        )}
        style={{ animationDelay }}
      >
        {/* Glow layers */}
        <div className={cn("pointer-events-none absolute inset-0 opacity-95", tierStyles.glow)} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/12 via-transparent to-transparent" />

        {isHighlighted && highlightLabel && (
          <span className="absolute right-4 top-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg animate-pulse">
            {highlightLabel}
          </span>
        )}

        <CardHeader className="relative space-y-3">
          <CardTitle className="text-2xl text-white">{planName}</CardTitle>
          <CardDescription className="leading-relaxed text-white/90">{description}</CardDescription>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{priceLabel}</span>
            {perMonthLabel && <span className="text-sm text-white/80">{perMonthLabel}</span>}
          </div>

          <p className="text-sm text-white/80">{billingHint}</p>

          {showAnnualSavings && annualSavingsText && (
            <p className="text-xs font-semibold text-white">{annualSavingsText}</p>
          )}
        </CardHeader>

        <CardContent className="relative space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/30 bg-white/20 backdrop-blur-sm px-2 py-1 text-[12px] font-semibold text-white"
              >
                {badge}
              </span>
            ))}
          </div>

          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-white/90">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-white" aria-hidden />
              <span>{feature}</span>
            </div>
          ))}

          <Button
            asChild
            variant="outline"
            className={cn(
              "mt-2 w-full border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm",
              isHighlighted && tierStyles.cta,
            )}
          >
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </CometCard>
  )
}
