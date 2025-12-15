"use client"

import * as React from "react"
import Image from "next/image"
import { motion } from "motion/react"
import { ArrowLeft, ArrowRight, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { CometCard } from "@/components/home/comet-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export type CometCarouselItem = {
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  kicker?: string
  badgeText?: string
}

export type CometCardsCarouselLabels = {
  eyebrow?: string
  prevAriaLabel: string
  nextAriaLabel: string
  modalAriaLabel: string
  closeAriaLabel: string
}

type CometCardsCarouselProps = {
  items: CometCarouselItem[]
  labels: CometCardsCarouselLabels
  className?: string
  ariaLabel?: string
}

function getIsRTL() {
  if (typeof document === "undefined") return false
  return document.documentElement.dir === "rtl"
}

/**
 * Normalize scrollLeft so it behaves the same in LTR and RTL.
 * Returns a "progress from left edge" number in [0, max].
 */
function getNormalizedScrollLeft(el: HTMLElement, isRTL: boolean) {
  const max = el.scrollWidth - el.clientWidth
  const raw = el.scrollLeft

  if (!isRTL) return raw

  // RTL scrollLeft is inconsistent between browsers:
  // - "negative": 0 at right edge, negative as you scroll left
  // - "reverse": 0 at left edge, positive as you scroll right
  // - "default": max at left edge, 0 at right edge
  // This normalization covers the 3 modes.

  // If negative, convert: raw in [-max..0] -> [0..max]
  if (raw < 0) return -raw

  // If raw is between 0..max, could be "default" or "reverse".
  // Detect mode by trying to set scrollLeft and see behavior would be heavy;
  // A simpler robust approach: assume "default" if raw is near max at start.
  // We'll infer using current position: if raw > max / 2, likely "default".
  // Normalize both possibilities:
  // - default: right edge = 0, left edge = max  => normalized = max - raw
  // - reverse: left edge = 0, right edge = max => normalized = raw
  // Choose the one that fits typical starting state.
  // If user is at right edge in RTL, many browsers report 0. That yields:
  // default => normalized=max, reverse=>0. We want "right edge = 0 progress".
  // So we treat 0 as 0 progress (reverse) ONLY if raw is 0 and max is large? not safe.
  // Better: prioritize "default" because modern Chromium uses "negative", Firefox uses "negative",
  // Safari often uses "default". We'll handle raw===0 as right edge => normalized=0 by default-mode transform.
  // default-mode transform (max - raw) would give max, which is wrong at right edge.
  // So: special-case raw===0 -> 0.
  if (raw === 0) return 0

  // otherwise, use default-mode inversion
  return Math.max(0, Math.min(max, max - raw))
}

function scrollToNormalized(el: HTMLElement, normalized: number, isRTL: boolean) {
  const max = el.scrollWidth - el.clientWidth
  const clamped = Math.max(0, Math.min(max, normalized))

  if (!isRTL) {
    el.scrollTo({ left: clamped, behavior: "smooth" })
    return
  }

  // Convert normalized back to a workable scrollLeft
  // We'll target "negative" behavior when possible by using scrollTo + current browser handling.
  // Strategy:
  // - If browser supports negative, scrollLeft will become negative when setting a negative number.
  // - If not, setting positive will still move, and our normalization function will keep arrows correct.

  // Try negative first; if browser doesn't support it, it will clamp.
  el.scrollTo({ left: -clamped, behavior: "smooth" })
  // Also attempt default-mode inversion if negative doesn't move enough; harmless if ignored.
  el.scrollTo({ left: max - clamped, behavior: "smooth" })
}

