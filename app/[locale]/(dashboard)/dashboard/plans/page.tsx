"use client"

import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Plus, Edit2, Trash2 } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { usePagination } from "@/components/dashboard/pagination-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useVariantOptions } from "@/app/hooks/use-variants"
import { VariantSelector } from "@/components/dashboard/variant-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Select,SelectItem,SelectTrigger,SelectValue,SelectContent } from "@/components/ui/select"
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  isActive: boolean
  visitsPerDay: number
  maxSessionMinutes?: number | null
  gymVariantId?: string
  gymVariant?: { id: string; name: string; slug: string; isDefault?: boolean }
}

interface GymPlanLimits {
  planLimits?: {
    perVariant: number | null
    perNetwork: number | null
    unlimitedPerVariant: boolean
    unlimitedPerNetwork: boolean
  }
}

export default function PlansPage() {
  const t = useTranslations("dashboard.plans")
  const locale = useLocale()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const gymId = session?.user?.gymId ?? null
  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions()
  const numberLocale = locale === "en" ? "en-US" : locale === "ar" ? "ar" : "fr-FR"

  const { data: gymInfo } = useQuery<GymPlanLimits>({
    queryKey: ["gym", "plan-limits", gymId],
    enabled: Boolean(gymId),
    queryFn: async () => {
      const response = await fetch("/api/gym-team/gym")
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || t("errors.loadLimits"))
      }
      return body as GymPlanLimits
    },
  })

  const [planVariantId, setPlanVariantId] = useState<string>("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    durationDays: "",
    price: "",
    isActive: true,
    visitsPerDay: "",
    unlimitedVisits: false,
    maxSessionMinutes: "",
  })
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectivePlanVariantId = useMemo(
    () =>
      planVariantId || (selectedVariant !== "all" ? selectedVariant : "") || defaultVariantId || variants[0]?.id || "",
    [defaultVariantId, planVariantId, selectedVariant, variants],
  )

  useEffect(() => {
    if (editingId) return
    if (isGymAdmin && lockedVariantId) {
      setPlanVariantId(lockedVariantId)
      return
    }
    if (selectedVariant && selectedVariant !== "all") {
      setPlanVariantId(selectedVariant)
    } else if (defaultVariantId) {
      setPlanVariantId(defaultVariantId)
    }
  }, [defaultVariantId, editingId, isGymAdmin, lockedVariantId, selectedVariant])

  const variantFilter = selectedVariant === "all" ? null : selectedVariant
  const planQueryKey = useMemo(() => ["plans", gymId, variantFilter] as const, [gymId, variantFilter])

  const {
    data: plans = [],
    isError,
    isLoading: plansLoading,
  } = useQuery<Plan[]>({
    queryKey: planQueryKey,
    enabled: status === "authenticated" && Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) {
        params.set("variantId", variantFilter)
      }
      const response = await fetch(`/api/gym-team/plans${params.toString() ? `?${params.toString()}` : ""}`)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t("errors.unauthorized"))
        }

        throw new Error(t("errors.server"))
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const planPagination = usePagination(plans, 10)

  const planStats = useMemo(() => {
    const active = plans.filter((plan) => plan.isActive).length
    const inactive = plans.length - active
    return { total: plans.length, active, inactive }
  }, [plans])

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans])
  const activeVariantCount = useMemo(() => {
    if (!effectivePlanVariantId) return activePlans.length
    return activePlans.filter((plan) => plan.gymVariantId === effectivePlanVariantId).length
  }, [activePlans, effectivePlanVariantId])

  const planLimits = gymInfo?.planLimits
  const variantLimit = planLimits?.perVariant ?? null
  const networkLimit = planLimits?.perNetwork ?? null
  const computeCapState = (limit: number | null, count: number) => {
    if (limit === null || limit < 0) return "OK"
    if (count >= limit) return "BLOCKED"
    if (count >= limit - 1) return "WARNING"
    return "OK"
  }
  const variantCapState = computeCapState(variantLimit, activeVariantCount)
  const networkCapState = computeCapState(networkLimit, activePlans.length)
  const capBlocked = variantCapState === "BLOCKED" || networkCapState === "BLOCKED"
  const capWarning = !capBlocked && (variantCapState === "WARNING" || networkCapState === "WARNING")
  const formatLimitLabel = (limit: number | null, unlimited?: boolean) =>
    unlimited || limit === null || limit < 0 ? t("page.table.unlimited") : String(limit)

  const selectedVariantLimit = useMemo(() => {
    const variant = variants.find((entry) => entry.id === effectivePlanVariantId)
    return variant?.maxSessionMinutes ?? null
  }, [effectivePlanVariantId, variants])

  const handleAddPlan = () => {
    if (capBlocked) {
      toast.error(t("toasts.limitBlocked"))
      return
    }
    if (capWarning) {
      toast.warning(t("toasts.limitWarning"))
    }
    setEditingId(null)
    setFormData({
      name: "",
      durationDays: "",
      price: "",
      isActive: true,
      visitsPerDay: "1",
      unlimitedVisits: false,
      maxSessionMinutes: "",
    })
    const fallbackVariant =
      (selectedVariant !== "all" ? selectedVariant : "") || lockedVariantId || defaultVariantId || variants[0]?.id || ""
    setPlanVariantId(fallbackVariant)
    setIsOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingId(plan.id)
    const unlimited = typeof plan.visitsPerDay === "number" && plan.visitsPerDay < 0
    setFormData({
      name: plan.name,
      durationDays: String(plan.durationDays),
      price: String(plan.price),
      isActive: plan.isActive,
      visitsPerDay: unlimited ? "" : String(plan.visitsPerDay ?? 1),
      unlimitedVisits: unlimited,
      maxSessionMinutes: plan.maxSessionMinutes ? String(plan.maxSessionMinutes) : "",
    })
    setPlanVariantId(plan.gymVariantId ?? plan.gymVariant?.id ?? lockedVariantId ?? "")
    setIsOpen(true)
  }

  const savePlanMutation = useMutation({
    mutationFn: async (payload: { visitsPerDay: number; maxSessionMinutes: number | null }) => {
      const method = editingId ? "PUT" : "POST"
      const url = editingId ? `/api/gym-team/plans/${editingId}` : "/api/gym-team/plans"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          durationDays: Number.parseInt(formData.durationDays, 10),
          price: Number.parseFloat(formData.price),
          isActive: formData.isActive,
          gymVariantId: effectivePlanVariantId || undefined,
          visitsPerDay: payload.visitsPerDay,
          maxSessionMinutes: payload.maxSessionMinutes,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail = (data as any)?.message || data.error
        throw new Error(detail || "Erreur lors de la sauvegarde")
      }

      return data
    },
    onSuccess: () => {
      setError(null)
      setIsOpen(false)
      setFormData({
        name: "",
        durationDays: "",
        price: "",
        isActive: true,
        visitsPerDay: "1",
        unlimitedVisits: false,
        maxSessionMinutes: "",
      })
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: planQueryKey })
      toast.success(editingId ? t("toasts.updated") : t("toasts.created"))
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("errors.save")
      setError(message)
      toast.error(message)
    },
  })

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/gym-team/plans/${planId}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Impossible de supprimer le plan.")
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planQueryKey })
      toast.success(t("toasts.deleted"))
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("errors.delete")
      setError(message)
      toast.error(message)
    },
  })

  const handleSubmit = () => {
    if (!effectivePlanVariantId) {
      toast.error(t("validation.variantRequired"))
      return
    }
    const parsedVisits = formData.unlimitedVisits ? -1 : Number.parseInt(formData.visitsPerDay, 10)
    if (!formData.unlimitedVisits && (!Number.isFinite(parsedVisits) || parsedVisits < 1)) {
      toast.error(t("validation.visitsPerDay"))
      return
    }
    const trimmedLimit = formData.maxSessionMinutes.trim()
    let parsedSessionLimit: number | null = null
    if (trimmedLimit) {
      const numericLimit = Number(trimmedLimit)
      if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
        toast.error(t("validation.sessionDuration"))
        return
      }
      parsedSessionLimit = Math.trunc(numericLimit)
    }
    savePlanMutation.mutate({ visitsPerDay: parsedVisits, maxSessionMinutes: parsedSessionLimit })
  }

  const handleDeletePlan = (planId: string) => {
    if (confirm(t("validation.confirmDelete"))) {
      deletePlanMutation.mutate(planId)
    }
  }

  const renderContent = () => {
    if (status === "loading") {
      return <div>{t("page.loadingUser")}</div>
    }

    if (status === "unauthenticated") {
      return <div className="text-red-500 font-medium">{t("page.unauthenticated")}</div>
    }

    if (!gymId) {
      return <div className="text-red-500 font-medium">{t("page.noGym")}</div>
    }

    if (plansLoading || variantsLoading) {
      return (
        <div className="space-y-4 animate-in fade-in duration-500">
          <Skeleton className="h-9 w-52 rounded-2xl" />
          <div className="rounded-3xl border border-border/60 bg-card/80 p-6 space-y-4">
            <Skeleton className="h-6 w-2/5 rounded-lg" />
            <Skeleton className="h-4 w-3/5 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-10 w-full rounded-2xl" />
          </div>
          {/* </Enhanced plans skeleton */}
        </div>
      )
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
        <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>{t("page.title")}</CardTitle>
              <CardDescription>{t("page.description")}</CardDescription>
            </div>
            <div className="inline-flex gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{planStats.active}</span> {t("page.stats.active")}
              </span>
              <span>
                <span className="font-semibold text-foreground">{planStats.inactive}</span> {t("page.stats.inactive")}
              </span>
              <span>
                <span className="font-semibold text-foreground">{planStats.total}</span> {t("page.stats.total")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{t("page.helper")}</p>
            <Button onClick={handleAddPlan} className="rounded-2xl shadow-md transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              {t("page.ctaAdd")}
            </Button>
          </CardContent>
        </Card>
        {/* </Enhanced plans card */}

        {planLimits ? (
          <div
            className={`rounded-2xl border px-4 py-3 shadow-sm transition-all ${
              capBlocked
                ? "border-destructive/50 bg-destructive/10"
                : capWarning
                  ? "border-amber-300/50 bg-amber-50/80"
                  : "border-border/60 bg-muted/50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t("page.limits.title")}
                </p>
                <p className="text-xs text-muted-foreground">{t("page.limits.description")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="border-border/70 bg-background/60">
                  {t("page.limits.variantLabel")}: {activeVariantCount}/
                  {formatLimitLabel(variantLimit, planLimits.unlimitedPerVariant)}
                </Badge>
                <Badge variant="outline" className="border-border/70 bg-background/60">
                  {t("page.limits.networkLabel")}: {activePlans.length}/
                  {formatLimitLabel(networkLimit, planLimits.unlimitedPerNetwork)}
                </Badge>
              </div>
            </div>
            {capBlocked ? (
              <p className="mt-2 text-xs font-semibold text-destructive">{t("page.limits.blocked")}</p>
            ) : capWarning ? (
              <p className="mt-2 text-xs font-medium text-amber-800">{t("page.limits.warning")}</p>
            ) : null}
          </div>
        ) : null}
        {/* </Enhanced limits alert */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
            <DialogHeader>
              <DialogTitle>{editingId ? t('page.dialog.editTitle') : t('page.dialog.addTitle')}</DialogTitle>
            </DialogHeader>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-4">
              <div>
                <Label htmlFor="plan-variant">{t('page.dialog.variant')}</Label>
                {isGymAdmin ? (
                  <p className="text-sm text-muted-foreground">
                    {variants.find((variant) => variant.id === lockedVariantId)?.name ?? t('page.dialog.assignedVariant')}
                  </p>
                ) : (
                  <Select value={effectivePlanVariantId} onValueChange={(value) => setPlanVariantId(value)}>
                    <SelectTrigger id="plan-variant">
                      <SelectValue placeholder={t('page.dialog.variantPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(variants ?? []).map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name} {variant.isDefault ? t('page.dialog.default') : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label htmlFor="plan-name">{t('page.dialog.name')}</Label>
                <Input
                  id="plan-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('page.dialog.namePlaceholder')}
                />
              </div>

              <div>
                <Label htmlFor="plan-duration">{t('page.dialog.duration')}</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  placeholder="30"
                />
              </div>

              <div>
                <Label htmlFor="plan-price">{t('page.dialog.price')}</Label>
                <Input
                  id="plan-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="300"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-visits">{t('page.dialog.visitsPerDay')}</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="plan-visits-unlimited"
                      checked={formData.unlimitedVisits}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          unlimitedVisits: checked,
                          visitsPerDay: checked ? '' : prev.visitsPerDay || '1',
                        }))
                      }
                    />
                    <Label htmlFor="plan-visits-unlimited" className="text-sm text-muted-foreground">
                      {t('page.dialog.unlimited')}
                    </Label>
                  </div>
                </div>
                <Input
                  id="plan-visits"
                  type="number"
                  min={1}
                  disabled={formData.unlimitedVisits}
                  value={formData.unlimitedVisits ? '' : formData.visitsPerDay}
                  onChange={(e) => setFormData({ ...formData, visitsPerDay: e.target.value })}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  {t('page.dialog.visitsHelper')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-session-limit">{t('page.dialog.sessionLimit')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedVariantLimit
                      ? t('page.dialog.sessionLimitVariant', { limit: selectedVariantLimit })
                      : t('page.dialog.sessionLimitFallback')}
                  </span>
                </div>
                <Input
                  id="plan-session-limit"
                  type="number"
                  min={1}
                  value={formData.maxSessionMinutes}
                  onChange={(e) => setFormData({ ...formData, maxSessionMinutes: e.target.value })}
                  placeholder={
                    selectedVariantLimit
                      ? String(selectedVariantLimit)
                      : t('page.dialog.sessionLimitPlaceholder')
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('page.dialog.sessionLimitHelper')}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="plan-active" className="text-sm font-medium">
                  {t('page.dialog.active')}
                </Label>
                <Switch
                  id="plan-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={savePlanMutation.isPending}>
                {savePlanMutation.isPending
                  ? t('page.dialog.saving')
                  : editingId
                    ? t('page.dialog.update')
                    : t('page.dialog.create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/30">
                <TableHead>{t("page.table.name")}</TableHead>
                <TableHead>{t("page.table.duration")}</TableHead>
                <TableHead>{t("page.table.price")}</TableHead>
                <TableHead>{t("page.table.visits")}</TableHead>
                <TableHead>{t("page.table.session")}</TableHead>
                <TableHead>{t("page.table.active")}</TableHead>
                <TableHead>{t("page.table.variant")}</TableHead>
                <TableHead className="text-right">{t("page.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planPagination.data.map((plan) => (
                <TableRow key={plan.id} className="border-border/60">
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.durationDays}</TableCell>
                  <TableCell>{plan.price.toLocaleString(numberLocale)}</TableCell>
                  <TableCell>{plan.visitsPerDay < 0 ? t("page.table.unlimited") : plan.visitsPerDay}</TableCell>
                  <TableCell>
                    {plan.maxSessionMinutes ? (
                      `${plan.maxSessionMinutes} min`
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("page.table.variantGym")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? t("page.table.yes") : t("page.table.no")}
                    </Badge>
                  </TableCell>
                  <TableCell>{plan.gymVariant?.name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEditPlan(plan)}>
                          <Edit2 className="mr-2" size={16} />
                          {t("page.table.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeletePlan(plan.id)} className="text-destructive">
                          <Trash2 className="mr-2" size={16} />
                          {t("page.table.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {planPagination.data.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-6 py-4 text-sm text-muted-foreground">
              <span>{t("page.table.found", { count: plans.length })}</span>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t("page.table.page", { page: planPagination.page, pages: planPagination.pageCount })}
              </span>
            </div>
          )}
        </div>
        {/* </Enhanced table card */}

        {isError ? (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
            {t("page.loadError")}
          </div>
        ) : null}
      </div>
    )
  }

  return renderContent()
}
