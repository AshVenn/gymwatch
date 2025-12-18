"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

import { useSuperAdminGym, useConvertDemoGym } from "@/app/[locale]/(dashboard)/super-admin/hooks"
import { GymStats } from "./GymStats"
import { GymAnalytics } from "./GymAnalytics"
import { PlanModuleList } from "../PlanModules"
import { getPlanFeatures } from "@/lib/subscription-plans"

type Props = {
  gymId: string | null
  onClose: () => void
}

const PLAN_FALLBACK: Record<string, string> = {
  BASIC: "Basic",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
}

const INTERVAL_FALLBACK: Record<string, string> = {
  MONTHLY: "mensuel",
  ANNUAL: "annuel",
}

export function GymDetailDialog({ gymId, onClose }: Props) {
  const t = useTranslations("superAdminGymDetail")
  const locale = useLocale()

  const open = Boolean(gymId)
  const { data: gym, isLoading } = useSuperAdminGym(gymId)
  const convertDemo = useConvertDemoGym()

  const variantTotal = gym?.variantCount ?? gym?.variants?.length ?? 0

  const planLabel = useMemo(() => {
    if (!gym) return ""
    return t(`plan.${gym.subscriptionPlan}` as any, {
      fallback: PLAN_FALLBACK[gym.subscriptionPlan] ?? gym.subscriptionPlan,
    })
  }, [gym, t])

  const intervalLabel = useMemo(() => {
    if (!gym) return ""
    return t(`interval.${gym.billingInterval}` as any, {
      fallback: INTERVAL_FALLBACK[gym.billingInterval] ?? gym.billingInterval,
    })
  }, [gym, t])

  const typeLabel = useMemo(() => {
    if (!gym) return ""
    return gym.variantMode === "MULTI" ? t("type.multi") : t("type.single")
  }, [gym, t])

  const planFeatures = useMemo(() => {
    if (!gym) return undefined
    return gym.planFeatures ?? getPlanFeatures(gym.subscriptionPlan)
  }, [gym])

  const priceLabel = useMemo(() => {
    if (!gym) return ""
    return (gym.subscriptionPrice ?? 0).toLocaleString(locale === "ar" ? "ar-MA" : "fr-MA", {
      style: "currency",
      currency: "MAD",
    })
  }, [gym, locale])

  const demoEndsLabel = useMemo(() => {
    if (!gym?.isDemo || !gym.demoEndsAt) return null
    const date = new Date(gym.demoEndsAt)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(locale)
  }, [gym, locale])

  const capacityValue = typeof gym?.capacity === "number" && gym.capacity > 0 ? gym.capacity : null
  const variantCaps = (gym?.variants ?? []).map((variant) => ({
    ...variant,
    capacity: typeof variant.capacity === "number" && variant.capacity > 0 ? variant.capacity : null,
  }))

  const handleConvert = () => {
    if (!gym) return
    const confirmed = confirm(t("convert.confirm", { name: gym.name }))
    if (!confirmed) return
    convertDemo.mutate(
      { gymId: gym.id },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto space-y-6 rounded-2xl bg-card p-4 sm:p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
            {gym?.name ?? t("loadingTitle", { default: "Gym details" } as any)}
            {gym?.isDemo ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {t("demoPill")}
              </span>
            ) : null}
          </DialogTitle>

          <DialogDescription className="text-pretty text-xs sm:text-sm leading-relaxed">
            {gym
              ? `${gym.city ? gym.city : t("unknownLocation")}${gym.country ? `, ${gym.country}` : ""} - ${t("planPrefix")} ${planLabel} - ${intervalLabel} - ${priceLabel} - ${typeLabel} (${t("variantsCount", { count: variantTotal })})${demoEndsLabel ? ` - ${t("demoUntil", { date: demoEndsLabel })}` : ""}`
              : t("loadingSubtitle", { default: "Fetching gym data..." } as any)}
          </DialogDescription>

          {gym?.isDemo ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleConvert} disabled={convertDemo.isPending}>
                {convertDemo.isPending ? t("convert.pending") : t("convert.cta")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("convert.helper")}</p>
            </div>
          ) : null}
        </DialogHeader>

        {isLoading || !gym ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <Skeleton className="h-44 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("variantsTitle")}</p>
                <span className="text-xs text-muted-foreground">
                  {t("variantsCount", { count: gym.variantCount ?? gym.variants?.length ?? 0 })}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {gym.variants?.length ? (
                  gym.variants.map((variant) => (
                    <Badge key={variant.id} variant={variant.isDefault ? "secondary" : "outline"}>
                      {variant.name} {variant.isDefault ? `(${t("default")})` : ""} - {variant.slug}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">{t("noVariants")}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <Badge variant="outline">{typeLabel}</Badge>
                <Badge variant="outline">{t("variantsCount", { count: variantTotal })}</Badge>
                <Badge variant="secondary">
                  {t("planPrefix")} {planLabel}
                </Badge>
              </div>

              <PlanModuleList features={planFeatures} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t("capacity.title")}</p>
                  <Badge variant="secondary" className="rounded-full">
                    {capacityValue !== null ? t("capacity.value", { value: capacityValue }) : t("capacity.unset")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t("capacity.helper")}</p>

                <div className="rounded-lg border border-dashed border-border/60 bg-background/60 p-3 text-sm">
                  <p className="font-semibold">{t("capacity.gymTotal")}</p>
                  <p className="text-xs text-muted-foreground">
                    {capacityValue !== null ? t("capacity.value", { value: capacityValue }) : t("capacity.unset")}
                  </p>
                  {typeof gym.maxMembers === "number" ? (
                    <p className="text-xs text-muted-foreground">
                      {t("capacity.maxMembers", {
                        value: gym.maxMembers < 0 ? t("capacity.unlimited") : gym.maxMembers,
                      })}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {variantCaps.length ? (
                    variantCaps.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span>{variant.name}</span>
                          {variant.isDefault ? (
                            <Badge variant="outline" className="text-[11px]">
                              {t("default")}
                            </Badge>
                          ) : null}
                        </div>
                        <Badge variant="outline" className="border-border/70 text-[11px]">
                          {variant.capacity !== null ? t("capacity.value", { value: variant.capacity }) : t("capacity.unset")}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("capacity.noVariantCaps")}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t("team.title")}</p>
                  <Badge variant="outline" className="rounded-full border-border/60">
                    {t("team.count", { count: gym.admins?.length ?? 0 })}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {gym.owner ? (
                    <div className="rounded-lg border border-border/60 bg-card/70 p-3">
                      <p className="font-semibold">{t("team.owner")}</p>
                      <p className="text-muted-foreground">
                        {[gym.owner.firstName, gym.owner.lastName].filter(Boolean).join(" ") || gym.owner.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{gym.owner.email}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("team.noOwner")}</p>
                  )}

                  <div className="space-y-1">
                    {(gym.admins ?? []).slice(0, 4).map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold">
                            {[admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                        {admin.gymVariant?.name ? (
                          <Badge variant="outline" className="border-border/70 text-[11px]">
                            {admin.gymVariant.name}
                          </Badge>
                        ) : null}
                      </div>
                    ))}
                    {(gym.admins?.length ?? 0) === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("team.noAdmins")}</p>
                    ) : null}
                    {(gym.admins?.length ?? 0) > 4 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("team.remaining", { count: (gym.admins?.length ?? 0) - 4 })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <GymStats gym={gym} />

            <div className="space-y-6">
              <p className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {t("hint")}
              </p>
              <GymAnalytics gym={gym} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
