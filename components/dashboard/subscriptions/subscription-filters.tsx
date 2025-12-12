'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SortOption = 'NEXT_EXPIRY' | 'RECENT_START' | 'PRICE_DESC'

export type QuickFilter = {
  label: string
  value: string
  count: number
}

type Props = {
  searchTerm: string
  onSearch: (value: string) => void
  filterStatus: string
  onStatusChange: (value: string) => void
  sortBy: SortOption
  onSortChange: (value: SortOption) => void
  quickFilters: QuickFilter[]
  onQuickFilter: (value: string) => void
}

export function SubscriptionFilters({
  searchTerm,
  onSearch,
  filterStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  quickFilters,
  onQuickFilter,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('subscriptions.filters')
  const isRTL = locale === 'ar'

  return (
    <div
      className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {/* Search */}
        <div>
          <Label htmlFor="subscription-search">{t('searchLabel')}</Label>
          <Input
            id="subscription-search"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
            className="mt-2"
          />
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="subscription-status">{t('statusLabel')}</Label>
          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger id="subscription-status" className="mt-2">
              <SelectValue placeholder={t('statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('statusAll')}</SelectItem>
              <SelectItem value="ACTIVE">{t('statusActive')}</SelectItem>
              <SelectItem value="EXPIRES_TODAY">
                {t('statusExpiresToday')}
              </SelectItem>
              <SelectItem value="EXPIRED">{t('statusExpired')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div>
          <Label htmlFor="subscription-sort">{t('sortLabel')}</Label>
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger id="subscription-sort" className="mt-2">
              <SelectValue placeholder={t('sortPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEXT_EXPIRY">
                {t('sortNextExpiry')}
              </SelectItem>
              <SelectItem value="RECENT_START">
                {t('sortRecentStart')}
              </SelectItem>
              <SelectItem value="PRICE_DESC">
                {t('sortPriceDesc')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick filters – labels déjà traduits côté appelant */}
      <div className="mt-4 flex flex-wrap gap-3">
        {quickFilters.map((filter) => {
          const isActive = filterStatus === filter.value
          return (
            <Button
              key={filter.value}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition',
                !isActive && 'bg-muted text-muted-foreground',
              )}
              onClick={() => onQuickFilter(filter.value)}
            >
              <span>{filter.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  isActive
                    ? 'bg-primary-foreground/20'
                    : 'bg-background',
                )}
              >
                {filter.count}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
