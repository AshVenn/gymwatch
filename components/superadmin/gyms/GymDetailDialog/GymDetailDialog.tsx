'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'
import { GymStats } from './GymStats'
import { GymTeam } from './GymTeam'
import { GymPlans } from './GymPlans'
import { GymAnalytics } from './GymAnalytics'
import { GymSubscriptionSettings } from './GymSubscriptionSettings'

type Props = {
  gymId: string | null
  onClose: () => void
}

export function GymDetailDialog({ gymId, onClose }: Props) {
  const open = Boolean(gymId)
  const { data: gym, isLoading } = useSuperAdminGym(gymId)

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-5xl space-y-6 bg-card text-card-foreground sm:max-h-[85vh] sm:overflow-y-auto">
        {isLoading || !gym ? (
          <div className="py-12 text-center text-muted-foreground">Chargement des détails…</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{gym.name}</DialogTitle>
              <DialogDescription>
                {gym.city ?? 'Localisation inconnue'}
                {gym.country ? `, ${gym.country}` : ''} · Plan {gym.subscriptionPlan === 'MONTHLY' ? 'mensuel' : 'annuel'}
              </DialogDescription>
            </DialogHeader>
            <GymStats gym={gym} />
            <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
              <div className="space-y-6">
                <GymTeam gym={gym} />
                <GymPlans gym={gym} />
              </div>
              <div className="space-y-6">
                <GymAnalytics gym={gym} />
                <GymSubscriptionSettings gym={gym} />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
