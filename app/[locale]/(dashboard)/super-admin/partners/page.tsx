"use client"

import { useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import type { AppLocale } from "@/i18n/routing"
import {
  PartnerTranslation,
  type PartnerClubAdmin,
  type PartnerClubInput,
  useCreatePartnerClub,
  useDeletePartnerClub,
  usePartnerClubs,
  useUpdatePartnerClub,
  useUploadPartnerAsset,
} from "../hooks"

import { cn } from "@/lib/utils"
import { CalendarClock, CheckCircle2, Edit3, Loader2, Plus, Trash2, UploadCloud, XCircle } from "lucide-react"
import { toast } from "sonner"

type PartnerFormState = {
  slug: string
  websiteUrl: string
  logoUrl?: string
  logoPublicId?: string
  coverUrl?: string
  coverPublicId?: string
  order: number
  isPublished: boolean
  translations: Record<AppLocale, PartnerTranslation>
}

const SUPPORTED_LOCALES: AppLocale[] = ["fr", "en", "ar"]

function buildEmptyForm(locale: AppLocale): PartnerFormState {
  const emptyTranslations = SUPPORTED_LOCALES.reduce(
    (acc, code) => {
      acc[code] = { name: "", city: "", country: "", tagline: "", description: "" }
      return acc
    },
    {} as Record<AppLocale, PartnerTranslation>,
  )

  return {
    slug: "",
    websiteUrl: "",
    logoUrl: "",
    logoPublicId: "",
    coverUrl: "",
    coverPublicId: "",
    order: 0,
    isPublished: true,
    translations: emptyTranslations,
  }
}

function buildFormFromPartner(partner: PartnerClubAdmin, locale: AppLocale): PartnerFormState {
  const base = buildEmptyForm(locale)
  const normalizedTranslations = { ...base.translations }

  for (const code of SUPPORTED_LOCALES) {
    const current = partner.translations?.[code]
    if (current) {
      normalizedTranslations[code] = {
        name: current.name ?? "",
        city: current.city ?? "",
        country: current.country ?? "",
        tagline: current.tagline ?? "",
        description: current.description ?? "",
      }
    }
  }

  return {
    slug: partner.slug || "",
    websiteUrl: partner.websiteUrl ?? "",
    logoUrl: partner.logoUrl ?? "",
    logoPublicId: partner.logoPublicId ?? "",
    coverUrl: partner.coverUrl ?? "",
    coverPublicId: partner.coverPublicId ?? "",
    order: partner.order ?? 0,
    isPublished: partner.isPublished,
    translations: normalizedTranslations,
  }
}

function normalizePayload(form: PartnerFormState): PartnerClubInput {
  const translations: Record<AppLocale, PartnerTranslation> = {} as Record<AppLocale, PartnerTranslation>
  for (const code of SUPPORTED_LOCALES) {
    const current = form.translations[code] || {}
    translations[code] = {
      name: current.name?.trim() || undefined,
      city: current.city?.trim() || undefined,
      country: current.country?.trim() || undefined,
      tagline: current.tagline?.trim() || undefined,
      description: current.description?.trim() || undefined,
    }
  }

  return {
    slug: form.slug.trim() || undefined,
    websiteUrl: form.websiteUrl.trim() || undefined,
    logoUrl: form.logoUrl?.trim() || undefined,
    logoPublicId: form.logoPublicId?.trim() || undefined,
    coverUrl: form.coverUrl?.trim() || undefined,
    coverPublicId: form.coverPublicId?.trim() || undefined,
    order: Number.isFinite(form.order) ? form.order : 0,
    isPublished: form.isPublished,
    translations,
  }
}

function resolveName(partner: PartnerClubAdmin, locale: AppLocale) {
  return (
    partner.translations?.[locale]?.name ||
    partner.translations?.fr?.name ||
    partner.translations?.en?.name ||
    partner.slug
  )
}

export default function SuperAdminPartnersPage() {
  const locale = useLocale() as AppLocale
  const t = useTranslations("superAdminPartnersPage")
  const isRtl = locale === "ar"

  const { data: partners = [], isLoading } = usePartnerClubs()
  const createPartner = useCreatePartnerClub()
  const updatePartner = useUpdatePartnerClub()
  const deletePartner = useDeletePartnerClub()
  const uploadPartnerAsset = useUploadPartnerAsset()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeLocale, setActiveLocale] = useState<AppLocale>(locale)
  const [formState, setFormState] = useState<PartnerFormState>(buildEmptyForm(locale))
  const [editing, setEditing] = useState<PartnerClubAdmin | null>(null)

  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => {
      if (a.order !== b.order) return (a.order ?? 0) - (b.order ?? 0)
      return (a.slug || "").localeCompare(b.slug || "")
    })
  }, [partners])

  const resetForm = () => {
    setFormState(buildEmptyForm(locale))
    setActiveLocale(locale)
    setEditing(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (partner: PartnerClubAdmin) => {
    setEditing(partner)
    setFormState(buildFormFromPartner(partner, locale))
    setActiveLocale(locale)
    setDialogOpen(true)
  }

  const handleTranslationChange = (code: AppLocale, field: keyof PartnerTranslation, value: string) => {
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

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>, target: "logo" | "cover") => {
    const file = event.target.files?.[0]
    if (!file) return

    uploadPartnerAsset.mutate(
      { file, folder: target === "logo" ? "gymwatch/partners/logos" : "gymwatch/partners/covers" },
      {
        onSuccess: (res) => {
          setFormState((current) => ({
            ...current,
            ...(target === "logo"
              ? { logoUrl: res.url, logoPublicId: res.publicId }
              : { coverUrl: res.url, coverPublicId: res.publicId }),
          }))
          toast.success(t("toasts.uploadSuccess"))
        },
      },
    )
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
        await updatePartner.mutateAsync({ partnerId: editing.id, data: payload })
        toast.success(t("toasts.updated"))
      } else {
        await createPartner.mutateAsync(payload)
        toast.success(t("toasts.created"))
      }

      setDialogOpen(false)
      resetForm()
    } catch (error) {
      // Error toasts are handled in the hooks
      console.error("[partners][submit]", error)
    }
  }

  const handleDelete = (partnerId: string) => {
    deletePartner.mutate(partnerId, {
      onSuccess: () => toast.success(t("toasts.deleted")),
    })
  }

  const renderTranslationFields = (code: AppLocale) => {
    const translation = formState.translations[code] || { name: "", city: "", country: "", tagline: "", description: "" }
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("fields.name")}</Label>
            <Input
              value={translation.name ?? ""}
              onChange={(e) => handleTranslationChange(code, "name", e.target.value)}
              placeholder={t("placeholders.name")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("fields.tagline")}</Label>
            <Input
              value={translation.tagline ?? ""}
              onChange={(e) => handleTranslationChange(code, "tagline", e.target.value)}
              placeholder={t("placeholders.tagline")}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("fields.city")}</Label>
            <Input
              value={translation.city ?? ""}
              onChange={(e) => handleTranslationChange(code, "city", e.target.value)}
              placeholder={t("placeholders.city")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("fields.country")}</Label>
            <Input
              value={translation.country ?? ""}
              onChange={(e) => handleTranslationChange(code, "country", e.target.value)}
              placeholder={t("placeholders.country")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("fields.description")}</Label>
          <textarea
            value={translation.description ?? ""}
            onChange={(e) => handleTranslationChange(code, "description", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
            placeholder={t("placeholders.description")}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-8", isRtl ? "rtl text-right" : "ltr")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground max-w-3xl text-lg">{t("subtitle")}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              {t("actions.create")}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                {editing ? t("dialog.editTitle") : t("dialog.createTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("fields.slug")}</Label>
                  <Input
                    value={formState.slug}
                    onChange={(e) => setFormState((current) => ({ ...current, slug: e.target.value }))}
                    placeholder="fitzone-casa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.website")}</Label>
                  <Input
                    value={formState.websiteUrl}
                    onChange={(e) => setFormState((current) => ({ ...current, websiteUrl: e.target.value }))}
                    placeholder="https://club.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("fields.order")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formState.order}
                    onChange={(e) => setFormState((current) => ({ ...current, order: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.published")}</Label>
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
                    <Switch
                      checked={formState.isPublished}
                      onCheckedChange={(checked) => setFormState((current) => ({ ...current, isPublished: checked }))}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formState.isPublished ? t("status.published") : t("status.draft")}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.localeTab")}</Label>
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
                  <Label>{t("fields.logo")}</Label>
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{t("upload.logo")}</p>
                      <p className="text-xs text-muted-foreground">{t("upload.hint")}</p>
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, "logo")}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadPartnerAsset.isPending}
                      className="gap-2 rounded-xl"
                    >
                      {uploadPartnerAsset.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      {formState.logoUrl ? t("upload.replace") : t("upload.cta")}
                    </Button>
                  </div>
                  {formState.logoUrl && (
                    <p className="text-xs text-muted-foreground break-all">{formState.logoUrl}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>{t("fields.cover")}</Label>
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{t("upload.cover")}</p>
                      <p className="text-xs text-muted-foreground">{t("upload.hint")}</p>
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, "cover")}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadPartnerAsset.isPending}
                      className="gap-2 rounded-xl"
                    >
                      {uploadPartnerAsset.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      {formState.coverUrl ? t("upload.replace") : t("upload.cta")}
                    </Button>
                  </div>
                  {formState.coverUrl && (
                    <p className="text-xs text-muted-foreground break-all">{formState.coverUrl}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t("fields.translations")}</p>
                    <p className="text-xs text-muted-foreground">{t("fields.translationHint")}</p>
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
                disabled={createPartner.isPending || updatePartner.isPending}
                className="rounded-xl"
              >
                {(createPartner.isPending || updatePartner.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? t("actions.save") : t("actions.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-border/60 bg-card/80 shadow-lg backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t("table.title")}</CardTitle>
            <CardDescription>{t("table.subtitle", { count: partners.length })}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 rounded-2xl border border-border/60 p-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
              <p className="text-lg font-semibold">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground">{t("empty.subtitle")}</p>
              <Button className="mt-4 rounded-xl" onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t("actions.create")}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.slug")}</TableHead>
                    <TableHead>{t("table.order")}</TableHead>
                    <TableHead>{t("table.updated")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPartners.map((partner) => {
                    const displayName = resolveName(partner, locale)
                    const updatedAt = partner.updatedAt ? new Date(partner.updatedAt) : null
                    return (
                      <TableRow key={partner.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{partner.translations?.[locale]?.tagline}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={partner.isPublished ? "default" : "secondary"} className="gap-1 rounded-xl">
                            {partner.isPublished ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {partner.isPublished ? t("status.published") : t("status.draft")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{partner.slug}</TableCell>
                        <TableCell>{partner.order ?? 0}</TableCell>
                        <TableCell className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarClock className="h-4 w-4" />
                          {updatedAt ? updatedAt.toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleEdit(partner)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            {t("actions.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-destructive hover:text-destructive"
                            onClick={() => handleDelete(partner.id)}
                            disabled={deletePartner.isPending}
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
    </div>
  )
}
