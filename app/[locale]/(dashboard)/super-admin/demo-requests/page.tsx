"use client"

import { useEffect, useMemo, useState } from "react"
import { Mail, MapPin, Phone, CheckCircle2, XCircle, Info } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

import {
  useDemoRequests,
  useUpdateDemoRequestStatus,
  type DemoRequest,
  type DemoRequestStatus,
} from "../hooks"

import { ApproveDemoDialog } from "@/components/superadmin/demo-requests/ApproveDemoDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PaginationControls, usePagination } from "@/components/dashboard/pagination-controls"
import { Skeleton } from "@/components/ui/skeleton"

const statusTone: Record<DemoRequestStatus, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  RESOLVED: "default",
  REFUSED: "destructive",
}

function safeDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export default function DemoRequestsPage() {
  const t = useTranslations("superAdminDemoRequestsPage")
  const locale = useLocale()

  const [statusFilter, setStatusFilter] = useState<DemoRequestStatus | "ALL">("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [selected, setSelected] = useState<DemoRequest | null>(null)
  const [approvalTarget, setApprovalTarget] = useState<DemoRequest | null>(null)

  // ✅ IMPORTANT: don't pass "ALL" to the hook if it expects a real enum
  const statusParam = statusFilter === "ALL" ? undefined : statusFilter
  const { data: requests = [], isLoading, isError } = useDemoRequests(statusParam)

  const updateStatus = useUpdateDemoRequestStatus()

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [locale],
  )

  const formatDate = (value?: string | null) => {
    const d = safeDate(value)
    return d ? dateFormatter.format(d) : "-"
  }

  useEffect(() => {
    if (!selected) return
    const freshVersion = requests.find((req) => req.id === selected.id)
    if (!freshVersion) return

    const selectedResolved = selected.status === "RESOLVED" || Boolean(selected.createdGymId)
    const freshResolved = freshVersion.status === "RESOLVED" || Boolean(freshVersion.createdGymId)

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
      { ALL: 0, PENDING: 0, RESOLVED: 0, REFUSED: 0 } as Record<DemoRequestStatus | "ALL", number>,
    )
  }, [requests])

  const handleStatusChange = (req: DemoRequest, status: DemoRequestStatus) => {
    updateStatus.mutate({ requestId: req.id, status })

    // ✅ keep modal in sync
    setSelected((current) => (current?.id === req.id ? { ...current, status } : current))

    // ✅ optional: close modal on refuse/resolve if you want (commented)
    // if (status !== "PENDING") setSelected(null)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">{t("subtitle")}</p>
        </div>
      </div>

      <Card className="border border-border/60 bg-card/90 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl rounded-3xl">
        <CardContent className="grid gap-4 py-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-border/60 bg-muted/30 p-5 animate-pulse">
                  <Skeleton className="h-5 w-28 rounded-lg" />
                  <Skeleton className="mt-3 h-10 w-20 rounded-xl" />
                </div>
              ))
            : (["ALL", "PENDING", "RESOLVED", "REFUSED"] as (DemoRequestStatus | "ALL")[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
                    statusFilter === status
                      ? "border-primary bg-primary/10 text-primary shadow-lg scale-[1.03]"
                      : "border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]"
                  }`}
                >
                  <p className="text-sm font-medium text-muted-foreground">{t(`filters.${status}`)}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{statusCounters[status] ?? 0}</p>
                </button>
              ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm border-border/60 bg-card/90 backdrop-blur-sm transition-all duration-200 focus:shadow-lg focus:border-primary/50 rounded-xl"
        />
        <span className="text-sm font-semibold text-muted-foreground">
          {t("resultsCount", { count: filteredRequests.length })}
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-xl backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted/50">
              <TableHead className="font-semibold">{t("table.gym")}</TableHead>
              <TableHead className="font-semibold">{t("table.adminContact")}</TableHead>
              <TableHead className="font-semibold">{t("table.plan")}</TableHead>
              <TableHead className="font-semibold">{t("table.status")}</TableHead>
              <TableHead className="font-semibold">{t("table.requested")}</TableHead>
              <TableHead className="font-semibold">{t("table.resolution")}</TableHead>
              <TableHead className="text-right font-semibold">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="border-border/50">
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
                const demoAlreadyCreated = req.status === "RESOLVED" || Boolean(req.createdGymId)

                return (
                  <TableRow key={req.id} className="border-border/50 hover:bg-muted/40 transition-all duration-200">
                    <TableCell className="font-semibold">
                      <div>{req.gymName}</div>
                      <div className="text-xs text-muted-foreground">{req.gymEmail}</div>
                    </TableCell>

                    <TableCell>
                      <div>{req.adminEmail}</div>
                      <div className="text-xs text-muted-foreground">
                        {(req.adminFirstName || req.adminLastName) &&
                          `${req.adminFirstName ?? ""} ${req.adminLastName ?? ""}`}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="border-border/60">
                        {req.plan}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusTone[req.status] as any}>{t(`status.${req.status}`)}</Badge>
                    </TableCell>

                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>{formatDate(req.resolvedAt)}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(req)}
                        className="transition-all duration-200 hover:bg-primary/5 rounded-xl"
                      >
                        {t("actions.view")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setApprovalTarget(req)}
                        disabled={demoAlreadyCreated}
                        className="transition-all duration-200 rounded-xl"
                      >
                        {t("actions.createDemo")}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {isError ? t("errors.load") : t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="border-t border-border/50 px-4 py-4 bg-muted/30">
          <PaginationControls
            page={pagination.page}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            totalItems={filteredRequests.length}
          />
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("details.title")}</DialogTitle>
          </DialogHeader>

          {selected &&
            (() => {
              const hasDemo = selected.status === "RESOLVED" || Boolean(selected.createdGymId)
              const isResolved = selected.status === "RESOLVED"
              const isRefused = selected.status === "REFUSED"

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusTone[selected.status] as any}>{t(`status.${selected.status}`)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {t("details.sentOn", { date: formatDate(selected.createdAt) })}
                    </span>
                  </div>

                  <Card className="border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">{selected.gymName}</p>
                        <p className="text-sm text-muted-foreground">{selected.gymEmail}</p>
                      </div>
                    </CardHeader>

                    <CardContent className="grid gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        {selected.phone || t("details.notProvided")}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 text-primary" />
                        {selected.adminEmail}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        {[selected.address, selected.city, selected.country].filter(Boolean).join(" - ") ||
                          t("details.missingAddress")}
                      </div>

                      {selected.message ? (
                        <div className="rounded-lg border border-border/60 bg-muted/50 p-3 text-sm text-muted-foreground leading-relaxed">
                          {selected.message}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          {t("details.noMessage")}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    {!hasDemo && !isRefused && (
                      <Button
                        variant="secondary"
                        onClick={() => setApprovalTarget(selected)}
                        className="transition-all duration-200"
                      >
                        {t("actions.createDemo")}
                      </Button>
                    )}

                    {!isResolved && (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selected, "RESOLVED")}
                        disabled={isResolved || isRefused}
                        className="transition-all duration-200 hover:bg-primary/5"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t("actions.markResolved")}
                      </Button>
                    )}

                    {!isResolved && (
                      <Button
                        variant="ghost"
                        className="text-destructive transition-all duration-200 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleStatusChange(selected, "REFUSED")}
                        disabled={isRefused}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t("actions.refuse")}
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
              status: "RESOLVED",
              resolvedAt: new Date().toISOString(),
              createdGymId: createdGymId ?? current.createdGymId,
            }
          })
        }}
      />
    </div>
  )
}
