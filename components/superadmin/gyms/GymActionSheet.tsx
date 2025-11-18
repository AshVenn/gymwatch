'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useSuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'
import { GymTeam } from './GymDetailDialog/GymTeam'
import { GymPlans } from './GymDetailDialog/GymPlans'
import { GymSubscriptionSettings } from './GymDetailDialog/GymSubscriptionSettings'

type ActionType = 'team' | 'plans' | 'subscription'

const LABELS: Record<ActionType, { title: string; description: string }> = {
  team: {
    title: "Équipe admin",
    description: 'Ajoutez ou consultez les comptes administrateurs.',
  },
  plans: {
    title: "Plans d'abonnement",
    description: 'Gérez les offres proposées à cette salle.',
  },
  subscription: {
    title: "Paramètres d'abonnement",
    description: 'Ajustez le statut, la facturation et les exports.',
  },
}

type Props = {
  gymId: string | null
  type: ActionType | null
  onClose: () => void
}

export function GymActionSheet({ gymId, type, onClose }: Props) {
  const open = Boolean(gymId && type)
  const { data: gym, isLoading } = useSuperAdminGym(open ? gymId : null)

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full space-y-4 overflow-y-auto sm:max-w-xl">
        {type ? (
          <>
            <SheetHeader>
              <SheetTitle>{LABELS[type].title}</SheetTitle>
              <SheetDescription>{LABELS[type].description}</SheetDescription>
            </SheetHeader>

            {isLoading || !gym ? (
              <div className="py-10 text-center text-muted-foreground">Chargement…</div>
            ) : type === 'team' ? (
              <GymTeam gym={gym} />
            ) : type === 'plans' ? (
              <GymPlans gym={gym} />
            ) : (
              <GymSubscriptionSettings gym={gym} />
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
