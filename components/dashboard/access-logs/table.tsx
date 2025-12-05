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
  GRANTED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
  CHECKED_OUT: 'bg-sky-500/15 text-sky-700 dark:text-sky-200',
  ALREADY_CHECKED_IN: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
  DENIED_EXPIRED: 'bg-red-500/15 text-red-700 dark:text-red-200',
  DENIED_INACTIVE: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  DENIED_FORBIDDEN: 'bg-rose-500/15 text-rose-700 dark:text-rose-200',
}

const sourceLabels: Record<AccessEventSource, string> = {
  QR_SCAN: 'Scan QR',
  SIMULATOR: 'Simulateur',
  MANUAL: 'Marquage manuel',
}

const sourceColors: Record<AccessEventSource, string> = {
  QR_SCAN: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200',
  SIMULATOR: 'bg-sky-500/15 text-sky-700 dark:text-sky-200',
  MANUAL: 'bg-slate-500/15 text-slate-700 dark:text-slate-200',
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
        Aucun évènement d'accès pour le moment.
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
                      className={cn('text-xs font-semibold', statusColors[event.status])}
                    >
                      {statusLabel}
                    </Badge>
                    {event.sessionOverdue ? (
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold text-destructive border-destructive/40 bg-destructive/10"
                      >
                        Période dépassée
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs font-semibold', sourceColors[event.source])}
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
