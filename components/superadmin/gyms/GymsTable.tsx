'use client'

import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import {
  BarChart3,
  ClipboardList,
  FileCog,
  PenSquare,
  User2,
  Trash2,
  Users,
} from 'lucide-react'
import type { SuperAdminGym } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaginationControls } from '@/components/dashboard/pagination-controls'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Permissions } from '@/lib/rbac/permissions'
import { hasPermission } from '@/lib/rbac/policies'
import { PlanModuleBadges } from './PlanModules'
import { getPlanFeatures } from '@/lib/subscription-plans'

export type GymAction =
  | 'overview'
  | 'members'
  | 'team'
  | 'plans'
  | 'subscription'
  | 'edit'
  | 'delete'

type Props = {
  gyms: SuperAdminGym[]
  isLoading: boolean
  pagination: {
    page: number
    pageCount: number
    pageSize: number
    setPage: (page: number) => void
  }
  totalItems: number
  onAction: (gymId: string, action: GymAction) => void
}

const STATUS_KEY: Record<string, 'active' | 'suspended' | 'expired'> = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
}

const STATUS_STYLES: Record<'active' | 'suspended' | 'expired', string> = {
  active: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-50 dark:border-emerald-400/60',
  suspended: 'border-amber-500/60 bg-amber-500/10 text-amber-900 dark:text-amber-50 dark:border-amber-400/60',
  expired: 'border-rose-500/60 bg-rose-500/10 text-rose-900 dark:text-rose-50 dark:border-rose-400/60',
}

const PLAN_KEY: Record<string, 'basic' | 'pro' | 'enterprise'> = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
}

const INTERVAL_KEY: Record<string, 'monthly' | 'annual'> = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
}

