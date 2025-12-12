'use client'
// (dashboard)/dashboard/settings/page.tsx

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DEFAULT_PLAN_LIMITS, resolvePlanLimitsForTier, type PlanLimitsTable } from '@/lib/subscription-plans'

interface GymData {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  maxSessionMinutes?: number | null
  planLimitPerVariant?: number | null
  planLimitPerNetwork?: number | null
  planLimits?: {
    perVariant: number | null
    perNetwork: number | null
    unlimitedPerVariant: boolean
    unlimitedPerNetwork: boolean
    sources: { perVariant: 'PLAN_DEFAULT' | 'GYM_OVERRIDE'; perNetwork: 'PLAN_DEFAULT' | 'GYM_OVERRIDE' }
  }
}

function ReadonlyField({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/40 px-4 py-3', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-tight text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export default function SettingsPage() {
  const t = useTranslations('dashOwAdGymSettings')
  const { data: session } = useSession()

  const gymKey = useMemo(() => ['gym', session?.user?.gymId ?? 'no-gym'] as const, [session?.user?.gymId])

  const {
    data: gym,
    isLoading,
    isError,
  } = useQuery<GymData>({
    queryKey: gymKey,
    enabled: Boolean(session?.user?.gymId),
    queryFn: async () => {
      const response = await fetch('/api/gym')
      if (!response.ok) throw new Error(t('errors.gymFetch'))
      return response.json()
    },
  })

  const { data: planSettings } = useQuery<{ limits?: PlanLimitsTable }>({
    queryKey: ['plan-settings-public'],
    queryFn: async () => {
      const response = await fetch('/api/plan-settings')
      if (!response.ok) throw new Error(t('errors.planLimitsFetch'))
      return response.json()
    },
  })

  const roleLabels: Record<string, string> = {
    GYM_OWNER: t('roles.GYM_OWNER'),
    GYM_ADMIN: t('roles.GYM_ADMIN'),
  }

  const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined) return t('common.notProvided')
    const text = String(value).trim()
    return text.length ? text : t('common.notProvided')
  }

  const formatPlan = (plan?: string | null) => {
    if (!plan) return t('common.notProvided')
    if (plan === 'BASIC') return t('plans.BASIC')
    if (plan === 'PRO') return t('plans.PRO')
    if (plan === 'ENTERPRISE') return t('plans.ENTERPRISE')
    return plan
  }

  const formatInterval = (interval?: string | null) => {
    if (!interval) return t('common.notProvided')
    return interval === 'ANNUAL' ? t('intervals.ANNUAL') : t('intervals.MONTHLY')
  }

  const currentTier = (session?.user?.subscriptionPlan ?? 'BASIC') as string
  const limitsTable: PlanLimitsTable = planSettings?.limits ?? DEFAULT_PLAN_LIMITS
  const effectiveLimits = useMemo(
    () => (gym?.planLimits ? gym.planLimits : resolvePlanLimitsForTier(currentTier as any, limitsTable)),
    [gym?.planLimits, currentTier, limitsTable]
  )

  const hasOverrides = (gym?.planLimitPerVariant ?? null) !== null || (gym?.planLimitPerNetwork ?? null) !== null

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[360px] rounded-2xl" />
          <Skeleton className="h-[360px] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden border border-border/60 shadow-sm">
        <CardContent className="relative space-y-6 p-6 md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.08),transparent_25%),radial-gradient(circle_at_80%_0%,hsl(var(--muted-foreground)/0.08),transparent_25%)]" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                {t('header.eyebrow')}
              </p>
              <h1 className="text-3xl font-bold leading-tight">{t('header.title')}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">{t('header.description')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full border border-border/60 bg-primary/10 text-primary">
                {roleLabels[session?.user?.role as string] ?? t('header.roleUnknown')}
              </Badge>

              <Badge variant="outline" className="rounded-full border-border/60">
                {t('header.planPill', { plan: formatPlan(session?.user?.subscriptionPlan as any) })}
              </Badge>

              <Badge variant="outline" className="rounded-full border-border/60">
                {formatInterval(session?.user?.billingInterval as any)}
              </Badge>
            </div>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReadonlyField label={t('fields.user')} value={formatValue(session?.user?.name ?? session?.user?.email)} />
            <ReadonlyField label={t('fields.email')} value={formatValue(session?.user?.email)} />
            <ReadonlyField label={t('fields.gym')} value={formatValue(gym?.name ?? session?.user?.gymId)} />
            <ReadonlyField label={t('fields.billing')} value={formatInterval(session?.user?.billingInterval as any)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card className="h-full border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>{t('sections.userProfileTitle')}</CardTitle>
            <CardDescription>{t('sections.userProfileDesc')}</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3 md:grid-cols-2">
            <ReadonlyField label={t('fields.fullName')} value={formatValue(session?.user?.name)} />
            <ReadonlyField label={t('fields.email')} value={formatValue(session?.user?.email)} />
            <ReadonlyField label={t('fields.role')} value={roleLabels[session?.user?.role as string] ?? t('common.notProvided')} />
            <ReadonlyField label={t('fields.plan')} value={formatPlan(session?.user?.subscriptionPlan as any)} />
            <ReadonlyField label={t('fields.billing')} value={formatInterval(session?.user?.billingInterval as any)} />

            <ReadonlyField
              label={t('fields.gymId')}
              value={formatValue(session?.user?.gymId)}
              hint={t('fields.gymIdHint')}
              className="md:col-span-2"
            />
          </CardContent>
        </Card>

        <Card className="h-full border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>{t('sections.gymInfoTitle')}</CardTitle>
            <CardDescription>{t('sections.gymInfoDesc')}</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3 md:grid-cols-2">
            {isError ? (
              <div className="md:col-span-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">{t('errors.gymInfoLoadTitle')}</p>
                  <p className="text-red-800">{t('errors.gymInfoLoadDesc')}</p>
                </div>
              </div>
            ) : null}

            <ReadonlyField label={t('fields.gymName')} value={formatValue(gym?.name)} />
            <ReadonlyField label={t('fields.email')} value={formatValue(gym?.email)} />
            <ReadonlyField label={t('fields.phone')} value={formatValue(gym?.phone)} />
            <ReadonlyField label={t('fields.city')} value={formatValue(gym?.city)} />
            <ReadonlyField label={t('fields.country')} value={formatValue(gym?.country)} />
            <ReadonlyField label={t('fields.address')} value={formatValue(gym?.address)} className="md:col-span-2" />

            <ReadonlyField
              label={t('fields.maxSession')}
              value={
                gym?.maxSessionMinutes
                  ? t('common.minutes', { count: gym.maxSessionMinutes })
                  : formatValue(gym?.maxSessionMinutes)
              }
              className="md:col-span-2"
            />

            <p className="md:col-span-2 text-sm text-muted-foreground">{t('readonlyNote')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>{t('sections.planLimitsTitle')}</CardTitle>
          <CardDescription>{t('sections.planLimitsDesc')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-semibold">{t('limits.currentTitle')}</p>

            <p className="text-sm text-muted-foreground">
              {effectiveLimits?.unlimitedPerVariant
                ? t('limits.unlimitedPerVariant')
                : t('limits.perVariant', { count: effectiveLimits?.perVariant ?? 0 })}
              {' · '}
              {effectiveLimits?.unlimitedPerNetwork
                ? t('limits.unlimitedPerNetwork')
                : t('limits.perNetwork', { count: effectiveLimits?.perNetwork ?? 0 })}
            </p>

            <p className="text-xs text-muted-foreground">
              {hasOverrides ? t('limits.overrideNote') : t('limits.autoNote')}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(['BASIC', 'PRO', 'ENTERPRISE'] as const).map((tier) => {
              const limits = (planSettings?.limits ?? DEFAULT_PLAN_LIMITS)[tier]
              const tierLabel = t(`plans.${tier}`)

              return (
                <div key={tier} className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm">
                  <p className="font-semibold">{tierLabel}</p>

                  <p className="text-xs text-muted-foreground">
                    {limits?.perVariant !== null && limits?.perVariant !== undefined && limits.perVariant >= 0
                      ? t('limits.tierVariant', { count: limits.perVariant })
                      : t('limits.tierUnlimitedVariant')}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {limits?.perNetwork !== null && limits?.perNetwork !== undefined && limits.perNetwork >= 0
                      ? t('limits.tierNetwork', { count: limits.perNetwork })
                      : t('limits.tierUnlimitedNetwork')}
                  </p>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">{t('limits.footer')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
