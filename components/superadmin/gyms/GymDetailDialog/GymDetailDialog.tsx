'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'
import { GymStats } from './GymStats'
import { GymAnalytics } from './GymAnalytics'
import { Badge } from '@/components/ui/badge'
import { PlanModuleList } from '../PlanModules'
import { getPlanFeatures } from '@/lib/subscription-plans'

const PLAN_LABEL: Record<string, string> = {
  BASIC: 'Basic',
  PRO: 'Pro',
  COMPLEX: 'Complex',
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
  const variantTotal = gym?.variantCount ?? gym?.variants?.length ?? 0
  const planFeatures = gym ? gym.planFeatures ?? getPlanFeatures(gym.subscriptionPlan) : undefined

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto space-y-6 rounded-2xl bg-card px-4 py-6 sm:px-8">
        {isLoading || !gym ? (
          <div className="py-12 text-center text-muted-foreground">Chargement des details...</div>
        ) : (
          <>
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2">
                {gym.name}
                {gym.isDemo ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">DEMO</span>
                ) : null}
              </DialogTitle>

              <DialogDescription className="text-pretty text-sm">
                {gym.city ?? 'Localisation inconnue'}
                {gym.country ? `, ${gym.country}` : ''} {' - '}
                Plan {PLAN_LABEL[gym.subscriptionPlan] ?? gym.subscriptionPlan} {' - '}
                {INTERVAL_LABEL[gym.billingInterval] ?? gym.billingInterval} {' - '}
                {gym.subscriptionPrice.toLocaleString('fr-MA', {
                  style: 'currency',
                  currency: 'MAD',
                })}
                {' - '}
                {gym.variantMode === 'MULTI' ? 'Multi-salles' : 'Mono-salle'} ({variantTotal} variante(s))
                {gym.isDemo && gym.demoEndsAt
                  ? ` - Demo jusqu'au ${new Date(gym.demoEndsAt).toLocaleDateString('fr-FR')}`
                  : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Variantes du gym</p>
                <span className="text-xs text-muted-foreground">
                  {gym.variantCount ?? gym.variants?.length ?? 0} variante(s)
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {gym.variants?.length ? (
                  gym.variants.map((variant) => (
                    <Badge key={variant.id} variant={variant.isDefault ? 'secondary' : 'outline'}>
                      {variant.name} {variant.isDefault ? '(defaut)' : ''} - {variant.slug}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune variante enregistree</p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <Badge variant="outline">{gym.variantMode === 'MULTI' ? 'Multi-salles' : 'Mono-salle'}</Badge>
                <Badge variant="outline">{variantTotal} variante(s)</Badge>
                <Badge variant="secondary">
                  Plan {PLAN_LABEL[gym.subscriptionPlan] ?? gym.subscriptionPlan}
                </Badge>
              </div>
              <PlanModuleList features={planFeatures} />
            </div>

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
