import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'
import { PaginationControls } from '@/components/dashboard/pagination-controls'

type Props = {
  gyms: SuperAdminGym[]
  isLoading: boolean
  pagination: {
    page: number
    pageCount: number
    setPage: (page: number) => void
  }
  totalItems: number
  onOpenDetails: (gymId: string) => void
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
}

const PLAN_LABEL: Record<string, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
}

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: 'mensuel',
  ANNUAL: 'annuel',
}

export function GymsTable({ gyms, isLoading, pagination, totalItems, onOpenDetails }: Props) {
  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Chargement des salles…</div>
  }

  if (!gyms.length) {
    return <div className="py-10 text-center text-muted-foreground">Aucune salle ne correspond à vos filtres.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Membres</TableHead>
            <TableHead>Abonnements</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {gyms.map((gym) => (
            <TableRow key={gym.id}>
              <TableCell>
                <div className="font-medium">{gym.name}</div>
                <p className="text-xs text-muted-foreground">{gym.email}</p>
              </TableCell>

              <TableCell>
                <Badge variant={gym.subscriptionStatus === 'EXPIRED' ? 'destructive' : 'secondary'}>
                  {STATUS_LABEL[gym.subscriptionStatus] ?? gym.subscriptionStatus}
                </Badge>

                <p className="text-xs text-muted-foreground">
                  Plan {PLAN_LABEL[gym.subscriptionPlan] ?? gym.subscriptionPlan} •{' '}
                  {INTERVAL_LABEL[gym.billingInterval] ?? gym.billingInterval} •{' '}
                  {gym.subscriptionPrice.toLocaleString('fr-MA', {
                    style: 'currency',
                    currency: 'MAD',
                  })}
                </p>
              </TableCell>

              <TableCell>{gym.memberCount}</TableCell>
              <TableCell>{gym.activeSubscriptions}</TableCell>

              <TableCell>
                <p>
                  {gym.subscriptionExpiresAt
                    ? new Date(gym.subscriptionExpiresAt).toLocaleDateString('fr-FR')
                    : '—'}
                </p>

                {typeof gym.daysRemaining === 'number' && (
                  <p className="text-xs text-muted-foreground">
                    {gym.daysRemaining > 0
                      ? `${gym.daysRemaining} j restants`
                      : 'Expiré'}
                  </p>
                )}
              </TableCell>

              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => onOpenDetails(gym.id)}>
                  Voir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="border-t border-border/70 px-4 py-3">
        <PaginationControls
          page={pagination.page}
          pageCount={pagination.pageCount}
          onPageChange={pagination.setPage}
          totalItems={totalItems}
        />
      </div>
    </div>
  )
}
