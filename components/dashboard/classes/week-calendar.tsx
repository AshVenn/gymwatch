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

const dayLabel = (date: Date) =>
  date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })

const toTime = (value: string) => {
  const date = new Date(value)
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

export function WeekCalendar({ weekStart, sessions, onSelect }: Props) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    date.setHours(0, 0, 0, 0)
    return date
  })

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {days.map((day) => {
        const items = sessions
          .filter((session) => isSameDay(new Date(session.startAt), day))
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

        return (
          <div key={day.toISOString()} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{dayLabel(day)}</p>
              <span className="text-xs text-muted-foreground">{items.length} cours</span>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Pas de cours ce jour</p>
            ) : (
              <div className="space-y-2">
                {items.map((session) => {
                  const freeSpots = Math.max(0, session.capacity - (session.confirmedCount ?? 0))
                  const waitlist = session.waitlistCount ?? 0
                  const isFull = freeSpots === 0

                  return (
                    <button
                      key={session.id}
                      onClick={() => onSelect?.(session.id)}
                      className={cn(
                        "w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-left shadow-sm transition hover:border-primary/70",
                        onSelect ? "hover:-translate-y-[1px]" : "",
                      )}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{session.title}</p>
                        {session.gymVariant?.name ? <Badge variant="secondary">{session.gymVariant.name}</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {toTime(session.startAt)} — {toTime(session.endAt)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Badge variant={isFull ? "destructive" : "outline"}>
                          {freeSpots > 0 ? `${freeSpots} place${freeSpots > 1 ? "s" : ""}` : "Complet"}
                        </Badge>
                        {waitlist > 0 ? <Badge variant="secondary">{waitlist} attente</Badge> : null}
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
