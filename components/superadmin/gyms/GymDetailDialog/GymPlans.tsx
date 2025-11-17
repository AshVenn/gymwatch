import type { SuperAdminGymDetail } from '@/app/(dashboard)/super-admin/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const MAD = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 })

type Props = {
  gym: SuperAdminGymDetail
}

export function GymPlans({ gym }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plans commercialisés</CardTitle>
        <CardDescription>Tarifs actuellement proposés par la salle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {gym.membershipPlans?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gym.membershipPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{plan.durationDays} jours</TableCell>
                  <TableCell>{MAD.format(plan.price)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'secondary' : 'outline'}>
                      {plan.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun plan configuré.</p>
        )}
      </CardContent>
    </Card>
  )
}
