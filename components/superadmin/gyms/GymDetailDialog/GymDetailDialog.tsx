'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'
import { GymStats } from './GymStats'
import { GymAnalytics } from './GymAnalytics'

const PLAN_LABEL: Record<string, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
}

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: 'mensuel',
  ANNUAL: 'annuel',
}

type Props = {
  gymId: string | null
  onClose: () => void
}

export function GymDetailDialog({ gymId, onClose }: Props) {
  const open = Boolean(gymId)
  const { data: gym, isLoading } = useSuperAdminGym(gymId)

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto space-y-6 rounded-2xl bg-card px-4 py-6 sm:px-8">
        {isLoading || !gym ? (
          <div className="py-12 text-center text-muted-foreground">Chargement des détails...</div>
        ) : (
          <>
            <DialogHeader className="space-y-3">
              <DialogTitle>{gym.name}</DialogTitle>

              <DialogDescription className="text-pretty text-sm">
                {gym.city ?? 'Localisation inconnue'}
                {gym.country ? `, ${gym.country}` : ''} {' - '}
                Plan {PLAN_LABEL[gym.subscriptionPlan] ?? gym.subscriptionPlan} {' - '}
                {INTERVAL_LABEL[gym.billingInterval] ?? gym.billingInterval} {' - '}
                {gym.subscriptionPrice.toLocaleString('fr-MA', {
                  style: 'currency',
                  currency: 'MAD',
                })}
              </DialogDescription>
            </DialogHeader>

            <GymStats gym={gym} />

            <div className="space-y-6">
              <p className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Utilisez les actions rapides du tableau pour gérer l'équipe, les plans et les paramètres
                d'abonnement de cette salle.
              </p>
              <GymAnalytics gym={gym} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
