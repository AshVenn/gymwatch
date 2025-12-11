import type { SuperAdminGymDetail } from "@/app/[locale]/(dashboard)/super-admin/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  gym: SuperAdminGymDetail
}

const MAD = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 })

export function GymStats({ gym }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardDescription>Membres</CardDescription>
          <CardTitle className="text-3xl">{gym.memberCount}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Inscrits sur la plateforme</CardContent>
      </Card>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardDescription>Abonnements actifs</CardDescription>
          <CardTitle className="text-3xl">{gym.activeSubscriptions}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Synchronisés quotidiennement</CardContent>
      </Card>
      <Card className="h-full sm:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription>Revenus 30 jours</CardDescription>
          <CardTitle className="text-3xl">{MAD.format(gym.paymentsLast30Days ?? 0)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Paiements déclarés</CardContent>
      </Card>
    </div>
  )
}
