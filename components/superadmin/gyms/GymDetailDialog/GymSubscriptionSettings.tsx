import { useEffect } from 'react'
import type { SuperAdminGymDetail } from '@/app/(dashboard)/super-admin/hooks'
import { useUpdateGym } from '@/app/(dashboard)/super-admin/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

type Props = {
  gym: SuperAdminGymDetail
}

const schema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
  plan: z.enum(['MONTHLY', 'YEARLY']),
  expiresAt: z.string().optional(),
  grace: z.coerce.number().min(0).max(30),
  maxAdmins: z.coerce.number().min(1),
})

type SubscriptionValues = z.infer<typeof schema>

export function GymSubscriptionSettings({ gym }: Props) {
  const updateGym = useUpdateGym()
  const form = useForm<SubscriptionValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: gym.subscriptionStatus,
      plan: gym.subscriptionPlan,
      expiresAt: gym.subscriptionExpiresAt?.split('T')[0] ?? '',
      grace: gym.subscriptionGracePeriodDays,
      maxAdmins: gym.maxAdminAccounts,
    },
  })

  useEffect(() => {
    form.reset({
      status: gym.subscriptionStatus,
      plan: gym.subscriptionPlan,
      expiresAt: gym.subscriptionExpiresAt?.split('T')[0] ?? '',
      grace: gym.subscriptionGracePeriodDays,
      maxAdmins: gym.maxAdminAccounts,
    })
  }, [gym, form])

  const onSubmit = (values: SubscriptionValues) => {
    updateGym.mutate({
      gymId: gym.id,
      data: {
        subscriptionStatus: values.status,
        subscriptionPlan: values.plan,
        subscriptionExpiresAt: values.expiresAt || null,
        subscriptionGracePeriodDays: values.grace,
        maxAdminAccounts: values.maxAdmins,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres d’abonnement</CardTitle>
        <CardDescription>Mettez à jour le plan ou la capacité.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                      <SelectItem value="EXPIRED">Expiré</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensuel</SelectItem>
                      <SelectItem value="YEARLY">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d’expiration</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="grace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jours de grâce</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxAdmins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admins autorisés</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={updateGym.isPending}>
              {updateGym.isPending ? 'Sauvegarde…' : 'Mettre à jour'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
