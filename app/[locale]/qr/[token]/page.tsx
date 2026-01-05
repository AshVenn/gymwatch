import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { CalendarClock, Clock3, MapPin, ShieldCheck, Sparkles } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { StaffActions } from "./staff-actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type AppLocale } from "@/i18n/routing"

type QrProfileResponse = {
  context: "staff" | "public"
  features?: {
    accessControl?: boolean
    courses?: boolean
  }
  member: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    variantName: string | null
    gymName: string | null
  }
  subscription: {
    planName: string | null
    planDurationDays: number | null
    startDate: string | Date | null
    endDate: string | Date | null
    status: string
    active: boolean
    daysRemaining: number | null
  }
  visits: {
    visitsToday: number
    visitLimit: number | null
    visitsRemaining: number | null
    limitState: string
    overDailyLimit: boolean
    recent: Array<{
      id: string
      checkIn: string
      checkOut: string | null
      variantName: string | null
    }>
    last30Days: number
  }
  classes: Array<{
    id: string
    title: string
    startAt: string
    endAt: string | null
    coach: string | null
    room: string | null
    variantName: string | null
  }>
}

type QrProfilePageProps = {
  params: Promise<{ locale: AppLocale; token: string }>
}

async function resolveInternalUrl(path: string) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL
  if (envBase) {
    try {
      const url = new URL(path, envBase)
      return url.toString()
    } catch {
      // ignore invalid env base, fall back to headers
    }
  }

  const headersList = await headers()
  const protocol = headersList.get("x-forwarded-proto") ?? "https"
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host")
  if (!host) {
    throw new Error("Missing host to resolve internal URL")
  }

  return new URL(path, `${protocol}://${host}`).toString()
}

async function fetchProfile(token: string, locale: AppLocale): Promise<QrProfileResponse | null> {
  const endpoint = await resolveInternalUrl(`/api/gym-team/qr/verify?token=${encodeURIComponent(token)}`)
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { "accept-language": locale },
  })

  if (!response.ok) {
    if (response.status === 400 || response.status === 404 || response.status === 403) {
      return null
    }
    throw new Error("Unable to load QR profile")
  }

  const payload = (await response.json()) as QrProfileResponse
  return payload
}

function formatDate(value: string | Date | null | undefined, locale: AppLocale) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date)
}

function computeProgress(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  planDurationDays: number | null | undefined,
) {
  if (!startDate || !endDate) return null
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  const totalDays =
    typeof planDurationDays === "number" && planDurationDays > 0
      ? planDurationDays
      : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000))

  if (totalDays <= 0) return null

  const elapsed = Math.max(0, Math.round((Date.now() - start.getTime()) / 86_400_000))
  return Math.max(0, Math.min(100, Math.round((elapsed / totalDays) * 100)))
}

export async function generateMetadata({ params }: QrProfilePageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "qrProfile" })

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  }
}

