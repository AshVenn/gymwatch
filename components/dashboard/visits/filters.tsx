'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type VisitView = 'day' | 'period'

interface VisitFiltersProps {
  view: VisitView
  date: string
  from: string
  to: string
  search: string
  onViewChange: (next: VisitView) => void
  onDateChange: (next: string) => void
  onRangeChange: (range: { from: string; to: string }) => void
  onSearchChange: (value: string) => void
  onReset: () => void
}

export function VisitFilters({
  view,
  date,
  from,
  to,
  search,
  onViewChange,
  onDateChange,
  onRangeChange,
  onSearchChange,
  onReset,
}: VisitFiltersProps) {
  const locale = useLocale()
  const t = useTranslations('visits.filters')
  const isRTL = locale === 'ar'

  return (
    <div
      className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            className={
              view === 'day'
                ? 'bg-primary text-primary-foreground'
                : 'border-border/70'
            }
            onClick={() => onViewChange('day')}
          >
            {t('dayView')}
          </Button>
          <Button
            variant={view === 'period' ? 'default' : 'outline'}
            className={
              view === 'period'
                ? 'bg-primary text-primary-foreground'
                : 'border-border/70'
            }
            onClick={() => onViewChange('period')}
          >
            {t('periodView')}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onReset}
            className="border-border/70"
          >
            {t('reset')}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="visit-search">{t('searchLabel')}</Label>
          <Input
            id="visit-search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-2"
          />
        </div>

        {view === 'day' ? (
          <div>
            <Label htmlFor="visit-date">{t('dateLabel')}</Label>
            <Input
              id="visit-date"
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className="mt-2"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="visit-from">{t('fromLabel')}</Label>
              <Input
                id="visit-from"
                type="date"
                value={from}
                onChange={(event) =>
                  onRangeChange({ from: event.target.value, to })
                }
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="visit-to">{t('toLabel')}</Label>
              <Input
                id="visit-to"
                type="date"
                value={to}
                onChange={(event) =>
                  onRangeChange({ from, to: event.target.value })
                }
                className="mt-2"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