export function GymsTable({
  gyms,
  isLoading,
  pagination,
  totalItems,
  onAction,
}: Props) {
  const t = useTranslations('superAdminGymsTable')
  const { data: session } = useSession()
  const canViewFinancials = hasPermission(session?.user?.role as any, Permissions.PlatformAnalyticsRevenue)

  const ROW_ACTIONS: Array<{
    type: GymAction
    icon: React.ComponentType<{ size?: number }>
    label: string
    tone?: 'destructive'
    permission?: string
  }> = [
    { type: 'overview', icon: BarChart3, label: t('actions.overview') },
    { type: 'members', icon: User2, label: t('actions.members') },
    { type: 'team', icon: Users, label: t('actions.team') },
    { type: 'plans', icon: ClipboardList, label: t('actions.plans') },
    { type: 'subscription', icon: FileCog, label: t('actions.subscription') },
    { type: 'edit', icon: PenSquare, label: t('actions.edit') },
    {
      type: 'delete',
      icon: Trash2,
      label: t('actions.delete'),
      tone: 'destructive',
      permission: Permissions.PlatformGymsDelete,
    },
  ]

  const allowedActions = ROW_ACTIONS.filter((action) =>
    action.permission ? hasPermission(session?.user?.role as any, action.permission as any) : true,
  )

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between pb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!gyms.length) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        {t('empty')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.name')}</TableHead>
            <TableHead>{t('columns.status')}</TableHead>
            <TableHead>{t('columns.members')}</TableHead>
            <TableHead>{t('columns.subscriptions')}</TableHead>
            <TableHead>{t('columns.expiration')}</TableHead>
            <TableHead className="text-right">{t('columns.actions')}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {gyms.map((gym) => {
            const variantTotal = gym.variantCount ?? gym.variants?.length ?? 0
            const planFeatures =
              gym.planFeatures ?? getPlanFeatures(gym.subscriptionPlan)

            const statusKey = STATUS_KEY[gym.subscriptionStatus] ?? 'active'
            const planKey = PLAN_KEY[gym.subscriptionPlan] ?? 'basic'
            const intervalKey = INTERVAL_KEY[gym.billingInterval] ?? 'monthly'

            return (
              <TableRow key={gym.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    {gym.name}
                    {gym.isDemo ? (
                      <Badge
                        variant="outline"
                        className="border-primary/60 text-primary"
                      >
                        {t('demoBadge')}
                      </Badge>
                    ) : null}
                  </div>
                    <p className="text-xs text-muted-foreground">{gym.email ?? "-"}</p>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={cn('text-xs font-semibold', STATUS_STYLES[statusKey])}>
                    {t(`status.${statusKey}`)}
                  </Badge>

                  <p className="text-xs text-muted-foreground">
                    {gym.isDemo ? (
                      <span className="font-semibold text-primary">
                        {t('demoPrefix')}{' '}
                      </span>
                    ) : null}
                    {t('planLine', {
                      plan: t(`plan.${planKey}`),
                      interval: t(`interval.${intervalKey}`),
                      price:
                        canViewFinancials && typeof gym.subscriptionPrice === 'number'
                          ? gym.subscriptionPrice.toLocaleString('fr-MA', {
                              style: 'currency',
                              currency: 'MAD',
                            })
                          : t('priceHidden'),
                    })}
                  </p>
                  {gym.subscriptionStatus === 'SUSPENDED' && gym.freezeReason ? (
                    <p className="text-xs text-amber-600 dark:text-amber-200">
                      {t('suspensionReason', { reason: gym.freezeReason })}
                    </p>
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    {t(
                      gym.variantMode === 'MULTI'
                        ? 'variantMode.multi'
                        : 'variantMode.single',
                    )}{' '}
                    - {t('variantCount', { count: variantTotal })}
                  </p>

                  {gym.variants?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {gym.variants.slice(0, 3).map((variant) => (
                        <Badge
                          key={variant.id}
                          variant={variant.isDefault ? 'secondary' : 'outline'}
                          className="text-[11px]"
                        >
                          {variant.name}
                          {variant.isDefault ? ` (${t('default')})` : ''}
                        </Badge>
                      ))}

                      {(gym.variantCount ?? 0) >
                        (gym.variants?.length ?? 0) && (
                        <Badge variant="outline" className="text-[11px]">
                          +
                          {(gym.variantCount ?? 0) -
                            (gym.variants?.length ?? 0)}{' '}
                          {t('others')}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('singleVariant')}
                    </p>
                  )}

                  <PlanModuleBadges features={planFeatures} />
                </TableCell>

                <TableCell>{gym.memberCount}</TableCell>
                <TableCell>{gym.activeSubscriptions}</TableCell>

                <TableCell>
                  <p>
                    {gym.subscriptionExpiresAt
                      ? new Date(gym.subscriptionExpiresAt).toLocaleDateString(
                          'fr-FR',
                        )
                      : t('none')}
                  </p>

                  {gym.isDemo && gym.demoEndsAt ? (
                    <p className="text-xs text-primary">
                      {t('demoUntil', {
                        date: new Date(gym.demoEndsAt).toLocaleDateString('fr-FR'),
                      })}
                    </p>
                  ) : null}

                  {typeof gym.daysRemaining === 'number' && (
                    <p className="text-xs text-muted-foreground">
                      {gym.daysRemaining > 0
                        ? t('daysRemaining', { count: gym.daysRemaining })
                        : t('expired')}
                    </p>
                  )}
                </TableCell>

                <TableCell>
                  <TooltipProvider>
                    <div className="flex justify-end gap-1">
                      {allowedActions.map(({ type, icon: Icon, label, tone }) => (
                        <Tooltip key={type}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'h-8 w-8',
                                tone === 'destructive' &&
                                  'text-destructive hover:text-destructive focus-visible:text-destructive',
                              )}
                              onClick={() => onAction(gym.id, type)}
                              aria-label={label}
                            >
                              <Icon size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="border-t border-border/70 px-4 py-4">
        {gyms.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{t('totalGyms', { count: totalItems })}</span>
            <span className="text-xs uppercase tracking-[0.3em]">
              {t('page', { page: pagination.page, pageCount: pagination.pageCount })}
            </span>
          </div>
        )}

        <PaginationControls
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          totalItems={totalItems}
        />
      </div>
    </div>
  )
}
