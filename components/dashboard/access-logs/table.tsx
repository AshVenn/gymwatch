'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { AccessEventSource, AccessEventStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ExternalLink, Trash2 } from 'lucide-react'

const statusColors: Record<AccessEventStatus, string> = {
  GRANTED:
    'border border-emerald-500 bg-emerald-50 text-emerald-800 ' +
    'dark:border-emerald-400 dark:bg-emerald-500/40 dark:text-emerald-50',
  CHECKED_OUT:
    'border border-sky-500 bg-sky-50 text-sky-800 ' +
    'dark:border-sky-400 dark:bg-sky-500/40 dark:text-sky-50',
  SESSION_OVERSTAY:
    'border border-red-500 bg-red-50 text-red-800 ' +
    'dark:border-red-400 dark:bg-red-500/40 dark:text-red-50',
  ALREADY_CHECKED_IN:
    'border border-amber-500 bg-amber-50 text-amber-800 ' +
    'dark:border-amber-400 dark:bg-amber-500/40 dark:text-amber-50',
  DENIED_DAILY_LIMIT:
    'border border-purple-500 bg-purple-50 text-purple-800 ' +
    'dark:border-purple-400 dark:bg-purple-500/40 dark:text-purple-50',
  DENIED_EXPIRED:
    'border border-red-500 bg-red-50 text-red-800 ' +
    'dark:border-red-400 dark:bg-red-500/40 dark:text-red-50',
  DENIED_INACTIVE:
    'border border-orange-500 bg-orange-50 text-orange-800 ' +
    'dark:border-orange-400 dark:bg-orange-500/40 dark:text-orange-50',
  DENIED_FORBIDDEN:
    'border border-rose-500 bg-rose-50 text-rose-800 ' +
    'dark:border-rose-400 dark:bg-rose-500/40 dark:text-rose-50',
}

const sourceColors: Record<AccessEventSource, string> = {
  QR_SCAN:
    'border border-indigo-500 bg-indigo-50 text-indigo-800 ' +
    'dark:border-indigo-400 dark:bg-indigo-500/40 dark:text-indigo-50',
  SIMULATOR:
    'border border-sky-500 bg-sky-50 text-sky-800 ' +
    'dark:border-sky-400 dark:bg-sky-500/40 dark:text-sky-50',
  MANUAL:
    'border border-slate-500 bg-slate-50 text-slate-800 ' +
    'dark:border-slate-400 dark:bg-slate-500/40 dark:text-slate-50',
}

export type AccessLogRow = {
  id: string
  memberId: string
  status: AccessEventStatus
  source: AccessEventSource
  createdAt: string
  sessionOverdue?: boolean
  sessionLimitMinutes?: number | null
  sessionDurationMinutes?: number | null
  member?: {
    id: string
    firstName: string
    lastName: string
    email?: string | null
    gymVariant?: { id: string; name: string; slug: string } | null
  } | null
}

interface AccessLogTableProps {
  events: AccessLogRow[]
  onDelete?: (id: string) => void
  deletingId?: string | null
}

export function AccessLogTable({ events, onDelete, deletingId }: AccessLogTableProps) {
  const t = useTranslations('dashboard.accessLogs.table')
  const locale = useLocale()
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale === 'ar' ? 'ar' : 'fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  )

  const statusLabels = useMemo(
    () => ({
      GRANTED: t('status.granted'),
      CHECKED_OUT: t('status.checkedOut'),
      SESSION_OVERSTAY: t('status.sessionOverstay'),
      ALREADY_CHECKED_IN: t('status.alreadyCheckedIn'),
      DENIED_DAILY_LIMIT: t('status.deniedDailyLimit'),
      DENIED_EXPIRED: t('status.deniedExpired'),
      DENIED_INACTIVE: t('status.deniedInactive'),
      DENIED_FORBIDDEN: t('status.deniedForbidden'),
    }),
    [t],
  )

  const sourceLabels = useMemo(
    () => ({
      QR_SCAN: t('source.qr'),
      SIMULATOR: t('source.simulator'),
      MANUAL: t('source.manual'),
    }),
    [t],
  )

  if (!events.length) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/70 p-8 text-center text-muted-foreground">
        {t('empty')}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 text-muted-foreground">
            <TableHead>{t('columns.date')}</TableHead>
            <TableHead>{t('columns.member')}</TableHead>
            <TableHead>{t('columns.variant')}</TableHead>
            <TableHead>{t('columns.status')}</TableHead>
            <TableHead>{t('columns.source')}</TableHead>
            <TableHead>{t('columns.limit')}</TableHead>
            <TableHead>{t('columns.duration')}</TableHead>
            <TableHead className="text-right">{t('columns.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const statusLabel = statusLabels[event.status]
            const sourceLabel = sourceLabels[event.source]
            const memberName = event.member
              ? `${event.member.firstName} ${event.member.lastName}`.trim()
              : t('deletedMember')
            const flagged =
              event.sessionOverdue ||
              event.status === AccessEventStatus.SESSION_OVERSTAY ||
              event.status === AccessEventStatus.DENIED_DAILY_LIMIT ||
              event.status === AccessEventStatus.DENIED_FORBIDDEN ||
              event.status === AccessEventStatus.DENIED_EXPIRED ||
              event.status === AccessEventStatus.DENIED_INACTIVE
            const limitLabel =
              typeof event.sessionLimitMinutes === 'number' ? `${event.sessionLimitMinutes} min` : 'N/A'
            const durationLabel =
              typeof event.sessionDurationMinutes === 'number' ? `${event.sessionDurationMinutes} min` : '-'
            const durationOver =
              typeof event.sessionLimitMinutes === 'number' &&
              typeof event.sessionDurationMinutes === 'number' &&
              event.sessionDurationMinutes > event.sessionLimitMinutes

            return (
              <TableRow key={event.id} className={cn(flagged ? 'bg-destructive/5' : undefined)}>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  {dateFormatter.format(new Date(event.createdAt))}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{memberName}</span>
                    <span className="text-xs text-muted-foreground">{event.member?.email ?? 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {event.member?.gymVariant?.name ?? 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-semibold px-2 py-0.5', statusColors[event.status])}
                    >
                      {statusLabel}
                    </Badge>
                    {event.sessionOverdue ? (
                      <Badge
                        variant="outline"
                        className="border border-destructive bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
                      >
                        {t('overdue')}
                      </Badge>
                    ) : null}
                    {[AccessEventStatus.DENIED_DAILY_LIMIT, AccessEventStatus.SESSION_OVERSTAY].includes(
                      event.status,
                    ) ? (
                      <Badge
                        variant="outline"
                        className="border border-destructive/60 bg-destructive/5 px-2 py-0.5 text-[11px] font-semibold text-destructive"
                      >
                        {t('limitAlert')}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-xs font-semibold px-2 py-0.5', sourceColors[event.source])}
                  >
                    {sourceLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{limitLabel}</TableCell>
                <TableCell className={cn('text-xs text-muted-foreground', durationOver && 'text-destructive font-semibold')}>
                  {durationLabel}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {event.member?.id ? (
                      <Button variant="outline" size="sm" asChild className="border-border/70">
                        <Link href={`/dashboard/members/${event.member.id}/badge`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {t('badge')}
                        </Link>
                      </Button>
                    ) : null}
                    {onDelete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={deletingId === event.id}
                        onClick={() => onDelete(event.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {t('delete')}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
