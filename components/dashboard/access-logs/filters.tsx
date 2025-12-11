'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Option = { value: string; label: string }

interface AccessLogFiltersProps {
  search: string
  status: string
  source: string
  from?: string
  to?: string
  statusOptions: Option[]
  sourceOptions: Option[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSourceChange: (value: string) => void
  onDateChange: (range: { from?: string; to?: string }) => void
  onReset: () => void
}

export function AccessLogFilters({
  search,
  status,
  source,
  from,
  to,
  statusOptions,
  sourceOptions,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onDateChange,
  onReset,
}: AccessLogFiltersProps) {
  const t = useTranslations('dashboard.accessLogs.filters')

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="access-search">{t('searchLabel')}</Label>
          <Input
            id="access-search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="access-status">{t('statusLabel')}</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger id="access-status" className="mt-2">
              <SelectValue placeholder={t('allPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="access-source">{t('sourceLabel')}</Label>
          <Select value={source} onValueChange={onSourceChange}>
            <SelectTrigger id="access-source" className="mt-2">
              <SelectValue placeholder={t('allPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="access-from">{t('from')}</Label>
            <Input
              id="access-from"
              type="date"
              value={from ?? ''}
              onChange={(event) => onDateChange({ from: event.target.value, to })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="access-to">{t('to')}</Label>
            <Input
              id="access-to"
              type="date"
              value={to ?? ''}
              onChange={(event) => onDateChange({ from, to: event.target.value })}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onReset}>
          {t('reset')}
        </Button>
      </div>
    </div>
  )
}
