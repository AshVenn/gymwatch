"use client"

import { useSession } from "next-auth/react"
import { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, MoreVertical, RotateCcw, Trash2, CheckCircle2, FileText, Printer } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaginationControls, usePagination } from "@/components/dashboard/pagination-controls"
import {
  SubscriptionSummary,
  type SubscriptionSummaryMetrics,
} from "@/components/dashboard/subscriptions/subscription-summary"
import {
  SubscriptionFilters,
  type SortOption,
  type QuickFilter,
} from "@/components/dashboard/subscriptions/subscription-filters"
import { Switch } from "@/components/ui/switch"
import { useVariantOptions } from "@/app/hooks/use-variants"
import { VariantSelector } from "@/components/dashboard/variant-selector"

interface Subscription {
  id: string
  planId?: string
  memberId: string
  memberName: string
  planName: string
  startDate: string
  endDate: string
  daysLeft: number
  status: "ACTIVE" | "EXPIRES_TODAY" | "EXPIRED"
  pricePaid: number
  gymVariantId?: string
  planVisitsPerDay?: number | null
  planMaxSessionMinutes?: number | null
  planDurationDays?: number | null
}

interface Plan {
  id: string
  name: string
  durationDays?: number
  visitsPerDay?: number
  maxSessionMinutes?: number | null
  gymVariantId?: string
  gymVariant?: { id: string; name: string; slug: string; isDefault?: boolean }
}

type StatusCounterKey = Subscription["status"] | "ALL"

// NOTE: if you want locale-aware formatting later, use useLocale() from next-intl.
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
const currencyFormatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
})

