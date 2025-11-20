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
  EXPIRED: 'Expiree',
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
    return <div className="py-10 text-center text-muted-foreground">Aucune salle ne correspond a vos filtres.</div>
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
                <div className="flex items-center gap-2 font-medium">
                  {gym.name}
                  {gym.isDemo ? (
                    <Badge variant="outline" className="border-primary/60 text-primary">
                      DEMO
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{gym.email}</p>
              </TableCell>

              <TableCell>
                <Badge variant={gym.subscriptionStatus === 'EXPIRED' ? 'destructive' : 'secondary'}>
                  {STATUS_LABEL[gym.subscriptionStatus] ?? gym.subscriptionStatus}
                </Badge>

                <p className="text-xs text-muted-foreground">
                  {gym.isDemo && <span className="font-semibold text-primary">Demo </span>}
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

                {gym.isDemo && gym.demoEndsAt ? (
                  <p className="text-xs text-primary">Demo jusqu'au {new Date(gym.demoEndsAt).toLocaleDateString('fr-FR')}</p>
                ) : null}

                {typeof gym.daysRemaining === 'number' && (
                  <p className="text-xs text-muted-foreground">
                    {gym.daysRemaining > 0 ? `${gym.daysRemaining} j restants` : 'Expiree'}
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

      <div className="border-t border-border/70 px-4 py-4">
        {gyms.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {totalItems} salle{totalItems > 1 ? 's' : ''} total
            </span>
            <span className="text-xs uppercase tracking-[0.3em]">
              Page {pagination.page} / {pagination.pageCount}
            </span>
          </div>
        )}
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
