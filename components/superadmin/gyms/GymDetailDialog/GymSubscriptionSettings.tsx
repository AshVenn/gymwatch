import { useEffect, useState } from 'react'
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
import { DatePicker } from '@/components/ui/date-picker'

type Props = {
  gym: SuperAdminGymDetail
}

const schema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
  plan: z.enum(['BASIC', 'PRO']),
  interval: z.enum(['MONTHLY', 'ANNUAL']),
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
      interval: gym.billingInterval,
      expiresAt: gym.subscriptionExpiresAt?.split('T')[0] ?? '',
      grace: gym.subscriptionGracePeriodDays,
      maxAdmins: gym.maxAdminAccounts,
    },
  })

  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    form.reset({
      status: gym.subscriptionStatus,
      plan: gym.subscriptionPlan,
      interval: gym.billingInterval,
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
        billingInterval: values.interval,
        subscriptionExpiresAt: values.expiresAt || null,
        subscriptionGracePeriodDays: values.grace,
        maxAdminAccounts: values.maxAdmins,
      },
    })
  }

  const downloadReport = async (format: 'excel' | 'pdf') => {
    try {
      setDownloading(format)
      const endpoint =
        format === 'excel'
          ? `/api/super-admin/reports/excel?scope=gym&gymId=${gym.id}`
          : `/api/super-admin/reports/pdf?scope=gym&gymId=${gym.id}`

      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Export impossible')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `gym-${gym.id}-${Date.now()}.${format}`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres d'abonnement</CardTitle>
        <CardDescription>Mettez à jour le plan ou la capacité.</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Status */}
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

            {/* Plan + Interval */}
            <div className="grid gap-4 md:grid-cols-2">
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
                        <SelectItem value="BASIC">Basic</SelectItem>
                        <SelectItem value="PRO">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facturation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Mensuel</SelectItem>
                        <SelectItem value="ANNUAL">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Expiration */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'expiration</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value || null}
                      onChange={field.onChange}
                      placeholder="Choisir une date"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Grace + Max Admins */}
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

            {/* Exports */}
            <div className="rounded-lg border border-dashed border-border/60 p-4">
              <p className="text-sm font-semibold">Exports du gymnase</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport('excel')}
                  disabled={downloading === 'excel'}
                >
                  {downloading === 'excel' ? 'Export...' : 'Rapport Excel'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport('pdf')}
                  disabled={downloading === 'pdf'}
                >
                  {downloading === 'pdf' ? 'Export...' : 'Rapport PDF'}
                </Button>
              </div>
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
