"use client"

import { useMemo, useState } from "react"
import type { ChangeEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import type { AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Edit3, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  type GymPlanTier,
  type MarketingPlanAdmin,
  type MarketingPlanInput,
  type MarketingPlanTranslation,
  useCreateMarketingPlan,
  useDeleteMarketingPlan,
  useMarketingPlans,
  useUpdateMarketingPlan,
} from "@/app/[locale]/(dashboard)/super-admin/hooks"

type TranslationForm = {
  name: string
  description: string
  highlightLabel: string
  badges: string
  features: string
}

type PlanFormState = {
  tier: GymPlanTier
  order: number
  isPublished: boolean
  highlight: boolean
  translations: Record<AppLocale, TranslationForm>
}

const SUPPORTED_LOCALES: AppLocale[] = ["en", "fr", "ar"]

const PLAN_TIERS: GymPlanTier[] = ["BASIC", "PRO", "ENTERPRISE"]

function buildEmptyForm(): PlanFormState {
  const emptyTranslations = SUPPORTED_LOCALES.reduce((acc, code) => {
    acc[code] = { name: "", description: "", highlightLabel: "", badges: "", features: "" }
    return acc
  }, {} as Record<AppLocale, TranslationForm>)

  return {
    tier: "BASIC",
    order: 0,
    isPublished: true,
    highlight: false,
    translations: emptyTranslations,
  }
}

function joinLines(items?: string[]) {
  return (items ?? []).join("\n")
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function buildFormFromPlan(plan: MarketingPlanAdmin): PlanFormState {
  const base = buildEmptyForm()
  const nextTranslations = { ...base.translations }

  for (const locale of SUPPORTED_LOCALES) {
    const current = plan.translations?.[locale]
    if (!current) continue
    nextTranslations[locale] = {
      name: current.name ?? "",
      description: current.description ?? "",
      highlightLabel: current.highlightLabel ?? "",
      badges: joinLines(current.badges),
      features: joinLines(current.features),
    }
  }

  return {
    tier: plan.tier,
    order: plan.order ?? 0,
    isPublished: plan.isPublished,
    highlight: plan.highlight,
    translations: nextTranslations,
  }
}

function normalizePayload(form: PlanFormState): MarketingPlanInput {
  const translations: Record<AppLocale, MarketingPlanTranslation> = {} as Record<AppLocale, MarketingPlanTranslation>

  for (const code of SUPPORTED_LOCALES) {
    const current = form.translations[code]
    translations[code] = {
      name: current.name.trim() || undefined,
      description: current.description.trim() || undefined,
      highlightLabel: current.highlightLabel.trim() || undefined,
      badges: splitLines(current.badges),
      features: splitLines(current.features),
    }
  }

  return {
    tier: form.tier,
    order: Number.isFinite(form.order) ? form.order : 0,
    isPublished: form.isPublished,
    highlight: form.highlight,
    translations,
  }
}

export function MarketingPlansManager() {
  const locale = useLocale() as AppLocale
  const t = useTranslations("superAdminMarketingPlans")
  const { data: plans = [], isLoading } = useMarketingPlans()
  const createPlan = useCreateMarketingPlan()
  const updatePlan = useUpdateMarketingPlan()
  const deletePlan = useDeleteMarketingPlan()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingPlanAdmin | null>(null)
  const [activeLocale, setActiveLocale] = useState<AppLocale>(locale)
  const [formState, setFormState] = useState<PlanFormState>(buildEmptyForm())

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0)
      return a.tier.localeCompare(b.tier)
    })
  }, [plans])

  const resetForm = () => {
    setFormState(buildEmptyForm())
    setEditing(null)
    setActiveLocale(locale)
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (plan: MarketingPlanAdmin) => {
    setEditing(plan)
    setFormState(buildFormFromPlan(plan))
    setActiveLocale(locale)
    setDialogOpen(true)
  }

  const handleTranslationChange = (code: AppLocale, field: keyof TranslationForm, value: string) => {
    setFormState((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [code]: {
          ...current.translations[code],
          [field]: value,
        },
      },
    }))
  }

  const submitForm = async () => {
    const payload = normalizePayload(formState)
    const hasName = Object.values(payload.translations || {}).some((tr) => tr?.name)
    if (!hasName) {
      toast.error(t("errors.missingName"))
      return
    }

    try {
      if (editing) {
        await updatePlan.mutateAsync({ planId: editing.id, data: payload })
        toast.success(t("toasts.updated"))
      } else {
        await createPlan.mutateAsync(payload)
        toast.success(t("toasts.created"))
      }

      setDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("[marketing-plans][submit]", error)
    }
  }

  const handleDelete = (planId: string) => {
    const confirmed = window.confirm(t("confirmDelete"))
    if (!confirmed) return
    deletePlan.mutate(planId, {
      onSuccess: () => toast.success(t("toasts.deleted")),
    })
  }

  const renderTranslationFields = (code: AppLocale) => {
    const translation = formState.translations[code]
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("fields.name")}</Label>
            <Input
              value={translation.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleTranslationChange(code, "name", event.target.value)
              }
              placeholder={t("placeholders.name")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("fields.highlightLabel")}</Label>
            <Input
              value={translation.highlightLabel}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleTranslationChange(code, "highlightLabel", event.target.value)
              }
              placeholder={t("placeholders.highlightLabel")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("fields.description")}</Label>
          <textarea
            value={translation.description}
            onChange={(event) => handleTranslationChange(code, "description", event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
            placeholder={t("placeholders.description")}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("fields.badges")}</Label>
            <textarea
              value={translation.badges}
              onChange={(event) => handleTranslationChange(code, "badges", event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              placeholder={t("placeholders.badges")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("fields.features")}</Label>
            <textarea
              value={translation.features}
              onChange={(event) => handleTranslationChange(code, "features", event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              placeholder={t("placeholders.features")}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              {t("actions.new")}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                {editing ? t("dialog.editTitle") : t("dialog.createTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("fields.tier")}</Label>
                  <Select
                    value={formState.tier}
                    onValueChange={(value) =>
                      setFormState((current) => ({ ...current, tier: value as GymPlanTier }))
                    }
                    disabled={Boolean(editing)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.order")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formState.order}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, order: Number(event.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.locale")}</Label>
                  <Select value={activeLocale} onValueChange={(value) => setActiveLocale(value as AppLocale)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LOCALES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("fields.published")}</Label>
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
                    <Switch
                      checked={formState.isPublished}
                      onCheckedChange={(checked) =>
                        setFormState((current) => ({ ...current, isPublished: checked }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {formState.isPublished ? t("status.published") : t("status.draft")}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.highlight")}</Label>
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
                    <Switch
                      checked={formState.highlight}
                      onCheckedChange={(checked) => setFormState((current) => ({ ...current, highlight: checked }))}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formState.highlight ? t("status.highlighted") : t("status.normal")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{t("translations.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("translations.hint")}</p>
                  </div>
                  <div className="flex gap-2">
                    {SUPPORTED_LOCALES.map((code) => (
                      <Button
                        key={code}
                        size="sm"
                        variant={activeLocale === code ? "secondary" : "ghost"}
                        className="rounded-xl px-3"
                        onClick={() => setActiveLocale(code)}
                      >
                        {code.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">{renderTranslationFields(activeLocale)}</div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-between gap-3 sm:justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
                {t("actions.cancel")}
              </Button>
              <Button
                onClick={submitForm}
                disabled={createPlan.isPending || updatePlan.isPending}
                className="rounded-xl"
              >
                {(createPlan.isPending || updatePlan.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editing ? t("actions.save") : t("actions.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-4 rounded-2xl border border-border/60 p-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-lg font-semibold">{t("empty.title")}</p>
            <p className="text-sm text-muted-foreground">{t("empty.subtitle")}</p>
            <Button className="mt-4 rounded-xl" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.new")}
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>{t("table.plan")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.order")}</TableHead>
                  <TableHead>{t("table.updated")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlans.map((plan) => {
                  const displayName =
                    plan.translations?.[locale]?.name ||
                    plan.translations?.en?.name ||
                    plan.translations?.fr?.name ||
                    plan.tier
                  const updatedAt = plan.updatedAt ? new Date(plan.updatedAt) : null

                  return (
                    <TableRow key={plan.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{plan.tier}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.isPublished ? "default" : "secondary"} className="gap-1 rounded-xl">
                          {plan.isPublished ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {plan.isPublished ? t("status.published") : t("status.draft")}
                        </Badge>
                      </TableCell>
                      <TableCell>{plan.order ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {updatedAt ? updatedAt.toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleEdit(plan)}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          {t("actions.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-destructive hover:text-destructive"
                          onClick={() => handleDelete(plan.id)}
                          disabled={deletePlan.isPending}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {t("actions.delete")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
