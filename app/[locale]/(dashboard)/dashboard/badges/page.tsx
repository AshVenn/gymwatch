"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useLocale, useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import QRCode from "qrcode"
import { GripVertical, Printer, RefreshCw } from "lucide-react"

import { usePlanFeatures } from "@/app/hooks/use-plan-features"
import { useVariantOptions } from "@/app/hooks/use-variants"
import { VariantSelector } from "@/components/dashboard/variant-selector"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { buildFeatureAccessItems, LockedFeatureState } from "@/components/dashboard/feature-access-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { buildQrUrl } from "@/lib/qr"

type MemberItem = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  qrToken: string
  gymVariant?: { id: string; name: string; slug: string } | null
}

type MemberResponse = {
  items: MemberItem[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
} as const

const MM_TO_PX = 3.7795275591

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const reorder = (list: string[], fromId: string, toId: string) => {
  const fromIndex = list.indexOf(fromId)
  const toIndex = list.indexOf(toId)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list
  const next = [...list]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export default function BadgeBuilderPage() {
  const t = useTranslations("dashboard.badges")
  const tFeatureAccess = useTranslations("dashboard.featureAccess")
  const locale = useLocale()

  type FeatureTranslate = Parameters<typeof buildFeatureAccessItems>[0]["t"]
  const tFeatureAccessStrict = useMemo<FeatureTranslate>(
    () => ((key: string, values?: Record<string, unknown>) => tFeatureAccess(key as any, values as any)) as any,
    [tFeatureAccess],
  )

  const { data: session, status } = useSession()
  const {
    tier,
    hasQrTools,
    hasQrDownloads,
    hasAccessControl,
    hasPresence,
    hasCourses,
    hasExcelReports,
    hasMultiLocations,
  } = usePlanFeatures()

  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions({ allowAll: hasMultiLocations })

  const isMultiVariantGym = variants.length > 1
  const allowAllVariants = hasMultiLocations || !isMultiVariantGym

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)

  const [pageFormat, setPageFormat] = useState<keyof typeof PAGE_SIZES>("a4")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [marginMm, setMarginMm] = useState(8)
  const [qrSizeMm, setQrSizeMm] = useState(32)
  const [gapMm, setGapMm] = useState(6)
  const [nameSizeMm, setNameSizeMm] = useState(3.5)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedById, setSelectedById] = useState<Record<string, MemberItem>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const planLabel = tier === "ENTERPRISE" ? "Enterprise" : tier === "PRO" ? "Pro" : "Basic"

  const featureItems = useMemo(
    () =>
      buildFeatureAccessItems({
        hasAccessControl,
        hasPresence,
        hasCourses,
        hasExcelReports,
        t: tFeatureAccessStrict,
      }),
    [hasAccessControl, hasCourses, hasExcelReports, hasPresence, tFeatureAccessStrict],
  )

  const variantFilter =
    isGymAdmin && lockedVariantId
      ? lockedVariantId
      : selectedVariant && selectedVariant !== "all"
        ? selectedVariant
        : allowAllVariants
          ? null
          : (defaultVariantId ?? variants[0]?.id ?? null)

  useEffect(() => {
    setPage(1)
  }, [variantFilter, search])

  const membersQuery = useQuery<MemberResponse>({
    queryKey: ["badge-members", session?.user?.gymId, variantFilter, search, page],
    enabled: status === "authenticated" && Boolean(session?.user?.gymId) && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) params.set("variantId", variantFilter)
      if (search.trim()) params.set("q", search.trim())
      params.set("page", page.toString())
      params.set("limit", pageSize.toString())

      const response = await fetch(`/api/gym-team/members?${params.toString()}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || t("status.error"))
      }

      return {
        items: Array.isArray(body.items) ? (body.items as MemberItem[]) : [],
        total: typeof body.total === "number" ? body.total : 0,
        page: typeof body.page === "number" ? body.page : 1,
        pageSize: typeof body.pageSize === "number" ? body.pageSize : pageSize,
      }
    },
  })

  const memberItems = membersQuery.data?.items ?? []
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectedMembers = useMemo(
    () =>
      selectedIds
        .map((id) => selectedById[id])
        .filter((member): member is MemberItem => Boolean(member)),
    [selectedById, selectedIds],
  )

  const toggleMember = (member: MemberItem) => {
    setSelectedIds((prev) => {
      if (prev.includes(member.id)) {
        return prev.filter((id) => id !== member.id)
      }
      return [...prev, member.id]
    })
    setSelectedById((prev) => {
      if (prev[member.id]) {
        const { [member.id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [member.id]: member }
    })
  }

  const selectPageMembers = () => {
    setSelectedIds((prev) => {
      const next = [...prev]
      memberItems.forEach((member) => {
        if (!next.includes(member.id)) next.push(member.id)
      })
      return next
    })
    setSelectedById((prev) => {
      const next = { ...prev }
      memberItems.forEach((member) => {
        next[member.id] = member
      })
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds([])
    setSelectedById({})
  }

  const pageConfig = PAGE_SIZES[pageFormat]
  const pageWidthMm = orientation === "portrait" ? pageConfig.width : pageConfig.height
  const pageHeightMm = orientation === "portrait" ? pageConfig.height : pageConfig.width

  const labelHeightMm = nameSizeMm * 1.6 + 2
  const badgeHeightMm = qrSizeMm + labelHeightMm
  const usableWidth = Math.max(10, pageWidthMm - marginMm * 2)
  const usableHeight = Math.max(10, pageHeightMm - marginMm * 2)

  const columns = Math.max(1, Math.floor((usableWidth + gapMm) / (qrSizeMm + gapMm)))
  const rows = Math.max(1, Math.floor((usableHeight + gapMm) / (badgeHeightMm + gapMm)))
  const perPage = Math.max(1, columns * rows)

  const pages = useMemo(() => {
    const chunks: MemberItem[][] = []
    for (let i = 0; i < selectedMembers.length; i += perPage) {
      chunks.push(selectedMembers.slice(i, i + perPage))
    }
    return chunks
  }, [perPage, selectedMembers])

  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [qrLoading, setQrLoading] = useState(false)

  const qrPixelSize = Math.round(qrSizeMm * MM_TO_PX * 2)

  useEffect(() => {
    let active = true
    const build = async () => {
      if (!selectedMembers.length) {
        setQrMap({})
        return
      }
      setQrLoading(true)
      const next: Record<string, string> = {}
      await Promise.all(
        selectedMembers.map(async (member) => {
          const url = buildQrUrl(
            member.qrToken,
            locale,
            typeof window !== "undefined" ? window.location.origin : undefined,
          )
          const dataUrl = await QRCode.toDataURL(url, { width: qrPixelSize, margin: 2 })
          next[member.id] = dataUrl
        }),
      )
      if (active) {
        setQrMap(next)
        setQrLoading(false)
      }
    }
    build()
    return () => {
      active = false
    }
  }, [locale, qrPixelSize, selectedMembers])

  const totalItems = membersQuery.data?.total ?? memberItems.length
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount || 1)
    }
  }, [page, pageCount])

  const handleDragStart = (id: string) => {
    setDraggingId(id)
  }

  const handleDrop = (id: string) => {
    if (!draggingId) return
    setSelectedIds((prev) => reorder(prev, draggingId, id))
    setDraggingId(null)
    setDragOverId(null)
  }

  if (status === "loading" || variantsLoading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48 rounded-2xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <div className="text-sm font-medium text-destructive">{t("status.unauthenticated")}</div>
  }

  if (!hasQrTools) {
    return (
      <LockedFeatureState
        title={t("locked.title")}
        description={t("locked.description")}
        planLabel={planLabel}
        items={featureItems}
      />
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .badge-print-area,
          .badge-print-area * {
            visibility: visible !important;
          }
          .badge-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .badge-builder-controls {
            display: none !important;
          }
          .badge-drag-handle {
            display: none !important;
          }
          .badge-sheet {
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
        }
        @page {
          size: ${pageFormat === "a4" ? "A4" : "Letter"} ${orientation};
          margin: 0;
        }
      `}</style>

      <div className="flex flex-wrap items-start justify-between gap-4 badge-builder-controls">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <VariantSelector
            variants={variants}
            value={selectedVariant}
            onChange={setSelectedVariant}
            isGymAdmin={isGymAdmin}
            lockedVariantId={lockedVariantId}
            loading={variantsLoading}
            allowAll={allowAllVariants}
            className="w-full sm:w-auto"
          />
          <Button
            variant="outline"
            className="w-full rounded-2xl border-border/60 transition-all hover:scale-105 sm:w-auto"
            onClick={() => membersQuery.refetch()}
            disabled={membersQuery.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${membersQuery.isFetching ? "animate-spin" : ""}`} />
            {membersQuery.isFetching ? t("actions.refreshing") : t("actions.refresh")}
          </Button>
          <Button onClick={() => window.print()} disabled={!hasQrDownloads} className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" />
            {t("actions.print")}
          </Button>
        </div>
      </div>

      {!hasQrDownloads ? (
        <div className="badge-builder-controls rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-xs sm:text-sm text-amber-900 shadow-sm">
          {t("locked.description")}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="badge-builder-controls rounded-3xl border border-border/60 bg-card/90 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("selection.title")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("selection.selected", { count: selectedIds.length })}</p>
            <p className="text-xs text-muted-foreground">
              {t("selection.loaded", { loaded: memberItems.length, total: totalItems })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("filters.searchLabel")}</Label>
              <Input
                placeholder={t("filters.searchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={selectPageMembers} disabled={!memberItems.length}>
                {t("actions.selectPage")}
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection} disabled={!selectedIds.length}>
                {t("actions.clear")}
              </Button>
            </div>

            <div className="space-y-2">
              {membersQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : membersQuery.isError ? (
                <div className="text-sm text-destructive">{t("status.error")}</div>
              ) : memberItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("status.empty")}</div>
              ) : (
                memberItems.map((member) => {
                  const isSelected = selectedIdSet.has(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition",
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 hover:bg-muted/40",
                      )}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.email || member.gymVariant?.name || "-"}
                        </p>
                      </div>
                      <Badge variant={isSelected ? "default" : "outline"} className="text-[11px]">
                        {isSelected ? t("list.selected") : "+"}
                      </Badge>
                    </button>
                  )
                })
              )}
            </div>

            <PaginationControls
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="badge-builder-controls rounded-3xl border border-border/60 bg-card/90 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("layout.title")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("layout.pageSize")}</Label>
                <Select value={pageFormat} onValueChange={(value) => setPageFormat(value as typeof pageFormat)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("layout.pageSize")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">{t("pageSizeOptions.a4")}</SelectItem>
                    <SelectItem value="letter">{t("pageSizeOptions.letter")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("layout.orientation")}</Label>
                <Select value={orientation} onValueChange={(value) => setOrientation(value as typeof orientation)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("layout.orientation")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">{t("orientation.portrait")}</SelectItem>
                    <SelectItem value="landscape">{t("orientation.landscape")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("layout.margin")}</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="20"
                  value={marginMm}
                  onChange={(event) => setMarginMm(clamp(Number(event.target.value), 0, 20))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("layout.qrSize")}</Label>
                <Input
                  type="number"
                  step="1"
                  min="20"
                  max="60"
                  value={qrSizeMm}
                  onChange={(event) => setQrSizeMm(clamp(Number(event.target.value), 20, 60))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("layout.gap")}</Label>
                <Input
                  type="number"
                  step="1"
                  min="2"
                  max="20"
                  value={gapMm}
                  onChange={(event) => setGapMm(clamp(Number(event.target.value), 2, 20))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("layout.nameSize")}</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="2.5"
                  max="6"
                  value={nameSizeMm}
                  onChange={(event) => setNameSizeMm(clamp(Number(event.target.value), 2.5, 6))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("preview.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("preview.helper")}</p>
              <p className="text-xs text-muted-foreground">{t("preview.pages", { count: Math.max(pages.length, 1) })}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  {t("selection.empty")}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="badge-print-area space-y-8">
                    {pages.map((pageMembers, pageIndex) => (
                      <div
                        key={`page-${pageIndex}`}
                        className="badge-sheet mx-auto overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm"
                        style={{
                          width: `${pageWidthMm}mm`,
                          height: `${pageHeightMm}mm`,
                          padding: `${marginMm}mm`,
                          pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto",
                        }}
                      >
                        <div
                          className="grid"
                          style={{
                            gridTemplateColumns: `repeat(${columns}, ${qrSizeMm}mm)`,
                            columnGap: `${gapMm}mm`,
                            rowGap: `${gapMm}mm`,
                          }}
                        >
                          {pageMembers.map((member) => {
                            const name = `${member.firstName} ${member.lastName}`.trim()
                            const qrUrl = qrMap[member.id]
                            const isDragOver = dragOverId === member.id
                            return (
                              <div
                                key={member.id}
                                draggable={selectedMembers.length > 1}
                                onDragStart={() => handleDragStart(member.id)}
                                onDragOver={(event) => {
                                  event.preventDefault()
                                  setDragOverId(member.id)
                                }}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={(event) => {
                                  event.preventDefault()
                                  handleDrop(member.id)
                                }}
                                onDragEnd={() => {
                                  setDraggingId(null)
                                  setDragOverId(null)
                                }}
                                className={cn(
                                  "flex flex-col items-center justify-start rounded-xl border border-transparent bg-white/90",
                                  isDragOver ? "border-primary/60 bg-primary/5" : "hover:border-border/60",
                                )}
                                style={{ width: `${qrSizeMm}mm` }}
                              >
                                <div className="badge-drag-handle flex w-full items-center justify-center text-[10px] text-muted-foreground">
                                  <GripVertical className="h-3.5 w-3.5" />
                                </div>
                                <div
                                  className="flex items-center justify-center"
                                  style={{ width: `${qrSizeMm}mm`, height: `${qrSizeMm}mm` }}
                                >
                                  {qrUrl ? (
                                    <img
                                      src={qrUrl}
                                      alt={name}
                                      style={{ width: `${qrSizeMm}mm`, height: `${qrSizeMm}mm` }}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                      {qrLoading ? "..." : "QR"}
                                    </div>
                                  )}
                                </div>
                                <div
                                  className="mt-1 text-center font-semibold"
                                  style={{ fontSize: `${nameSizeMm}mm` }}
                                >
                                  {name}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
