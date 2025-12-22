"use client"

import type * as React from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Sparkles } from "lucide-react"

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
  currentPlan: string
  upgradeHref: string
  className?: string
}

export function SubscriptionFeaturesDock({ items, currentPlan, upgradeHref, className }: Props) {
  const locale = useLocale()
  const t = useTranslations("dashboard.featureAccess")
  const isRTL = locale === "ar"

  const Arrow = isRTL ? ArrowLeft : ArrowRight
  const corner = isRTL ? "left-4" : "right-4"

  const enabledCount = items.filter((x) => x.available).length
  const disabledCount = items.length - enabledCount

  return (
    <>
      {/* Desktop */}
      <div className={cn("hidden md:block", className)}>
        <div className={cn("absolute top-4 z-10", corner)}>
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 p-2 backdrop-blur-2xl shadow-lg">
            <div className="hidden lg:flex items-center gap-2 px-2">
              <Sparkles className="h-4 w-4 text-white/95" />
              <span className="text-[13px] font-semibold text-white/95">
                {t("modulesCount", { active: enabledCount, total: items.length })}
              </span>
            </div>

            <TooltipProvider delayDuration={150}>
              <div className="flex items-center gap-1.5">
                {items.map((item) => (
                  <FeatureIconPopover
                    key={item.id}
                    item={item}
                    currentPlan={currentPlan}
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
          currentPlan={currentPlan}
          upgradeHref={upgradeHref}
          isRTL={isRTL}
          Arrow={Arrow}
          enabledCount={enabledCount}
          disabledCount={disabledCount}
        />
      </div>
    </>
  )
}

function FeatureIconPopover({
  item,
  currentPlan,
  upgradeHref,
  isRTL,
  Arrow,
}: {
  item: SubscriptionDockItem
  currentPlan: string
  upgradeHref: string
  isRTL: boolean
  Arrow: typeof ArrowRight
}) {
  const t = useTranslations("dashboard.featureAccess")
  const Icon = item.icon
  const locked = !item.available

  const iconGradient = locked ? "bg-white/5 border-white/12" : "bg-white/15 border-white/20"

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={item.title}
              className={cn(
                "group relative grid h-10 w-10 place-items-center rounded-xl border transition-all duration-200",
                iconGradient,
                locked ? "text-white/70 hover:bg-white/8" : "text-white hover:bg-white/20 active:scale-95",
              )}
            >
              <Icon className="h-5 w-5" />
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-1 ring-black/10",
                  locked ? "bg-white/30" : "bg-emerald-400",
                )}
              />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[13px] rounded-xl">
          {item.title}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side={isRTL ? "left" : "right"}
        align="start"
        className="w-[320px] rounded-2xl border-border/40 bg-background/98 p-4 shadow-xl backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[15px] font-semibold">{item.title}</p>
            <p className="text-[13px] text-muted-foreground leading-snug">{item.description}</p>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "border-border/40 bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-wider",
              locked ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {locked ? t("badges.notIncluded") : t("badges.included")}
          </Badge>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {locked ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-border/40 text-[15px] active:scale-95 bg-transparent"
            >
              <Link href={upgradeHref}>
                <Lock className="mr-2 h-4 w-4" />
                {t("actions.upgrade")}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost" className="h-9 rounded-xl text-[15px] active:scale-95">
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
  currentPlan,
  upgradeHref,
  isRTL,
  Arrow,
  enabledCount,
  disabledCount,
}: {
  items: SubscriptionDockItem[]
  currentPlan: string
  upgradeHref: string
  isRTL: boolean
  Arrow: typeof ArrowRight
  enabledCount: number
  disabledCount: number
}) {
  const t = useTranslations("dashboard.featureAccess")
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
            "grid h-14 w-14 place-items-center rounded-2xl border border-border/40 bg-background/95 shadow-xl backdrop-blur-xl active:scale-95 transition-transform duration-200",
          )}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
          >
            <Sparkles className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {enabledCount}
            </span>
          </motion.div>
        </button>
      </SheetTrigger>

      <SheetContent side={isRTL ? "left" : "right"} className="w-[92vw] max-w-md p-0 rounded-l-3xl">
        <SheetHeader className="border-b border-border/30 p-5">
          <SheetTitle className="text-[17px] font-semibold">{t("modulesTitle")}</SheetTitle>
          <p className="text-[13px] text-muted-foreground">
            {t("modulesCount", { active: enabledCount, total: items.length })}
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
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "rounded-2xl border p-4 transition-all duration-200",
                    locked ? "border-border/30 bg-muted/20" : "border-border/40 bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-border/40 bg-muted/40">
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="flex-1">
                      <p className="text-[15px] font-medium">{item.title}</p>
                      <p className="text-[13px] text-muted-foreground leading-snug">{item.description}</p>
                    </div>

                    {locked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="mt-3 flex justify-between">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider border-border/40 px-2 py-0.5"
                    >
                      {locked ? t("badges.notIncluded") : t("badges.included")}
                    </Badge>

                    {locked ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-[13px] active:scale-95 bg-transparent"
                      >
                        <Link href={upgradeHref}>{t("actions.upgrade")}</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost" className="h-8 rounded-xl text-[13px] active:scale-95">
                        <Link href={item.href}>
                          {t("actions.open")}
                          <Arrow className={cn("h-3.5 w-3.5", isRTL ? "mr-1.5" : "ml-1.5")} />
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
