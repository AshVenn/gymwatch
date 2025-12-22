"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Activity, ArrowRight, CalendarClock, FileSpreadsheet, KeyRound, Lock } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type FeatureAccessItem = {
  id: "access" | "presence" | "classes" | "reports"
  title: string
  description: string
  href: string // chemin SANS locale (ex: "/dashboard/presence")
  requiredPlan?: "PRO" | "ENTERPRISE"
  available: boolean
  icon: LucideIcon
}

interface FeatureAccessGridProps {
  items: FeatureAccessItem[]
  planLabel?: string
  compact?: boolean
  showActions?: boolean
  upgradeHref?: string // ex: "/dashboard/settings"
  className?: string
}

interface LockedFeatureStateProps {
  title: string
  description: string
  planLabel?: string
  items: FeatureAccessItem[]
  upgradeHref?: string
  faqHref?: string
}

export function FeatureAccessGrid({
  items,
  planLabel,
  compact = false,
  showActions = true,
  upgradeHref = "/dashboard/settings",
  className,
}: FeatureAccessGridProps) {
  const locale = useLocale()
  const t = useTranslations("dashboard.featureAccess")
  const isRTL = locale === "ar"

  // Ajoute la locale devant les chemins (on suppose prefix toujours présent)
  const withLocale = (path: string) => {
    const base = path.startsWith("/") ? path : `/${path}`
    return `/${locale}${base}`
  }

  const activeCount = items.filter((item) => item.available).length
  const columns = compact ? "sm:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"
  const localizedUpgradeHref = withLocale(upgradeHref)

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="space-y-0.5">
          <p className="text-[17px] font-semibold">{t("modulesTitle")}</p>
          <p className="text-[13px] text-muted-foreground">
            {t("modulesCount", { active: activeCount, total: items.length })}
            {planLabel ? <> · {t("planLabel", { plan: planLabel })}</> : null}
          </p>
        </div>
        {planLabel ? (
          <Badge variant="outline" className="border-border/40 text-[11px] uppercase tracking-wider px-2.5 py-1">
            {planLabel}
          </Badge>
        ) : null}
      </div>

      <div className={cn("grid gap-3", columns)}>
        {items.map((item) => {
          const Icon = item.icon
          const isLocked = !item.available
          const localizedHref = withLocale(item.href)

          return (
            <div
              key={item.id}
              className={cn(
                "flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition-all duration-200",
                isLocked ? "border-border/30 opacity-70" : "border-border/40 hover:bg-muted/30 active:scale-[0.98]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border",
                      isLocked
                        ? "border-border/30 bg-muted/30 text-muted-foreground"
                        : "border-border/40 bg-muted/40 text-foreground",
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-[15px] font-medium leading-snug">{item.title}</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">{item.description}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 border-border/40 bg-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    isLocked ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {isLocked ? t("badges.notIncluded") : t("badges.included")}
                </Badge>
              </div>

              {showActions ? (
                <div className="mt-auto flex items-center gap-2 pt-1">
                  {isLocked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-xl border-border/40 text-[15px] font-medium text-foreground hover:bg-muted/60 active:scale-95 bg-transparent"
                      asChild
                    >
                      <Link href={localizedUpgradeHref}>
                        <Lock className="mr-2 h-4 w-4" />
                        {t("actions.upgrade")}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-xl px-2 text-[15px] text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-95"
                      asChild
                    >
                      <Link href={localizedHref}>
                        {t("actions.open")}
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LockedFeatureState({
  title,
  description,
  planLabel,
  items,
  upgradeHref = "/dashboard/settings",
  faqHref = "/faqs",
}: LockedFeatureStateProps) {
  const locale = useLocale()
  const t = useTranslations("dashboard.featureAccess")
  const isRTL = locale === "ar"

  const withLocale = (path: string) => {
    const base = path.startsWith("/") ? path : `/${path}`
    return `/${locale}${base}`
  }

  const localizedUpgradeHref = withLocale(upgradeHref)
  const localizedFaqHref = withLocale(faqHref)

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-4 rounded-2xl border border-border/40 bg-muted/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[17px] font-semibold">{title}</p>
          <p className="text-[15px] text-muted-foreground">{description}</p>
        </div>
        {planLabel ? (
          <Badge variant="outline" className="border-border/40 text-[11px] uppercase tracking-wider px-2.5 py-1">
            {t("planLabel", { plan: planLabel })}
          </Badge>
        ) : null}
      </div>

      <FeatureAccessGrid items={items} planLabel={planLabel} compact showActions={false} />

      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-xl border-border/40 px-4 text-[15px] font-medium text-foreground hover:bg-muted/60 active:scale-95 bg-transparent"
        >
          <Link href={localizedUpgradeHref}>{t("actions.upgrade")}</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="h-9 rounded-xl px-3 text-[15px] text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-95"
        >
          <Link href={localizedFaqHref}>{t("actions.seePlans")}</Link>
        </Button>
      </div>
    </div>
  )
}

export function buildFeatureAccessItems(options: {
  hasAccessControl: boolean
  hasPresence: boolean
  hasCourses: boolean
  hasExcelReports?: boolean
  t: (key: string, values?: Record<string, string | number | Date | boolean | null>) => string
}): FeatureAccessItem[] {
  const { hasAccessControl, hasPresence, hasCourses, hasExcelReports = false, t } = options

  return [
    {
      id: "access" as const,
      title: t("items.access.title"),
      description: t("items.access.description"),
      href: "/dashboard/access-logs",
      requiredPlan: "PRO" as const,
      available: hasAccessControl,
      icon: KeyRound,
    },
    {
      id: "presence" as const,
      title: t("items.presence.title"),
      description: t("items.presence.description"),
      href: "/dashboard/presence",
      requiredPlan: "PRO" as const,
      available: hasPresence,
      icon: Activity,
    },
    {
      id: "classes" as const,
      title: t("items.classes.title"),
      description: t("items.classes.description"),
      href: "/dashboard/classes",
      requiredPlan: "ENTERPRISE" as const,
      available: hasCourses,
      icon: CalendarClock,
    },
    {
      id: "reports" as const,
      title: t("items.reports.title"),
      description: t("items.reports.description"),
      href: "/dashboard",
      requiredPlan: "PRO" as const,
      available: hasExcelReports,
      icon: FileSpreadsheet,
    },
  ]
}
