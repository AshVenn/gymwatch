'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Activity, ArrowRight, CalendarClock, FileSpreadsheet, KeyRound, Lock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type FeatureAccessItem = {
  id: 'access' | 'presence' | 'classes' | 'reports'
  title: string
  description: string
  href: string
  requiredPlan?: 'PRO' | 'COMPLEX'
  available: boolean
  icon: LucideIcon
}

interface FeatureAccessGridProps {
  items: FeatureAccessItem[]
  planLabel?: string
  compact?: boolean
  showActions?: boolean
  upgradeHref?: string
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
  const activeCount = items.filter((item) => item.available).length
  const columns = compact ? 'sm:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="space-y-0.5">
          <p className="font-semibold">Modules essentiels</p>
          <p className="text-muted-foreground">
            Plan {planLabel ?? 'GymWatch'} · {activeCount}/{items.length} actifs
          </p>
        </div>
        {planLabel ? (
          <Badge variant="outline" className="border-border/60 text-foreground">
            Plan {planLabel}
          </Badge>
        ) : null}
      </div>

      <div className={cn('grid gap-3', columns)}>
        {items.map((item) => {
          const Icon = item.icon
          const isLocked = !item.available

          return (
            <div
              key={item.id}
              className={cn(
                'relative flex h-full flex-col gap-2 rounded-xl border p-4 transition-colors',
                isLocked
                  ? 'border-dashed border-amber-200 bg-amber-50/60 text-amber-900'
                  : 'border-emerald-100 bg-emerald-50/70 text-emerald-900',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border text-sm',
                      isLocked
                        ? 'border-amber-200 bg-white/70 text-amber-800'
                        : 'border-emerald-200 bg-white/80 text-emerald-700',
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 text-[11px] font-semibold uppercase tracking-wide',
                    isLocked ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-800',
                  )}
                >
                  {isLocked ? item.requiredPlan ? `Plan ${item.requiredPlan}` : 'Upgrade' : 'Inclus'}
                </Badge>
              </div>

              {showActions ? (
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {isLocked ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-300 text-amber-900 hover:bg-amber-100"
                        asChild
                      >
                        <Link href={upgradeHref}>
                          <Lock className="mr-2 h-4 w-4" />
                          Debloquer
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-amber-900" asChild>
                        <Link href="/faqs">Comparer les plans</Link>
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" asChild>
                      <Link href={item.href}>
                        Ouvrir
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
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
  upgradeHref?: string
  faqHref?: string
}

export function LockedFeatureState({
  title,
  description,
  planLabel,
  items,
  upgradeHref = '/dashboard/settings',
  faqHref = '/faqs',
}: LockedFeatureStateProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-amber-300/70 bg-amber-50 p-5 text-amber-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-amber-800">{description}</p>
        </div>
        {planLabel ? (
          <Badge variant="outline" className="border-amber-300 text-amber-900">
            Plan {planLabel}
          </Badge>
        ) : null}
      </div>

      <FeatureAccessGrid items={items} planLabel={planLabel} compact showActions={false} />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
          <Link href={upgradeHref}>Mettre a niveau</Link>
        </Button>
        <Button asChild variant="ghost" className="text-amber-900 hover:text-amber-800">
          <Link href={faqHref}>Voir le detail des plans</Link>
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
      title: 'Controle acces',
      description: 'Scans QR, simulateur et journaux detailes.',
      href: '/dashboard/access-logs',
      requiredPlan: 'PRO' as const,
      available: hasAccessControl,
      icon: KeyRound,
    },
    {
      id: 'presence' as const,
      title: 'Presence temps reel',
      description: 'Courbes de frequentation et visites marquees.',
      href: '/dashboard/presence',
      requiredPlan: 'PRO' as const,
      available: hasPresence,
      icon: Activity,
    },
    {
      id: 'classes' as const,
      title: 'Cours et planning',
      description: 'Agenda hebdo, capacites et listes dattente.',
      href: '/dashboard/classes',
      requiredPlan: 'COMPLEX' as const,
      available: hasCourses,
      icon: CalendarClock,
    },
    {
      id: 'reports' as const,
      title: 'Exports Excel',
      description: 'Revenus, top membres et visites au format XLSX.',
      href: '/dashboard',
      requiredPlan: 'PRO' as const,
      available: hasExcelReports,
      icon: FileSpreadsheet,
    },
  ]
}
