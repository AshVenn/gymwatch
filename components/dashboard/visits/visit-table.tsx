"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PaginationControls } from "@/components/dashboard/pagination-controls"

type VisitRow = {
  id: string
  memberName: string
  variantName: string
  checkIn: Date
  checkOut: Date | null
  durationMinutes: number
  isOverMaxDuration: boolean
  sessionLimitMinutes?: number | null
}

interface VisitTableProps {
  visits: VisitRow[]
  maxSessionMinutes?: number | null
  pagination?: {
    page: number
    pageCount: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
  }
}

export function VisitTable({ visits, maxSessionMinutes, pagination }: VisitTableProps) {
  const t = useTranslations("dashboard.presence")
  const locale = useLocale()

  const localeTag = useMemo(() => {
    if (locale === "en") return "en-US"
    if (locale === "ar") return "ar"
    return "fr-FR"
  }, [locale])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [localeTag],
  )

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [localeTag],
  )

  const formatTime = (value: Date | null) => {
    if (!value) return t("table.timePlaceholder")
    return timeFormatter.format(value)
  }

  const formatDuration = (minutesTotal: number) => {
    if (minutesTotal <= 0) return t("table.duration.instant")

    const hours = Math.floor(minutesTotal / 60)
    const minutes = minutesTotal % 60

    if (hours === 0) return t("table.duration.onlyMinutes", { minutes })
    if (minutes === 0) return t("table.duration.onlyHours", { hours })
    return t("table.duration.hoursMinutes", { hours, minutes })
  }

  if (!visits.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{t("table.emptyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("table.emptyBody")}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("table.title")}</CardTitle>

        {typeof maxSessionMinutes === "number" && maxSessionMinutes > 0 ? (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-xs text-muted-foreground">
            {t("table.maxDuration", { minutes: maxSessionMinutes })}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.headers.member")}</TableHead>
              <TableHead>{t("table.headers.location")}</TableHead>
              <TableHead>{t("table.headers.date")}</TableHead>
              <TableHead>{t("table.headers.checkIn")}</TableHead>
              <TableHead>{t("table.headers.checkOut")}</TableHead>
              <TableHead>{t("table.headers.status")}</TableHead>
              <TableHead>{t("table.headers.duration")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visits.map((visit) => {
              const checkInDate = dateFormatter.format(visit.checkIn)
              const checkOutLabel = visit.checkOut ? formatTime(visit.checkOut) : null

              const overLimit = Boolean(visit.isOverMaxDuration)
              const limitLabel =
                typeof visit.sessionLimitMinutes === "number" && visit.sessionLimitMinutes > 0
                  ? t("table.limit", { limit: visit.sessionLimitMinutes })
                  : null

              return (
                <TableRow key={visit.id} className={overLimit ? "bg-destructive/5" : undefined}>
                  <TableCell className="font-medium">{visit.memberName}</TableCell>

                  <TableCell>
                    <Badge variant="outline" className="border-border/70">
                      {visit.variantName}
                    </Badge>
                  </TableCell>

                  <TableCell>{checkInDate}</TableCell>
                  <TableCell>{formatTime(visit.checkIn)}</TableCell>

                  <TableCell>
                    {checkOutLabel ? (
                      checkOutLabel
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        {t("table.status.ongoing")}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {overLimit ? (
                      <div className="flex flex-col gap-1">
                        <Badge className="bg-destructive/15 text-destructive" variant="outline">
                          {t("table.status.exceeded")}
                        </Badge>
                        {limitLabel ? <span className="text-xs text-muted-foreground">{limitLabel}</span> : null}
                      </div>
                    ) : visit.checkOut ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {t("table.status.completed")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        {t("table.status.ongoing")}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className={overLimit ? "font-semibold text-destructive" : undefined}>
                    {formatDuration(visit.durationMinutes)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {pagination ? (
          <PaginationControls
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.onPageChange}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            showPageNumbers
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