export default function SubscriptionsPage() {
  const t = useTranslations("dashOwAdSubscriptions")
  const locale = useLocale()

  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<SortOption>("NEXT_EXPIRY")
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [renewalForm, setRenewalForm] = useState<{ planId: string; startDate: string; createPayment: boolean }>({
    planId: "",
    startDate: new Date().toISOString().split("T")[0],
    createPayment: true,
  })

  const [visitDialogOpen, setVisitDialogOpen] = useState(false)
  const [visitSearch, setVisitSearch] = useState("")
  const [visitLoading, setVisitLoading] = useState<string | null>(null)
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null)

  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions()

  const gymId = session?.user?.gymId
  const variantFilter = selectedVariant === "all" ? null : selectedVariant

  const subscriptionQueryKey = useMemo(
    () => ["subscriptions", gymId, { searchTerm, filterStatus, variantFilter }] as const,
    [filterStatus, gymId, searchTerm, variantFilter],
  )
  const plansQueryKey = useMemo(() => ["plans", gymId, variantFilter] as const, [gymId, variantFilter])

  const statusQuickFilters: QuickFilter[] = useMemo(
    () => [
      { label: t("quickFilters.all"), value: "ALL", count: 0 },
      { label: t("quickFilters.active"), value: "ACTIVE", count: 0 },
      { label: t("quickFilters.expiresToday"), value: "EXPIRES_TODAY", count: 0 },
      { label: t("quickFilters.expired"), value: "EXPIRED", count: 0 },
    ],
    [t],
  )

  const {
    data: subscriptions = [],
    isLoading,
    isError,
  } = useQuery<Subscription[]>({
    queryKey: subscriptionQueryKey,
    enabled: Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      const normalizedStatus = filterStatus === "ALL" ? "" : filterStatus
      if (normalizedStatus) params.append("status", normalizedStatus)
      if (variantFilter) params.append("variantId", variantFilter)

      const response = await fetch(`/api/gym-team/subscriptions?${params.toString()}`)
      if (!response.ok) throw new Error(t("errors.loadSubscriptions"))

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: plansQueryKey,
    enabled: Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) params.set("variantId", variantFilter)

      const response = await fetch(`/api/gym-team/plans${params.toString() ? `?${params.toString()}` : ""}`)
      if (!response.ok) throw new Error(t("errors.loadPlans"))

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const availablePlans = useMemo(() => {
    if (!variantFilter) return plans ?? []
    return (plans ?? []).filter((plan) => plan.gymVariantId === variantFilter)
  }, [plans, variantFilter])

  useEffect(() => {
    setRenewalForm((prev) => ({ ...prev, planId: "" }))
  }, [variantFilter])

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/gym-team/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) throw new Error((data as any).error || t("errors.deleteFailed"))
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey })
      toast.success(t("toasts.deleted"))
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("errors.deleteFailed")
      toast.error(message)
    },
  })

  const renewSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!renewingId) throw new Error(t("errors.noSubscriptionSelected"))

      const response = await fetch(`/api/gym-team/subscriptions/${renewingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: renewalForm.planId,
          startDate: renewalForm.startDate || new Date().toISOString().split("T")[0],
          createPayment: renewalForm.createPayment,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error((data as any).error || t("errors.renewFailed"))
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey })
      setRenewingId(null)
      setRenewalForm({ planId: "", startDate: new Date().toISOString().split("T")[0], createPayment: true })
      toast.success(t("toasts.updated"))
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("errors.renewFailed")
      toast.error(message)
    },
  })

  const summaryMetrics: SubscriptionSummaryMetrics = useMemo(() => {
    const list = subscriptions ?? []
    if (!list.length) {
      return { totalRevenue: 0, active: 0, expired: 0, expiringSoon: 0, avgTicket: 0, retentionRate: 0 }
    }

    let revenue = 0
    let active = 0
    let expired = 0
    let expiringSoon = 0

    list.forEach((sub) => {
      revenue += sub.pricePaid ?? 0
      if (sub.status === "ACTIVE") active += 1
      if (sub.status === "EXPIRED") expired += 1
      if (sub.daysLeft >= 0 && sub.daysLeft <= 5) expiringSoon += 1
    })

    return {
      totalRevenue: revenue,
      active,
      expired,
      expiringSoon,
      avgTicket: list.length ? revenue / list.length : 0,
      retentionRate: list.length ? Math.round((active / list.length) * 100) : 0,
    }
  }, [subscriptions])

  const statusCounters = useMemo(() => {
    const initial: Record<StatusCounterKey, number> = { ALL: 0, ACTIVE: 0, EXPIRES_TODAY: 0, EXPIRED: 0 }
    return (subscriptions ?? []).reduce((acc, sub) => {
      acc.ALL += 1
      acc[sub.status] = (acc[sub.status] ?? 0) + 1
      return acc
    }, initial)
  }, [subscriptions])

  const quickFilters: QuickFilter[] = statusQuickFilters.map((filter) => ({
    ...filter,
    count: filter.value === "ALL" ? statusCounters.ALL : (statusCounters[filter.value as Subscription["status"]] ?? 0),
  }))

  const filteredSubscriptions = useMemo(() => {
    const normalizedStatus = filterStatus === "ALL" ? undefined : filterStatus
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const matches = (value?: string | null) => !normalizedSearch || value?.toLowerCase().includes(normalizedSearch)

    const list = (subscriptions ?? []).filter((sub) => {
      const matchesStatus = normalizedStatus ? sub.status === normalizedStatus : true
      const matchesSearch = matches(sub.memberName) || matches(sub.planName)
      return matchesStatus && matchesSearch
    })

    const getTime = (value: string) => {
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
    }

    return list.sort((a, b) => {
      switch (sortBy) {
        case "PRICE_DESC":
          return (b.pricePaid ?? 0) - (a.pricePaid ?? 0)
        case "RECENT_START":
          return getTime(b.startDate) - getTime(a.startDate)
        default:
          return getTime(a.endDate) - getTime(b.endDate)
      }
    })
  }, [subscriptions, filterStatus, searchTerm, sortBy])

  const visitableMembers = useMemo(() => {
    const normalizedSearch = visitSearch.trim().toLowerCase()
    const seen = new Set<string>()
    return (subscriptions ?? []).reduce((list: Subscription[], sub) => {
      if (seen.has(sub.memberId)) return list
      const matchesVariant = !variantFilter || sub.gymVariantId === variantFilter
      if (!matchesVariant) return list
      const matchesSearch = !normalizedSearch || sub.memberName.toLowerCase().includes(normalizedSearch)
      if (matchesSearch) {
        list.push(sub)
        seen.add(sub.memberId)
      }
      return list
    }, [])
  }, [subscriptions, variantFilter, visitSearch])

  const subscriptionPagination = usePagination(filteredSubscriptions, 10)

  const describePlan = (visits?: number | null, session?: number | null) => {
    const parts: string[] = []
    if (typeof visits === "number") {
      parts.push(visits < 0 ? t("table.unlimitedVisits") : t("table.visitsPerDay", { count: visits }))
    }
    if (typeof session === "number" && session > 0) {
      parts.push(t("table.sessionLimit", { count: session }))
    }
    return parts.join(" · ")
  }

  const handleDeleteSubscription = (subscriptionId: string) => {
    if (!subscriptionId) return
    if (confirm(t("confirm.delete"))) {
      deleteSubscriptionMutation.mutate(subscriptionId)
    }
  }

  const downloadInvoice = async (subscriptionId: string, mode: "download" | "print" = "download") => {
    if (!subscriptionId) return
    try {
      setInvoiceLoadingId(subscriptionId)
      const response = await fetch(`/api/gym-team/subscriptions/${subscriptionId}/invoice?locale=${locale}`)
      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        throw new Error(detail || t("errors.invoiceFailed"))
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      if (mode === "print") {
        const printWindow = window.open(url)
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.focus()
            printWindow.print()
          }
        }
      } else {
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `subscription-${subscriptionId}.pdf`
        anchor.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.invoiceFailed")
      toast.error(message)
    } finally {
      setInvoiceLoadingId(null)
    }
  }

  const handleRenewalSubmit = () => {
    if (!renewalForm.planId) {
      toast.error(t("toasts.selectPlan"))
      return
    }
    if (!renewalForm.startDate) {
      toast.error(t("toasts.selectStartDate"))
      return
    }
    renewSubscriptionMutation.mutate()
  }

  const markVisit = async (memberId: string) => {
    if (!memberId) return
    try {
      setVisitLoading(memberId)

      const response = await fetch("/api/gym-team/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, markVisit: true }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error((data as any).error || t("errors.markVisitFailed"))

      const fullName = (data as any).memberName || t("labels.memberFallback")

      const visitLimit = typeof (data as any).visitLimit === "number" ? (data as any).visitLimit : null
      const visitsToday = typeof (data as any).visitsToday === "number" ? (data as any).visitsToday : null

      const overDailyLimit =
        typeof (data as any).overDailyLimit === "boolean"
          ? (data as any).overDailyLimit
          : visitLimit !== null && visitLimit > 0 && visitsToday !== null
            ? visitsToday >= visitLimit
            : false

      const visitsRemaining =
        typeof (data as any).visitsRemaining === "number" ? Math.max((data as any).visitsRemaining, 0) : null
      const limitState = ((data as any).limitState as string) ?? "OK"
      const limitWarning = limitState === "WARNING"
      const openVisitId = typeof (data as any)?.openVisitId === "string" ? (data as any).openVisitId : null
      const blocked = (limitState === "BLOCKED" || overDailyLimit) && !openVisitId

      if (!(data as any).active) {
        toast.error(t("toasts.inactiveOrExpired"))
        return
      }

      if (openVisitId) {
        toast.warning(t("toasts.dailyLimitReached", { name: fullName }))
        return
      }

      if (blocked) {
        toast.error(t("toasts.dailyLimitReached", { name: fullName }))
        return
      }

      if (limitWarning) {
        const remaining =
          visitsRemaining !== null
            ? visitsRemaining === 1
              ? t("labels.remainingVisitsOne")
              : t("labels.remainingVisitsMany", { count: visitsRemaining })
            : ""
        toast.warning(t("toasts.lastVisitWarning", { name: fullName, remaining }))
      }

      const remaining =
        visitsRemaining !== null
          ? visitsRemaining === 1
            ? t("labels.remainingShortOne")
            : t("labels.remainingShortMany", { count: visitsRemaining })
          : ""
      toast.success(
        t("toasts.markedPresent", { name: fullName, count: (data as any).todayVisitorCount ?? 0, remaining }),
      )

      setVisitDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.markVisitFailed")
      toast.error(message)
    } finally {
      setVisitLoading(null)
    }
  }

  const safeDate = (value: string | null | undefined) => {
    if (!value) return "-"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "-"
    return dateFormatter.format(parsed)
  }

  const getStatusBadge = (status: Subscription["status"]) => {
    const base = "border border-border/60 text-xs font-semibold uppercase tracking-wider"

    if (status === "ACTIVE") {
      return <Badge className={cn(base, "bg-primary/10 text-primary")}>{t("status.active")}</Badge>
    }
    if (status === "EXPIRES_TODAY") {
      return (
        <Badge className={cn(base, "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-50")}>
          {t("status.expiresToday")}
        </Badge>
      )
    }
    if (status === "EXPIRED") {
      return <Badge className={cn(base, "bg-destructive/20 text-destructive")}>{t("status.expired")}</Badge>
    }

    return <Badge className={base}>{status}</Badge>
  }

  const selectedPlan = plans.find((plan) => plan.id === renewalForm.planId)
  const endPreview =
    selectedPlan && renewalForm.startDate
      ? (() => {
          const end = new Date(renewalForm.startDate)
          if (selectedPlan.durationDays) end.setDate(end.getDate() + selectedPlan.durationDays)
          return end
        })()
      : null

  if (isLoading || variantsLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="h-64 animate-pulse rounded-3xl border border-border/60 bg-linear-to-br from-primary/5 to-background p-6 shadow-sm">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-card/60 p-4">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-[420px] animate-pulse rounded-3xl border border-border/60 bg-card/60" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-end">
        <VariantSelector
          variants={variants}
          value={selectedVariant}
          onChange={setSelectedVariant}
          isGymAdmin={isGymAdmin}
          lockedVariantId={lockedVariantId}
          loading={variantsLoading}
        />
      </div>

        <div className="rounded-3xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm">
        <SubscriptionSummary metrics={summaryMetrics} />
      </div>


      {isError && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
          {t("errors.loadSubscriptionsInline")}
        </div>
      )}

      <SubscriptionFilters
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
        quickFilters={quickFilters}
        onQuickFilter={setFilterStatus}
      />

      <div className="flex justify-end">
        <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setVisitDialogOpen(true)}>
              <CheckCircle2 className="mr-2" size={16} />
              {t("visit.button")}
            </Button>
          </DialogTrigger>

          <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("visit.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("visit.dialogDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                placeholder={t("visit.searchPlaceholder")}
                value={visitSearch}
                onChange={(e) => setVisitSearch(e.target.value)}
              />

              <div className="max-h-72 space-y-2 overflow-y-auto">
                {visitableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("visit.noneFound")}</p>
                ) : (
                  visitableMembers.map((sub) => (
                    <div
                      key={sub.memberId}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold">{sub.memberName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("visit.endLine", { date: safeDate(sub.endDate), daysLeft: sub.daysLeft })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={visitLoading === sub.memberId}
                        onClick={() => markVisit(sub.memberId)}
                      >
                        {visitLoading === sub.memberId ? t("visit.saving") : t("visit.validate")}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm">
        {subscriptionPagination.data.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4 text-sm text-muted-foreground">
              <span>
                {t("table.found", {
                  count: filteredSubscriptions.length,
                  plural: filteredSubscriptions.length > 1 ? "s" : "",
                  plural2: filteredSubscriptions.length > 1 ? "s" : "",
                })}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t("table.page", { page: subscriptionPagination.page, pageCount: subscriptionPagination.pageCount })}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="text-muted-foreground">
                  <TableHead>{t("table.member")}</TableHead>
                  <TableHead>{t("table.plan")}</TableHead>
                  <TableHead>{t("table.start")}</TableHead>
                  <TableHead>{t("table.end")}</TableHead>
                  <TableHead>{t("table.remaining")}</TableHead>
                  <TableHead className="text-right">{t("table.amount")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.variant")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {subscriptionPagination.data.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className={cn(
                      "border-border/60 text-foreground transition-colors hover:bg-muted/40",
                      sub.status === "EXPIRED" && "bg-destructive/10",
                      sub.status === "EXPIRES_TODAY" && "bg-amber-100/30 dark:bg-amber-500/10",
                    )}
                  >
                    <TableCell className="font-semibold">
                      <div>{sub.memberName ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("table.idPrefix", { id: sub.id.slice(0, 8) })}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">{sub.planName ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {describePlan(sub.planVisitsPerDay ?? null, sub.planMaxSessionMinutes ?? null) ||
                          t("table.visitsFallback")}
                      </div>
                    </TableCell>
                    <TableCell>{safeDate(sub.startDate)}</TableCell>
                    <TableCell>{safeDate(sub.endDate)}</TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          sub.daysLeft < 0
                            ? "text-destructive"
                            : sub.daysLeft <= 5
                              ? "text-amber-600 dark:text-amber-300"
                              : "text-primary",
                        )}
                      >
                        {sub.daysLeft < 0
                          ? t("table.late", { count: Math.abs(sub.daysLeft) })
                          : t("table.left", { count: sub.daysLeft })}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-semibold">
                      {sub.pricePaid ? currencyFormatter.format(sub.pricePaid) : "-"}
                    </TableCell>

                    <TableCell>{getStatusBadge(sub.status)}</TableCell>

                    <TableCell>
                      {sub.gymVariantId ? (variants.find((v) => v.id === sub.gymVariantId)?.name ?? "-") : "-"}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="w-48 border border-border/60 bg-card text-foreground"
                        >
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              markVisit(sub.memberId)
                            }}
                          >
                            <CheckCircle2 className="mr-2" size={16} />
                            {t("actions.markVisit")}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            disabled={invoiceLoadingId === sub.id}
                            onSelect={(event) => {
                              event.preventDefault()
                              downloadInvoice(sub.id, "download")
                            }}
                          >
                            <FileText className="mr-2" size={16} />
                            {invoiceLoadingId === sub.id ? t("actions.loadingInvoice") : t("actions.downloadInvoice")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={invoiceLoadingId === sub.id}
                            onSelect={(event) => {
                              event.preventDefault()
                              downloadInvoice(sub.id, "print")
                            }}
                          >
                            <Printer className="mr-2" size={16} />
                            {t("actions.printInvoice")}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              setRenewingId(sub.id)
                              setRenewalForm({
                                planId: "",
                                startDate: new Date().toISOString().split("T")[0],
                                createPayment: true,
                              })
                            }}
                          >
                            <RotateCcw className="mr-2" size={16} />
                            {t("actions.editRenew")}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2" size={16} />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {renewingId === sub.id ? (
                        <Dialog open onOpenChange={(open) => !open && setRenewingId(null)}>
                          <DialogContent className="border-border/60 bg-card text-foreground">
                            <DialogHeader>
                              <DialogTitle>{t("renew.title")}</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="renew-plan" className="text-foreground">
                                  {t("renew.planLabel")}
                                </Label>
                                <Select
                                  value={renewalForm.planId}
                                  onValueChange={(value) => setRenewalForm({ ...renewalForm, planId: value })}
                                >
                                  <SelectTrigger id="renew-plan" className="mt-1">
                                    <SelectValue placeholder={t("renew.planPlaceholder")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availablePlans.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{plan.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {describePlan(plan.visitsPerDay ?? null, plan.maxSessionMinutes ?? null) ||
                                              t("table.visitsFallback")}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-foreground">{t("renew.startDateLabel")}</Label>
                                <Input
                                  type="date"
                                  value={renewalForm.startDate}
                                  onChange={(e) => setRenewalForm({ ...renewalForm, startDate: e.target.value })}
                                />
                                {endPreview && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("renew.endPreview", { date: dateFormatter.format(endPreview) })}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                                <div className="space-y-0.5">
                                  <p className="text-sm font-medium">{t("renew.createPaymentTitle")}</p>
                                  <p className="text-xs text-muted-foreground">{t("renew.createPaymentDesc")}</p>
                                </div>
                                <Switch
                                  checked={renewalForm.createPayment}
                                  onCheckedChange={(checked) => setRenewalForm({ ...renewalForm, createPayment: checked })}
                                />
                              </div>

                              <Button
                                className="w-full"
                                onClick={handleRenewalSubmit}
                                disabled={renewSubscriptionMutation.isPending}
                              >
                                {renewSubscriptionMutation.isPending ? t("renew.saving") : t("renew.save")}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="border-t border-border/60 px-4 py-4">
              <PaginationControls
                page={subscriptionPagination.page}
                pageCount={subscriptionPagination.pageCount}
                pageSize={subscriptionPagination.pageSize}
                onPageChange={subscriptionPagination.setPage}
                totalItems={filteredSubscriptions.length}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-10 py-24 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 text-primary" />
            <p className="text-lg font-semibold">{t("empty.title")}</p>
            <p className="text-sm text-muted-foreground">{t("empty.desc")}</p>
            <Button variant="outline" onClick={() => setFilterStatus("ALL")}>
              {t("empty.reset")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
