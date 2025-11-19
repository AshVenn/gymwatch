'use client'

import type { SuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteGym } from '@/app/(dashboard)/super-admin/hooks'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendue',
  EXPIRED: 'Expirée',
}

type Props = {
  gym: SuperAdminGym | null
  onClose: () => void
}

export function DeleteGymDialog({ gym, onClose }: Props) {
  const deleteGym = useDeleteGym()
  const open = Boolean(gym)
  const canDelete = gym ? gym.subscriptionStatus === 'SUSPENDED' || gym.subscriptionStatus === 'EXPIRED' : false

  const handleDelete = () => {
    if (!gym) return
    deleteGym.mutate(
      { gymId: gym.id },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !deleteGym.isPending) {
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la salle</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            {gym ? (
              <>
                <p>
                  Cette action supprimera définitivement{' '}
                  <span className="font-semibold text-foreground">{gym.name}</span> ainsi que toutes les données associées
                  (propriétaire, admins, plans, membres, paiements, inscriptions).
                </p>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                  <span>Statut actuel :</span>
                  <Badge variant={gym.subscriptionStatus === 'EXPIRED' ? 'destructive' : 'secondary'}>
                    {STATUS_LABEL[gym.subscriptionStatus] ?? gym.subscriptionStatus}
                  </Badge>
                </div>
                <p>
                  Seules les salles <strong>suspendues</strong> ou <strong>expirées</strong> peuvent être supprimées. Les
                  salles actives doivent être suspendues avant suppression.
                </p>
              </>
            ) : (
              'Confirmez la suppression de cette salle.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteGym.isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={!canDelete || deleteGym.isPending}
          >
            {deleteGym.isPending ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
