'use client'

import { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  GymPlanTier,
  GymSubscriptionStatus,
} from '@/app/[locale]/(dashboard)/super-admin/hooks'

type Props = {
  searchTerm: string
  onSearch: (value: string) => void
  statusFilter: 'ALL' | GymSubscriptionStatus
  onStatusChange: (value: 'ALL' | GymSubscriptionStatus) => void
  planFilter: 'ALL' | GymPlanTier
  onPlanChange: (value: 'ALL' | GymPlanTier) => void
  actionSlot?: ReactNode
}

export function GymFilters({
  searchTerm,
  onSearch,
  statusFilter,
  onStatusChange,
  planFilter,
  onPlanChange,
  actionSlot,
}: Props) {
  const t = useTranslations('superAdminGymFilters')

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusChange(value as 'ALL' | GymSubscriptionStatus)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('status.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('status.all')}</SelectItem>
            <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
            <SelectItem value="SUSPENDED">{t('status.suspended')}</SelectItem>
            <SelectItem value="EXPIRED">{t('status.expired')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={planFilter}
          onValueChange={(value) => onPlanChange(value as 'ALL' | GymPlanTier)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('plan.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('plan.all')}</SelectItem>
            <SelectItem value="BASIC">{t('plan.basic')}</SelectItem>
            <SelectItem value="PRO">{t('plan.pro')}</SelectItem>
            <SelectItem value="ENTERPRISE">{t('plan.enterprise')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionSlot && <div className="mt-4 flex justify-end">{actionSlot}</div>}
    </div>
  )
}
