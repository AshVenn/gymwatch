"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { Download, Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PaginationControls } from "@/components/dashboard/pagination-controls"

type AuditEntry = {
  id: string
  actorEmail: string
  actorName?: string | null
  actorRole: "SUPER_ADMIN" | "SUPER_MANAGER"
  action: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
  createdAt: string
}

type AuditResponse = {
  items: AuditEntry[]
  total: number
  page: number
  pageSize: number
}

export default function SuperAdminAuditPage() {
  const t = useTranslations("superAdminAudit")
  const locale = useLocale()

  const [query, setQuery] = useState("")
  const [actor, setActor] = useState("")
  const [action, setAction] = useState("")
  const [target, setTarget] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  useEffect(() => {
    setPage(1)
  }, [query, actor, action, target, from, to, pageSize])

  const buildParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("query", query.trim())
    if (actor.trim()) params.set("actor", actor.trim())
    if (action.trim()) params.set("action", action.trim())
    if (target.trim()) params.set("target", target.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => params.set(key, value))
    }
    return params
  }

  const auditQuery = useQuery<AuditResponse>({
    queryKey: ["super-admin", "audit", query, actor, action, target, from, to, page, pageSize],
    queryFn: async () => {
      const params = buildParams()
      const response = await fetch(`/api/super-admin/audit?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || payload.error || t("errors.load"))
      }
      return payload as AuditResponse
    },
    keepPreviousData: true,
  })

  const exportCsv = () => {
    const params = buildParams({ export: "csv" })
    window.location.href = `/api/super-admin/audit?${params.toString()}`
  }

  const total = auditQuery.data?.total ?? 0
  const items = auditQuery.data?.items ?? []
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {t("actions.export")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2">
          <Label>{t("filters.search")}</Label>
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("filters.actor")}</Label>
          <Input
            placeholder={t("filters.actorPlaceholder")}
            value={actor}
            onChange={(event) => setActor(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("filters.action")}</Label>
          <Input
            placeholder={t("filters.actionPlaceholder")}
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("filters.target")}</Label>
          <Input
            placeholder={t("filters.targetPlaceholder")}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("filters.from")}</Label>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("filters.to")}</Label>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <div />
        <div className="space-y-2">
          <Label>{t("filters.pageSize")}</Label>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/90 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.columns.date")}</TableHead>
                <TableHead>{t("table.columns.actor")}</TableHead>
                <TableHead>{t("table.columns.action")}</TableHead>
                <TableHead>{t("table.columns.target")}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditQuery.isLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length ? (
                items.map((entry) => {
                  const roleLabel =
                    entry.actorRole === "SUPER_ADMIN" ? t("roles.superAdmin") : t("roles.superManager")
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.createdAt).toLocaleString(locale)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{entry.actorName || t("table.actorFallback")}</p>
                          <p className="text-xs text-muted-foreground">{entry.actorEmail}</p>
                          <Badge variant="secondary">{roleLabel}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{entry.action}</span>
                      </TableCell>
                      <TableCell>
                        {!entry.targetType && !entry.targetId ? (
                          <span className="text-sm text-muted-foreground">{t("table.targetEmpty")}</span>
                        ) : (
                          <div className="space-y-1 text-sm">
                            <p>{entry.targetType ?? t("table.targetUnknown")}</p>
                            <p className="text-xs text-muted-foreground">{entry.targetId ?? "-"}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(entry)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationControls
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageChange={setPage}
          totalItems={total}
          className="mt-0 rounded-none border-0 border-t border-border/70 bg-transparent px-4 py-4"
        />
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("details.title")}</DialogTitle>
            <DialogDescription>{selected ? selected.action : t("details.subtitle")}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("details.fields.date")}</p>
                  <p>{new Date(selected.createdAt).toLocaleString(locale)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("details.fields.actor")}</p>
                  <p>{selected.actorEmail}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("details.fields.role")}</p>
                  <p>{selected.actorRole}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("details.fields.ip")}</p>
                  <p>{selected.ip ?? "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("details.fields.target")}</p>
                  <p>{selected.targetType ?? "-"} {selected.targetId ?? ""}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("details.fields.userAgent")}</p>
                  <p className="break-all">{selected.userAgent ?? "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("details.fields.metadata")}</p>
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
                  {selected.metadata ? JSON.stringify(selected.metadata, null, 2) : t("details.noMetadata")}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