export default async function QrProfilePage({ params }: QrProfilePageProps) {
  const { locale, token } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "qrProfile" })

  const profile = await fetchProfile(token, locale)
  if (!profile) {
    notFound()
  }

  const subscriptionProgress = computeProgress(
    profile.subscription.startDate,
    profile.subscription.endDate,
    profile.subscription.planDurationDays,
  )
  const daysRemaining =
    typeof profile.subscription.daysRemaining === "number"
      ? Math.max(profile.subscription.daysRemaining, 0)
      : null
  const progressIsFull = subscriptionProgress !== null && subscriptionProgress >= 100
  const progressBarClass = progressIsFull ? "bg-destructive" : "bg-primary"
  const daysRemainingClass = daysRemaining === 0 ? "text-destructive" : "text-primary"
  const endLabel = formatDate(profile.subscription.endDate, locale)
  const startLabel = formatDate(profile.subscription.startDate, locale)

  const visitLimit =
    typeof profile.visits.visitLimit === "number" && profile.visits.visitLimit > 0
      ? profile.visits.visitLimit
      : null
  const visitsRemaining =
    typeof profile.visits.visitsRemaining === "number" ? Math.max(profile.visits.visitsRemaining, 0) : null
  const recentVisits = profile.visits.recent ?? []
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-primary/10 via-primary/5 to-background p-6 shadow-lg">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_50%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_45%)]" />
          <div className="relative flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              <Sparkles className="h-4 w-4" />
              {t("hero.badge")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.member.firstName} {profile.member.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">{t("hero.subtitle")}</p>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {profile.member.gymName ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3 py-1">
                  <ShieldCheck className="h-4 w-4" />
                  {profile.member.gymName}
                </span>
              ) : null}
              {profile.member.variantName ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3 py-1">
                  <MapPin className="h-4 w-4" />
                  {profile.member.variantName}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {profile.context === "staff" ? (
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("actions.staffTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("actions.description")}</p>
              <StaffActions token={token} canCheck={Boolean(profile.features?.accessControl)} />
              {!profile.features?.accessControl ? (
                <p className="text-xs text-amber-600">{t("actions.disabled")}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{t("subscription.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {profile.subscription.planName ? profile.subscription.planName : t("subscription.noPlan")}
                </p>
              </div>
              <Badge variant={profile.subscription.active ? "success" : "destructive"} className="uppercase tracking-[0.18em]">
                {t(`subscription.status.${profile.subscription.status as "ACTIVE" | "EXPIRES_TODAY" | "EXPIRED"}`)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                {startLabel ? t("subscription.period", { start: startLabel, end: endLabel ?? "?" }) : t("subscription.missing")}
              </div>
              {subscriptionProgress !== null ? (
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${progressBarClass} transition-all`}
                      style={{ width: `${subscriptionProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("subscription.progress")}</span>
                    <span>{subscriptionProgress}%</span>
                  </div>
                </div>
              ) : null}
              {daysRemaining !== null ? (
                <p className={`text-xs ${daysRemainingClass}`}>
                  {t("subscription.daysRemaining", { count: daysRemaining })}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("visits.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">{t("visits.today")}</span>
                <span className="font-semibold">{profile.visits.visitsToday}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">{t("visits.limitLabel")}</span>
                <span className="font-semibold">
                  {visitLimit ? visitLimit : t("visits.unlimited")}
                </span>
              </div>
              {visitsRemaining !== null ? (
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">{t("visits.remaining")}</span>
                  <span className="font-semibold">{visitsRemaining}</span>
                </div>
              ) : null}
              {profile.visits.overDailyLimit ? (
                <p className="text-xs text-amber-600">{t("visits.limitReached")}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("history.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("history.subtitle")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">{t("history.last30Days")}</span>
                <Badge variant="secondary" className="rounded-full">
                  {profile.visits.last30Days ?? 0}
                </Badge>
              </div>

              {profile.context === "staff" ? (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                  <p className="font-semibold">{t("history.details")}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>{t("history.email")}</span>
                      <span className="font-medium text-foreground">
                        {profile.member.email ?? t("history.unknown")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>{t("history.phone")}</span>
                      <span className="font-medium text-foreground">
                        {profile.member.phone ?? t("history.unknown")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {t("history.staffOnly")}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("history.recentVisits")}</p>
                {recentVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
                ) : (
                  <div className="space-y-2">
                    {recentVisits.map((visit) => {
                      const checkInDate = new Date(visit.checkIn)
                      const dateLabel = formatDate(visit.checkIn, locale)
                      return (
                        <div
                          key={visit.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-card/70 px-3 py-2 text-sm"
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold">{dateLabel ?? t("history.unknown")}</p>
                            <p className="text-xs text-muted-foreground">
                              {timeFormatter.format(checkInDate)}
                              {visit.variantName ? ` · ${visit.variantName}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[11px]">
                            {visit.checkOut ? t("history.checkedOut") : t("history.checkedIn")}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("classes.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("classes.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.context !== "staff" ? (
              <p className="text-sm text-muted-foreground">{t("classes.staffOnly")}</p>
            ) : profile.classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("classes.empty")}</p>
            ) : (
              profile.classes.map((session) => {
                const startDate = formatDate(session.startAt, locale)
                const startTime = new Date(session.startAt)
                const endTime = session.endAt ? new Date(session.endAt) : null
                const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" })
                return (
                  <div
                    key={session.id}
                    className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{session.title}</span>
                      </div>
                      {session.variantName ? (
                        <Badge variant="outline" className="border-border/60 text-[11px] uppercase tracking-[0.16em]">
                          {session.variantName}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {startDate ? <span>{startDate}</span> : null}
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {timeFormatter.format(startTime)}
                        {endTime ? ` - ${timeFormatter.format(endTime)}` : null}
                      </span>
                      {session.coach ? <span>{session.coach}</span> : null}
                      {session.room ? <span>{session.room}</span> : null}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
