"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertTriangle,
  CalendarClock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Activity,
  GlassesIcon as ClassesIcon,
  FileSpreadsheet,
  KeyRound,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { SubscriptionFeaturesDock, type SubscriptionDockItem } from "@/components/dashboard/subscription-features-dock"
import { getPlanFeatures } from "@/lib/subscription-plans"

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
  const currentPlan = session?.user?.subscriptionPlan ?? "BASIC"

  const planLabel = t(`plan.${planKey}`)
  const intervalLabel = t(`interval.${intervalKey}`)

  const withLocale = (path: string) => {
    const base = path.startsWith("/") ? path : `/${path}`
    return `/${locale}${base}`
  }

  const baseFeatures = getPlanFeatures((session?.user as any)?.subscriptionPlan ?? currentPlan)
  const hasAccessControl = Boolean((session?.user as any)?.hasAccessControl ?? baseFeatures.accessControl)
  const hasPresence = Boolean((session?.user as any)?.hasPresence ?? baseFeatures.presenceTracking)
  const hasCourses = Boolean((session?.user as any)?.hasCourses ?? baseFeatures.courses)
  const hasExcelReports = Boolean((session?.user as any)?.hasExcelReports ?? baseFeatures.excelReports)

  const allDockItems: SubscriptionDockItem[] = [
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

  const dockItems = allDockItems.filter((item) => {
    if (currentPlan === "BASIC") return item.requiredPlan === "PRO" || item.requiredPlan === "ENTERPRISE"
    if (currentPlan === "PRO") return item.requiredPlan === "PRO" || item.requiredPlan === "ENTERPRISE"
    if (currentPlan === "ENTERPRISE") return true
    return true
  })

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

  const planTheme = useMemo(() => {
    if (planKey === "enterprise") {
      return {
        wrap: "border border-primary/25 bg-gradient-to-br from-primary via-indigo-600 to-sky-600",
        overlay: "bg-gradient-to-tr from-white/8 via-transparent to-white/8",
      }
    }

    if (planKey === "pro") {
      return {
        wrap: "border border-primary/25 bg-gradient-to-br from-pink-500 via-primary to-primary",
        overlay: "bg-gradient-to-tr from-white/8 via-transparent to-white/8",
      }
    }

    return {
      wrap: "border border-primary/25 bg-gradient-to-br from-emerald-500 via-primary to-primary",
      overlay: "bg-gradient-to-tr from-white/8 via-transparent to-white/8",
    }
  }, [planKey])

  // Normal banner
  if (!message || !tone) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className={cn(
          "group relative overflow-hidden rounded-3xl p-5 md:p-6 shadow-lg transition-all duration-250 hover:shadow-xl active:scale-[0.995] backdrop-blur-2xl bg-white/10 ring-1 ring-white/20",
          planTheme.wrap,
        )}
      >
        <SubscriptionFeaturesDock items={dockItems} currentPlan={currentPlan} upgradeHref={localizedManageHref} />

        <div className={cn("pointer-events-none absolute inset-0", planTheme.overlay)} />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-white/5 blur-3xl" />

        <div className="relative flex flex-col gap-3 text-white">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/90 font-semibold">
            <Sparkles className="h-4 w-4" />
            {t("brandLine", { plan: planLabel, demoSuffix })}
          </div>

          <p className="text-[17px] md:text-lg font-semibold tracking-tight text-white">
            {t("planInterval", { plan: planLabel, interval: intervalLabel })}
          </p>

          <p className="text-[15px] text-white/90 leading-relaxed">
            {isDemo && demoEndsAtRaw
              ? t("demoActiveUntil", { date: formatDate(new Date(demoEndsAtRaw)) })
              : t("thanks")}
          </p>

          <Link
            href={localizedManageHref}
            className="mt-2 inline-flex items-center gap-2 text-[15px] font-semibold text-white hover:text-white/90 transition-all group-hover:gap-3 active:scale-95"
          >
            {t("manage")}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  // Warning/Expired banner
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={cn(
        "relative overflow-hidden rounded-3xl p-5 md:p-6 text-slate-900 shadow-lg transition-all duration-250 hover:shadow-xl backdrop-blur-2xl bg-white/60 ring-1 ring-white/40",
        tone === "danger"
          ? "bg-linear-to-br from-rose-50 via-red-100 to-orange-100"
          : "bg-linear-to-br from-amber-100 via-orange-200 to-rose-100",
      )}
    >
      <SubscriptionFeaturesDock items={dockItems} currentPlan={currentPlan} upgradeHref={localizedManageHref} />

      <div className="absolute inset-0 bg-linear-to-tr from-white/45 via-transparent to-white/45" />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-700 font-semibold">
            <Sparkles className="h-4 w-4 text-slate-600" />
            {t("planInterval", { plan: planLabel, interval: intervalLabel })}
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 md:px-4 py-1.5 text-[13px] font-semibold backdrop-blur-sm shadow-sm",
              tone === "danger"
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-orange-500 text-white border border-orange-400/70",
            )}
          >
            {tone === "danger" ? <AlertTriangle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {tone === "danger" ? t("actionRequired") : t("reminder")}
          </div>
        </div>

        <p className="text-[15px] md:text-[17px] font-semibold leading-relaxed text-slate-900">{message}</p>

        <div className="flex flex-wrap items-center gap-2">
          {typeof daysLeft === "number" && daysLeft >= 0 && (
            <span className="rounded-full border border-slate-400/40 bg-white/80 px-3 md:px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm backdrop-blur-sm">
              {t("daysLeftBadge", { days: daysLeft })}
            </span>
          )}

          <Link
            href={localizedManageHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-400/40 bg-white/90 px-4 md:px-5 py-1.5 text-[15px] font-semibold backdrop-blur-sm shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95"
          >
            {t("manage")}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
