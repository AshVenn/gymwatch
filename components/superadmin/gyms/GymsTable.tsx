'use client'

import { BarChart3, ClipboardList, FileCog, PenSquare, Trash2, Users } from 'lucide-react'
import type { SuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'
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
import { PaginationControls } from '@/components/dashboard/pagination-controls'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type GymAction = 'overview' | 'team' | 'plans' | 'subscription' | 'edit' | 'delete'

type Props = {
  gyms: SuperAdminGym[]
  isLoading: boolean
  pagination: {
    page: number
    pageCount: number
    pageSize: number
    setPage: (page: number) => void
  }
  totalItems: number
  onAction: (gymId: string, action: GymAction) => void
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendue',
  EXPIRED: 'Expirée',
}

const PLAN_LABEL: Record<string, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
}

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: 'mensuel',
  ANNUAL: 'annuel',
}

const ROW_ACTIONS: Array<{
  type: GymAction
  icon: React.ComponentType<{ size?: number }>
  label: string
  tone?: 'destructive'
}> = [
  { type: 'overview', icon: BarChart3, label: "Vue d'ensemble" },
  { type: 'team', icon: Users, label: 'Administrateurs' },
  { type: 'plans', icon: ClipboardList, label: 'Plans' },
  { type: 'subscription', icon: FileCog, label: 'Abonnement' },
  { type: 'edit', icon: PenSquare, label: 'Modifier' },
  { type: 'delete', icon: Trash2, label: 'Supprimer', tone: 'destructive' },
]

export function GymsTable({ gyms, isLoading, pagination, totalItems, onAction }: Props) {
  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Chargement des salles...</div>
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
                  Plan {PLAN_LABEL[gym.subscriptionPlan] ?? gym.subscriptionPlan} {' - '}
                  {INTERVAL_LABEL[gym.billingInterval] ?? gym.billingInterval} {' - '}
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
                    {gym.daysRemaining > 0 ? `${gym.daysRemaining} j restants` : 'Expirée'}
                  </p>
                )}
              </TableCell>

              <TableCell>
                <TooltipProvider>
                  <div className="flex justify-end gap-1">
                    {ROW_ACTIONS.map(({ type, icon: Icon, label, tone }) => (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-8 w-8',
                              tone === 'destructive' &&
                                'text-destructive hover:text-destructive focus-visible:text-destructive',
                            )}
                            onClick={() => onAction(gym.id, type)}
                            aria-label={label}
                          >
                            <Icon size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="border-t border-border/70 px-4 py-3">
        <PaginationControls
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          totalItems={totalItems}
        />
      </div>
    </div>
  )
}
