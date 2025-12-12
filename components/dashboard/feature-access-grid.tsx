'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Activity, ArrowRight, CalendarClock, FileSpreadsheet, KeyRound, Lock } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type FeatureAccessItem = {
  id: 'access' | 'presence' | 'classes' | 'reports'
  title: string
  description: string
  href: string          // chemin SANS locale (ex: "/dashboard/presence")
  requiredPlan?: 'PRO' | 'ENTERPRISE'
  available: boolean
  icon: LucideIcon
}

interface FeatureAccessGridProps {
  items: FeatureAccessItem[]
  planLabel?: string
  compact?: boolean
  showActions?: boolean
  upgradeHref?: string   // ex: "/dashboard/settings"
  className?: string
}

export function FeatureAccessGrid({
  items,
  planLabel,
  compact = false,
  showActions = true,
  upgradeHref = '/dashboard/settings',
  className,
}: FeatureAccessGridProps) {
  const locale = useLocale()
  const t = useTranslations('dashboard.featureAccess')
  const isRTL = locale === 'ar'

  // Ajoute la locale devant les chemins (on suppose prefix toujours présent)
  const withLocale = (path: string) => {
    const base = path.startsWith('/') ? path : `/${path}`
    return `/${locale}${base}`
  }

  const activeCount = items.filter((item) => item.available).length
  const columns = compact ? 'sm:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'
  const localizedUpgradeHref = withLocale(upgradeHref)

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn('space-y-3', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="space-y-0.5">
          <p className="font-semibold">{t('modulesTitle')}</p>
          <p className="text-xs text-muted-foreground">
            {t('modulesCount', { active: activeCount, total: items.length })}
            {planLabel ? <> · {t('planLabel', { plan: planLabel })}</> : null}
          </p>
        </div>
        {planLabel ? (
          <Badge variant="outline" className="border-border/60 text-[11px] uppercase tracking-[0.16em]">
            {planLabel}
          </Badge>
        ) : null}
      </div>

      <div className={cn('grid gap-3', columns)}>
        {items.map((item) => {
          const Icon = item.icon
          const isLocked = !item.available
          const localizedHref = withLocale(item.href)

          return (
            <div
              key={item.id}
              className={cn(
                'flex h-full flex-col gap-3 rounded-xl border bg-card/80 p-4 text-sm transition hover:bg-muted/60',
                isLocked ? 'border-dashed border-border/60 opacity-80' : 'border-border/80',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border text-xs',
                      isLocked
                        ? 'border-border/70 text-muted-foreground'
                        : 'border-border/70 bg-muted/60 text-foreground',
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 border-border/60 bg-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]',
                    isLocked ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {isLocked ? t('badges.notIncluded') : t('badges.included')}
                </Badge>
              </div>

              {showActions ? (
                <div className="mt-auto flex items-center gap-2 pt-1 text-xs">
                  {isLocked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg border-border/70 text-foreground hover:bg-muted"
                      asChild
                    >
                      <Link href={localizedUpgradeHref}>
                        <Lock className="mr-2 h-3.5 w-3.5" />
                        {t('actions.upgrade')}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link href={localizedHref}>
                        {t('actions.open')}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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

interface LockedFeatureStateProps {
  title: string
  description: string
  planLabel?: string
  items: FeatureAccessItem[]
  upgradeHref?: string   // sans locale
  faqHref?: string       // sans locale
}

export function LockedFeatureState({
  title,
  description,
  planLabel,
  items,
  upgradeHref = '/dashboard/settings',
  faqHref = '/faqs',
}: LockedFeatureStateProps) {
  const locale = useLocale()
  const t = useTranslations('dashboard.featureAccess')
  const isRTL = locale === 'ar'

  const withLocale = (path: string) => {
    const base = path.startsWith('/') ? path : `/${path}`
    return `/${locale}${base}`
  }

  const localizedUpgradeHref = withLocale(upgradeHref)
  const localizedFaqHref = withLocale(faqHref)

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="space-y-4 rounded-2xl border border-border/70 bg-muted/60 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {planLabel ? (
          <Badge variant="outline" className="border-border/60 text-[11px] uppercase tracking-[0.16em]">
            {t('planLabel', { plan: planLabel })}
          </Badge>
        ) : null}
      </div>

      <FeatureAccessGrid
        items={items}
        planLabel={planLabel}
        compact
        showActions={false}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Button
          asChild
          variant="outline"
          className="h-8 rounded-lg border-border/70 px-3 text-xs text-foreground hover:bg-muted"
        >
          <Link href={localizedUpgradeHref}>{t('actions.upgrade')}</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link href={localizedFaqHref}>{t('actions.seePlans')}</Link>
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
}): FeatureAccessItem[] {
  const { hasAccessControl, hasPresence, hasCourses, hasExcelReports = false } = options

  return [
    {
      id: 'access' as const,
      title: 'Contrôle accès',
      description: 'QR, simulateur et journaux.',
      href: '/dashboard/access-logs',
      requiredPlan: 'PRO' as const,
      available: hasAccessControl,
      icon: KeyRound,
    },
    {
      id: 'presence' as const,
      title: 'Présence',
      description: 'Vue temps réel des visites.',
      href: '/dashboard/presence',
      requiredPlan: 'PRO' as const,
      available: hasPresence,
      icon: Activity,
    },
    {
      id: 'classes' as const,
      title: 'Cours & planning',
      description: 'Agenda, capacités et listes.',
      href: '/dashboard/classes',
      requiredPlan: 'ENTERPRISE' as const,
      available: hasCourses,
      icon: CalendarClock,
    },
    {
      id: 'reports' as const,
      title: 'Exports Excel',
      description: 'Visites et membres en XLSX.',
      href: '/dashboard',
      requiredPlan: 'PRO' as const,
      available: hasExcelReports,
      icon: FileSpreadsheet,
    },
  ]
}
