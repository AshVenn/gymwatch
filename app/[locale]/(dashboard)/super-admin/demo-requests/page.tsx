'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, MapPin, Phone, CheckCircle2, XCircle, Info } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import {
  useDemoRequests,
  useUpdateDemoRequestStatus,
  type DemoRequest,
  type DemoRequestStatus,
} from '../hooks'

import { ApproveDemoDialog } from '@/components/superadmin/demo-requests/ApproveDemoDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import { Skeleton } from '@/components/ui/skeleton'

const statusTone: Record<DemoRequestStatus, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  RESOLVED: 'default',
  REFUSED: 'destructive',
}

function safeDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export default function DemoRequestsPage() {
  const t = useTranslations('superAdminDemoRequestsPage')
  const locale = useLocale()

  const [statusFilter, setStatusFilter] = useState<DemoRequestStatus | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<DemoRequest | null>(null)
  const [approvalTarget, setApprovalTarget] = useState<DemoRequest | null>(null)

  const { data: requests = [], isLoading, isError } = useDemoRequests(statusFilter)
  const updateStatus = useUpdateDemoRequestStatus()

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [locale],
  )

  const formatDate = (value?: string | null) => {
    const d = safeDate(value)
    return d ? dateFormatter.format(d) : '-'
  }

  useEffect(() => {
    if (!selected) return
    const freshVersion = requests.find((req) => req.id === selected.id)
    if (!freshVersion) return

    const selectedResolved = selected.status === 'RESOLVED' || Boolean(selected.createdGymId)
    const freshResolved = freshVersion.status === 'RESOLVED' || Boolean(freshVersion.createdGymId)

    // évite de “dégrader” la vue (cas rare)
    if (selectedResolved && !freshResolved) return

    if (
      freshVersion.status !== selected.status ||
      freshVersion.createdGymId !== selected.createdGymId ||
      freshVersion.resolvedAt !== selected.resolvedAt
    ) {
      setSelected(freshVersion)
    }
  }, [requests, selected])

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return (requests ?? []).filter((req) => {
      if (!normalizedSearch) return true
      return (
        req.gymName.toLowerCase().includes(normalizedSearch) ||
        req.gymEmail.toLowerCase().includes(normalizedSearch) ||
        req.adminEmail.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [requests, searchTerm])

  const pagination = usePagination(filteredRequests, 8)

  const statusCounters = useMemo(() => {
    return (requests ?? []).reduce(
      (acc, req) => {
        acc.ALL += 1
        acc[req.status] = (acc[req.status] ?? 0) + 1
        return acc
      },
      { ALL: 0, PENDING: 0, RESOLVED: 0, REFUSED: 0 } as Record<DemoRequestStatus | 'ALL', number>,
    )
  }, [requests])

  const handleStatusChange = (req: DemoRequest, status: DemoRequestStatus) => {
    updateStatus.mutate({ requestId: req.id, status })
    setSelected((current) => (current?.id === req.id ? { ...current, status } : current))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* STATUS CARDS */}
      <Card className="border border-border/70">
        <CardContent className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-border/70 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-16" />
                </div>
              ))
            : (['ALL', 'PENDING', 'RESOLVED', 'REFUSED'] as (DemoRequestStatus | 'ALL')[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    statusFilter === status
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/70 hover:border-primary/50'
                  }`}
                >
                  <p className="text-sm text-muted-foreground">{t(`filters.${status}`)}</p>
                  <p className="text-2xl font-semibold text-foreground">{statusCounters[status] ?? 0}</p>
                </button>
              ))}
        </CardContent>
      </Card>

      {/* SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {t('resultsCount', { count: filteredRequests.length })}
        </span>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-muted-foreground">
              <TableHead>{t('table.gym')}</TableHead>
              <TableHead>{t('table.adminContact')}</TableHead>
              <TableHead>{t('table.plan')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.requested')}</TableHead>
              <TableHead>{t('table.resolution')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="border-border/60">
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="mt-2 h-3 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : pagination.data.length ? (
              pagination.data.map((req) => {
                const demoAlreadyCreated = req.status === 'RESOLVED' || Boolean(req.createdGymId)

                return (
                  <TableRow key={req.id} className="border-border/60">
                    <TableCell className="font-semibold">
                      <div>{req.gymName}</div>
                      <div className="text-xs text-muted-foreground">{req.gymEmail}</div>
                    </TableCell>

                    <TableCell>
                      <div>{req.adminEmail}</div>
                      <div className="text-xs text-muted-foreground">
                        {(req.adminFirstName || req.adminLastName) &&
                          `${req.adminFirstName ?? ''} ${req.adminLastName ?? ''}`}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">{req.plan}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusTone[req.status] as any}>{t(`status.${req.status}`)}</Badge>
                    </TableCell>

                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>{formatDate(req.resolvedAt)}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setSelected(req)}>
                        {t('actions.view')}
                      </Button>
                      <Button size="sm" onClick={() => setApprovalTarget(req)} disabled={demoAlreadyCreated}>
                        {t('actions.createDemo')}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {isError ? t('errors.load') : t('empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="border-t border-border/60 px-4 py-4">
          <PaginationControls
            page={pagination.page}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            totalItems={filteredRequests.length}
          />
        </div>
      </div>

      {/* DETAILS DIALOG */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('details.title')}</DialogTitle>
          </DialogHeader>

          {selected && (() => {
            // ✅ IMPORTANT: évite TS2367 (pas de narrowing “piégeux”)
            const hasDemo = selected.status === 'RESOLVED' || Boolean(selected.createdGymId)
            const isResolved = selected.status === 'RESOLVED'
            const isRefused = selected.status === 'REFUSED'

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusTone[selected.status] as any}>{t(`status.${selected.status}`)}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {t('details.sentOn', { date: formatDate(selected.createdAt) })}
                  </span>
                </div>

                <Card className="border border-border/70">
                  <CardHeader className="pb-2">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">{selected.gymName}</p>
                      <p className="text-sm text-muted-foreground">{selected.gymEmail}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 text-primary" />
                      {selected.phone || t('details.notProvided')}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      {selected.adminEmail}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      {[selected.address, selected.city, selected.country].filter(Boolean).join(' - ') ||
                        t('details.missingAddress')}
                    </div>

                    {selected.message ? (
                      <div className="rounded-lg border border-border/60 bg-muted/50 p-3 text-sm text-muted-foreground">
                        {selected.message}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        {t('details.noMessage')}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  {!hasDemo && !isRefused && (
                    <Button variant="secondary" onClick={() => setApprovalTarget(selected)}>
                      {t('actions.createDemo')}
                    </Button>
                  )}

                  {!isResolved && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange(selected, 'RESOLVED')}
                      disabled={isResolved || isRefused}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('actions.markResolved')}
                    </Button>
                  )}

                  {!isResolved && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleStatusChange(selected, 'REFUSED')}
                      disabled={isRefused}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t('actions.refuse')}
                    </Button>
                  )}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <ApproveDemoDialog
        request={approvalTarget}
        open={Boolean(approvalTarget)}
        onOpenChange={(open) => {
          if (!open) setApprovalTarget(null)
          else if (!approvalTarget && selected) setApprovalTarget(selected)
        }}
        onApproved={({ requestId, createdGymId }) => {
          setSelected((current) => {
            if (!current || current.id !== requestId) return current
            return {
              ...current,
              status: 'RESOLVED',
              resolvedAt: new Date().toISOString(),
              createdGymId: createdGymId ?? current.createdGymId,
            }
          })
        }}
      />
    </div>
  )
}
