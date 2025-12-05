'use client'

import Link from 'next/link'
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
import { ACCESS_EVENT_STATUS_LABELS } from '@/lib/access-events'
import { ExternalLink, Trash2 } from 'lucide-react'

const statusColors: Record<AccessEventStatus, string> = {
  GRANTED:
    'border border-emerald-500 bg-emerald-50 text-emerald-800 ' +
    'dark:border-emerald-400 dark:bg-emerald-500/40 dark:text-emerald-50',
  CHECKED_OUT:
    'border border-sky-500 bg-sky-50 text-sky-800 ' +
    'dark:border-sky-400 dark:bg-sky-500/40 dark:text-sky-50',
  ALREADY_CHECKED_IN:
    'border border-amber-500 bg-amber-50 text-amber-800 ' +
    'dark:border-amber-400 dark:bg-amber-500/40 dark:text-amber-50',
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

const sourceLabels: Record<AccessEventSource, string> = {
  QR_SCAN: 'Scan QR',
  SIMULATOR: 'Simulateur',
  MANUAL: 'Marquage manuel',
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

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export type AccessLogRow = {
  id: string
  memberId: string
  status: AccessEventStatus
  source: AccessEventSource
  createdAt: string
  sessionOverdue?: boolean
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
  if (!events.length) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/70 p-8 text-center text-muted-foreground">
        Aucun évènement d&apos;accès pour le moment.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 text-muted-foreground">
            <TableHead>Date</TableHead>
            <TableHead>Membre</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const statusLabel = ACCESS_EVENT_STATUS_LABELS[event.status]
            const sourceLabel = sourceLabels[event.source]
            const memberName = event.member
              ? `${event.member.firstName} ${event.member.lastName}`.trim()
              : 'Membre supprimé'

            return (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  {dateFormatter.format(new Date(event.createdAt))}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{memberName}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.member?.email ?? '—'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {event.member?.gymVariant?.name ?? '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-semibold px-2 py-0.5',
                        statusColors[event.status],
                      )}
                    >
                      {statusLabel}
                    </Badge>
                    {event.sessionOverdue ? (
                      <Badge
                        variant="outline"
                        className="border border-destructive bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
                      >
                        Période dépassée
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5',
                      sourceColors[event.source],
                    )}
                  >
                    {sourceLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {event.member?.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-border/70"
                      >
                        <Link href={`/dashboard/members/${event.member.id}/badge`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Badge
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
                        Supprimer
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
