'use client'

import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type CalendarClass = {
  id: string
  title: string
  startAt: string
  endAt: string
  capacity: number
  confirmedCount?: number
  waitlistCount?: number
  gymVariant?: { id: string; name: string }
}

type Props = {
  weekStart: Date
  sessions: CalendarClass[]
  onSelect?: (id: string) => void
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

export function WeekCalendar({ weekStart, sessions, onSelect }: Props) {
  const locale = useLocale()
  const t = useTranslations("weekCalendar")
  const isRTL = locale === "ar"

  // Map next-intl locale -> browser locale
  const browserLocale =
    locale === "en" ? "en-GB" : locale === "ar" ? "ar-MA" : "fr-FR"

  const dayLabel = (date: Date) =>
    date.toLocaleDateString(browserLocale, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    })

  const toTime = (value: string) => {
    const date = new Date(value)
    return date.toLocaleTimeString(browserLocale, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    date.setHours(0, 0, 0, 0)
    return date
  })

  return (
    <div
      className="grid grid-cols-1 gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {days.map((day) => {
        const items = sessions
          .filter((session) => isSameDay(new Date(session.startAt), day))
          .sort(
            (a, b) =>
              new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
          )

        return (
          <div
            key={day.toISOString()}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {dayLabel(day)}
              </p>
              <span className="text-xs text-muted-foreground">
                {t("classesCount", { count: items.length })}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("noSessions")}
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((session) => {
                  const freeSpots = Math.max(
                    0,
                    session.capacity - (session.confirmedCount ?? 0),
                  )
                  const waitlist = session.waitlistCount ?? 0
                  const isFull = freeSpots === 0

                  return (
                    <button
                      key={session.id}
                      onClick={() => onSelect?.(session.id)}
                      className={cn(
                        "w-full rounded-xl border border-border/70 bg-card px-3 py-2 shadow-sm transition hover:border-primary/70",
                        onSelect ? "hover:-translate-y-px" : "",
                      )}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">
                          {session.title}
                        </p>
                        {session.gymVariant?.name ? (
                          <Badge variant="secondary">
                            {session.gymVariant.name}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {toTime(session.startAt)} — {toTime(session.endAt)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Badge variant={isFull ? "destructive" : "outline"}>
                          {isFull
                            ? t("full")
                            : t("spotsAvailable", { count: freeSpots })}
                        </Badge>
                        {waitlist > 0 ? (
                          <Badge variant="secondary">
                            {t("waitlistCount", { count: waitlist })}
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
