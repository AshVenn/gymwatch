"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CalendarClock, Sparkles, ArrowLeft, ArrowRight, Activity, CalendarClock as ClassesIcon, FileSpreadsheet, KeyRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { SubscriptionFeaturesDock, type SubscriptionDockItem } from "@/components/dashboard/subscription-features-dock"

function formatPlanKey(plan?: string | null) {
  if (plan === "PRO") return "pro"
  if (plan === "ENTERPRISE") return "enterprise"
  return "basic"
}

function formatIntervalKey(interval?: string | null) {
  return interval === "ANNUAL" ? "annual" : "monthly"
}

export function SubscriptionBanner() {
  const { data: session } = useSession()
  const t = useTranslations("subscriptionBanner")
  const tFeatures = useTranslations("dashboard.featureAccess")
  const locale = useLocale()
  const isRTL = locale === "ar"

  const Arrow = isRTL ? ArrowLeft : ArrowRight

  const subscriptionStatus = session?.user?.subscriptionStatus ?? null
  const expiresAtRaw = session?.user?.subscriptionExpiresAt ?? null
  const demoEndsAtRaw = (session?.user as any)?.demoEndsAt ?? null
  const isDemo = Boolean((session?.user as any)?.isDemo)

  const planKey = formatPlanKey(session?.user?.subscriptionPlan ?? null)
  const intervalKey = formatIntervalKey(session?.user?.billingInterval ?? null)

  const planLabel = t(`plan.${planKey}`)
  const intervalLabel = t(`interval.${intervalKey}`)

  // ---- build feature dock items (localized href) ----
  const withLocale = (path: string) => {
    const base = path.startsWith("/") ? path : `/${path}`
    return `/${locale}${base}`
  }

  // You likely already compute these booleans in your dashboard page.
  // Replace these with your real access flags.
  const hasAccessControl = Boolean((session?.user as any)?.hasAccessControl ?? true)
  const hasPresence = Boolean((session?.user as any)?.hasPresence ?? true)
  const hasCourses = Boolean((session?.user as any)?.hasCourses ?? true)
  const hasExcelReports = Boolean((session?.user as any)?.hasExcelReports ?? true)

  const dockItems: SubscriptionDockItem[] = [
    {
      id: "access",
      title: tFeatures("items.access.title"),
      description: tFeatures("items.access.description"),
      href: withLocale("/dashboard/access-logs"),
      requiredPlan: "PRO",
      available: hasAccessControl,
      icon: KeyRound,
    },
    {
      id: "presence",
      title: tFeatures("items.presence.title"),
      description: tFeatures("items.presence.description"),
      href: withLocale("/dashboard/presence"),
      requiredPlan: "PRO",
      available: hasPresence,
      icon: Activity,
    },
    {
      id: "classes",
      title: tFeatures("items.classes.title"),
      description: tFeatures("items.classes.description"),
      href: withLocale("/dashboard/classes"),
      requiredPlan: "ENTERPRISE",
      available: hasCourses,
      icon: ClassesIcon,
    },
    {
      id: "reports",
      title: tFeatures("items.reports.title"),
      description: tFeatures("items.reports.description"),
      href: withLocale("/dashboard"),
      requiredPlan: "PRO",
      available: hasExcelReports,
      icon: FileSpreadsheet,
    },
  ]

  const localizedManageHref = withLocale("/dashboard/settings")

  const { message, tone, daysLeft } = useMemo(() => {
    if (!subscriptionStatus) return { message: null, tone: null, daysLeft: null }

    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null
    const diffDays = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

    if (subscriptionStatus === "EXPIRED" || (diffDays !== null && diffDays < 0)) {
      return { tone: "danger" as const, message: t("expiredMessage"), daysLeft: diffDays }
    }

    if (diffDays !== null && diffDays <= 7) {
      return { tone: "warning" as const, message: t("expiringIn", { days: diffDays }), daysLeft: diffDays }
    }

    return { message: null, tone: null, daysLeft: diffDays }
  }, [expiresAtRaw, subscriptionStatus, t])

  const demoSuffix = isDemo ? t("demoSuffix") : ""

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d)

  // ---------------------------------------------------------
  // NORMAL (no warning/expired) banner
  // ---------------------------------------------------------
  if (!message || !tone) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-linear-to-br from-primary/95 via-indigo-600 to-sky-600 p-6 shadow-xl shadow-primary/20 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30"
      >
        {/* Dock goes inside banner */}
        <SubscriptionFeaturesDock items={dockItems} upgradeHref={localizedManageHref} />

        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.4),transparent_70%)] blur-3xl opacity-70" />
        <div className="absolute top-0 right-0 h-32 w-32 bg-white/10 rounded-full blur-3xl -translate-y-8 translate-x-8" />

        <div className="relative flex flex-col gap-3 text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/90 font-semibold">
            <Sparkles className="h-4 w-4 animate-pulse" />
            {t("brandLine", { plan: planLabel, demoSuffix })}
          </div>

          <p className="text-lg font-bold tracking-tight">
            {t("planInterval", { plan: planLabel, interval: intervalLabel })}
          </p>

          <p className="text-sm text-white/90 leading-relaxed">
            {isDemo && demoEndsAtRaw
              ? t("demoActiveUntil", { date: formatDate(new Date(demoEndsAtRaw)) })
              : t("thanks")}
          </p>

          <Link
            href={localizedManageHref}
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-white/90 transition-all group-hover:gap-3"
          >
            {t("manage")}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------
  // WARNING / EXPIRED banner
  // ---------------------------------------------------------
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative overflow-hidden rounded-3xl border border-orange-300/60 bg-linear-to-br from-[#FFF7ED] via-[#FED7AA] to-[#FDBA74] p-6 text-slate-900 shadow-lg transition-all duration-300 hover:shadow-xl"
    >
      <SubscriptionFeaturesDock items={dockItems} upgradeHref={localizedManageHref} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.8),transparent_60%)] blur-2xl opacity-80" />
      <div className="absolute bottom-0 left-0 h-24 w-24 bg-orange-400/20 rounded-full blur-2xl translate-y-8 -translate-x-8" />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-700 font-semibold">
            <Sparkles className="h-4 w-4 text-slate-600" />
            {t("planInterval", { plan: planLabel, interval: intervalLabel })}
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold backdrop-blur-sm shadow-sm",
              tone === "danger"
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-orange-100 text-orange-800 border border-orange-200",
            )}
          >
            {tone === "danger" ? <AlertTriangle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {tone === "danger" ? t("actionRequired") : t("reminder")}
          </div>
        </div>

        <p className="text-base font-bold leading-relaxed text-slate-900">{message}</p>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {typeof daysLeft === "number" && daysLeft >= 0 && (
            <span className="rounded-full border border-slate-400/40 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-700 shadow-sm backdrop-blur-sm">
              {t("daysLeftBadge", { days: daysLeft })}
            </span>
          )}

          <Link
            href={localizedManageHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-400/40 bg-white/90 px-5 py-1.5 text-sm font-bold backdrop-blur-sm shadow-sm transition-all hover:bg-white hover:shadow-md hover:scale-105"
          >
            {t("manage")}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
