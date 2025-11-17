import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="subscription-search">Rechercher</Label>
          <Input
            id="subscription-search"
            placeholder="Nom du membre ou plan..."
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="subscription-status">Statut</Label>
          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger id="subscription-status" className="mt-2">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="ACTIVE">Actifs</SelectItem>
              <SelectItem value="EXPIRES_TODAY">Expire aujourd'hui</SelectItem>
              <SelectItem value="EXPIRED">Expirés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="subscription-sort">Tri</Label>
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger id="subscription-sort" className="mt-2">
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEXT_EXPIRY">Échéance la plus proche</SelectItem>
              <SelectItem value="RECENT_START">Début le plus récent</SelectItem>
              <SelectItem value="PRICE_DESC">Tarif décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
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
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', isActive ? 'bg-primary-foreground/20' : 'bg-background')}>
                {filter.count}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