export function CometCardsCarousel({ items, labels, className, ariaLabel = "Carousel" }: CometCardsCarouselProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)

  const [isRTL, setIsRTL] = React.useState(false)
  const [canPrev, setCanPrev] = React.useState(false)
  const [canNext, setCanNext] = React.useState(true)

  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const activeItem = activeIndex === null ? null : items[activeIndex]

  React.useEffect(() => {
    setIsRTL(getIsRTL())
  }, [])

  const updateArrows = React.useCallback(() => {
    const el = scrollerRef.current
    if (!el) return

    const max = el.scrollWidth - el.clientWidth
    const pos = getNormalizedScrollLeft(el, isRTL)

    setCanPrev(pos > 2)
    setCanNext(pos < max - 2)
  }, [isRTL])

  React.useEffect(() => {
    updateArrows()
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => updateArrows()
    const onResize = () => updateArrows()

    el.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)

    return () => {
      el.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
    }
  }, [updateArrows])

  const scrollByCards = (dir: "prev" | "next") => {
    const el = scrollerRef.current
    if (!el) return

    // HARD GUARD: never act if disabled
    if (dir === "prev" && !canPrev) return
    if (dir === "next" && !canNext) return

    const amount = Math.max(320, Math.floor(el.clientWidth * 0.9))
    const max = el.scrollWidth - el.clientWidth
    const pos = getNormalizedScrollLeft(el, isRTL)

    const target = dir === "prev" ? pos - amount : pos + amount
    const clamped = Math.max(0, Math.min(max, target))

    scrollToNormalized(el, clamped, isRTL)
  }

  const openModal = (idx: number) => {
    setActiveIndex(idx)
    setOpen(true)
  }

  return (
    <section className={cn("relative", className)} aria-label={ariaLabel}>
      {/* header controls */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary/70" />
          {labels.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{labels.eyebrow}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("bg-transparent", !canPrev && "pointer-events-none opacity-50")}
            onClick={() => scrollByCards("prev")}
            disabled={!canPrev}
            aria-disabled={!canPrev}
            aria-label={labels.prevAriaLabel}
          >
            {/* In RTL, flip icon so "previous" still points visually correct */}
            <ArrowLeft className={cn("h-4 w-4", isRTL && "-scale-x-100")} aria-hidden />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("bg-transparent", !canNext && "pointer-events-none opacity-50")}
            onClick={() => scrollByCards("next")}
            disabled={!canNext}
            aria-disabled={!canNext}
            aria-label={labels.nextAriaLabel}
          >
            <ArrowRight className={cn("h-4 w-4", isRTL && "-scale-x-100")} aria-hidden />
          </Button>
        </div>
      </div>

      {/* scroller (NO visible scrollbar) */}
      <div
        ref={scrollerRef}
        className={cn(
          "relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {items.map((item, idx) => (
          <motion.div
            key={`${item.title}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.35, delay: Math.min(idx * 0.03, 0.18) }}
            className="snap-start min-w-[320px] basis-[88%] sm:basis-[62%] lg:basis-[44%] xl:basis-[34%]"
          >
            <CometCard className="h-full">
              <button
                type="button"
                onClick={() => openModal(idx)}
                aria-label={`${labels.modalAriaLabel}: ${item.title}`}
                className={cn(
                  "group relative block h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-card/80 text-left",
                  "shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                <div className="relative aspect-16/10 w-full overflow-hidden">
                  <Image
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    fill
                    priority={idx < 2}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 90vw, (max-width: 1200px) 60vw, 420px"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/85 via-background/20 to-transparent" />
                  <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                  <div className="pointer-events-none absolute -left-14 -bottom-14 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />

                  {item.kicker ? (
                    <div className="absolute left-4 top-4 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-foreground">
                      {item.kicker}
                    </div>
                  ) : null}

                  {item.badgeText ? (
                    <div className="absolute right-4 top-4 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[0.7rem] font-semibold text-muted-foreground">
                      {item.badgeText}
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                      "bg-linear-to-t from-background/95 via-background/40 to-transparent"
                    )}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-base font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>

                  <span className="shrink-0 rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[0.7rem] text-muted-foreground">
                    ⤢
                  </span>
                </div>
              </button>
            </CometCard>
          </motion.div>
        ))}
      </div>

      {/* zoom modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-label={labels.modalAriaLabel}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[98vw] max-w-none -translate-x-1/2 -translate-y-1/2",
            "h-[92vh] sm:h-[94vh] md:h-[96vh]",
            "p-0 overflow-hidden",
            "border border-border/50 bg-background/70 backdrop-blur-2xl",
            "rounded-2xl sm:rounded-3xl",
            "shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
          )}
        >
          <DialogTitle className="sr-only">{activeItem?.title ?? labels.modalAriaLabel}</DialogTitle>

          <div className="relative h-full w-full">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={labels.closeAriaLabel}
              className={cn(
                "absolute right-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full",
                "border border-border/60 bg-background/70 text-foreground shadow-sm backdrop-blur",
                "hover:bg-background/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            <div className="relative h-full w-full">
              {activeItem ? (
                <Image src={activeItem.imageSrc} alt={activeItem.imageAlt} fill className="object-contain" sizes="100vw" priority />
              ) : null}

              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background/10 via-transparent to-background/40" />
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-[80px]" />
              <div className="pointer-events-none absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-primary/15 blur-[90px]" />

              <div className={cn("absolute inset-x-0 bottom-0 p-4 sm:p-6", "bg-background/55 backdrop-blur-xl", "border-t border-border/60")}>
                <div className="mx-auto flex max-w-4xl flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeItem?.kicker ? (
                      <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-foreground">
                        {activeItem.kicker}
                      </span>
                    ) : null}
                    {activeItem?.badgeText ? (
                      <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[0.7rem] font-semibold text-muted-foreground">
                        {activeItem.badgeText}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-lg font-bold tracking-tight sm:text-xl">{activeItem?.title}</p>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{activeItem?.description}</p>

                  <div className="pt-2">
                    <Button type="button" variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>
                      {labels.closeAriaLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
