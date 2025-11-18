import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GymPlanTier, GymSubscriptionStatus } from '@prisma/client'
import { ReactNode } from 'react'

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
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Rechercher une salle ou un propriétaire"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as 'ALL' | GymSubscriptionStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actifs</SelectItem>
            <SelectItem value="SUSPENDED">Suspendus</SelectItem>
            <SelectItem value="EXPIRED">Expirés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(value) => onPlanChange(value as 'ALL' | GymPlanTier)}>
          <SelectTrigger>
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les plans</SelectItem>
            <SelectItem value="BASIC">Basic</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {actionSlot && <div className="mt-4 flex justify-end">{actionSlot}</div>}
    </div>
  )
}
