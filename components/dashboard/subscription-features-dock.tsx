"use client"

import * as React from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type SubscriptionDockItem = {
  id: string
  title: string
  description: string
  href: string
  available: boolean
  requiredPlan?: "PRO" | "ENTERPRISE"
  icon: React.ComponentType<{ className?: string }>
}

type Props = {
  items: SubscriptionDockItem[]
  upgradeHref: string
  className?: string
}

/**
 * Desktop: dock inside banner
 * Mobile: FAB → Sheet
 */
export function SubscriptionFeaturesDock({ items, upgradeHref, className }: Props) {
  const locale = useLocale()
  const t = useTranslations("dashboard.featureAccess")
  const isRTL = locale === "ar"

  const Arrow = isRTL ? ArrowLeft : ArrowRight
  const corner = isRTL ? "left-4" : "right-4"
  const includedCount = items.filter((x) => x.available).length

  return (
    <>
      {/* Desktop */}
      <div className={cn("hidden md:block", className)}>
        <div className={cn("absolute top-4 z-10", corner)}>
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl">
            <div className="hidden lg:flex items-center gap-2 px-2">
              <Sparkles className="h-4 w-4 text-white/90" />
              <span className="text-xs font-semibold text-white/90">
                {t("modulesCount", { active: includedCount, total: items.length })}
              </span>
            </div>

            <TooltipProvider delayDuration={150}>
              <div className="flex items-center gap-1">
                {items.map((item) => (
                  <FeatureIconPopover
                    key={item.id}
                    item={item}
                    upgradeHref={upgradeHref}
                    isRTL={isRTL}
                    Arrow={Arrow}
                  />
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <MobileFeaturesFab
          items={items}
          upgradeHref={upgradeHref}
          isRTL={isRTL}
          Arrow={Arrow}
        />
      </div>
    </>
  )
}

function FeatureIconPopover({
  item,
  upgradeHref,
  isRTL,
  Arrow,
}: {
  item: SubscriptionDockItem
  upgradeHref: string
  isRTL: boolean
  Arrow: typeof ArrowRight
}) {
  const t = useTranslations("dashboard.featureAccess")
  const Icon = item.icon
  const locked = !item.available

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={item.title}
              className={cn(
                "group relative grid h-10 w-10 place-items-center rounded-xl border transition",
                locked
                  ? "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/15",
              )}
            >
              <Icon className="h-5 w-5" />
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-black/10",
                  locked ? "bg-white/35" : "bg-emerald-300",
                )}
              />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {item.title}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side={isRTL ? "left" : "right"}
        align="start"
        className="w-[320px] rounded-2xl border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "border-border/60 bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]",
              locked ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {locked ? t("badges.notIncluded") : t("badges.included")}
          </Badge>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {locked ? (
            <Button asChild size="sm" variant="outline">
              <Link href={upgradeHref}>
                <Lock className="mr-2 h-4 w-4" />
                {t("actions.upgrade")}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link href={item.href}>
                {t("actions.open")}
                <Arrow className={cn("h-4 w-4", isRTL ? "mr-2" : "ml-2")} />
              </Link>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MobileFeaturesFab({
  items,
  upgradeHref,
  isRTL,
  Arrow,
}: {
  items: SubscriptionDockItem[]
  upgradeHref: string
  isRTL: boolean
  Arrow: typeof ArrowRight
}) {
  const t = useTranslations("dashboard.featureAccess")
  const includedCount = items.filter((x) => x.available).length
  const fabSide = isRTL ? "left-4" : "right-4"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("modulesTitle")}
          className={cn(
            "fixed bottom-4 z-50",
            fabSide,
            "grid h-12 w-12 place-items-center rounded-2xl border border-border/60 bg-background/90 shadow-xl backdrop-blur",
          )}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative"
          >
            <Sparkles className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {includedCount}
            </span>
          </motion.div>
        </button>
      </SheetTrigger>

      <SheetContent
        side={isRTL ? "left" : "right"}
        className="w-[92vw] max-w-105 p-0"
      >
        <SheetHeader className="border-b border-border/60 p-4">
          <SheetTitle className="text-base">{t("modulesTitle")}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {t("modulesCount", { active: includedCount, total: items.length })}
          </p>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <AnimatePresence>
            {items.map((item, idx) => {
              const Icon = item.icon
              const locked = !item.available
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "rounded-2xl border p-4",
                    locked
                      ? "border-dashed border-border/70 bg-muted/40"
                      : "border-border/70 bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border bg-muted/60">
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="flex-1">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>

                    {locked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="mt-3 flex justify-between">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-[0.16em]">
                      {locked ? t("badges.notIncluded") : t("badges.included")}
                    </Badge>

                    {locked ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={upgradeHref}>{t("actions.upgrade")}</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={item.href}>
                          {t("actions.open")}
                          <Arrow className={cn("h-4 w-4", isRTL ? "mr-2" : "ml-2")} />
                        </Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  )
}
