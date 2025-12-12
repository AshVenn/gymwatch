'use client'

import { useEffect, useState } from 'react'
import type { SuperAdminGymDetail } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { useLocale } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PlanModuleBadges } from '../PlanModules'
import { getPlanFeatures } from '@/lib/subscription-plans'
import { toast } from 'sonner'

type Props = {
  gym: SuperAdminGymDetail
}

const schema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
  interval: z.enum(['MONTHLY', 'ANNUAL']),
  expiresAt: z.string().optional(),
  grace: z.coerce.number().min(0).max(30),
  maxAdmins: z.coerce.number().min(1),
})

type SubscriptionValues = z.infer<typeof schema>

export function GymSubscriptionSettings({ gym }: Props) {
  const locale = useLocale()
  const queryClient = useQueryClient()

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
  const planFeatures = gym.planFeatures ?? getPlanFeatures(gym.subscriptionPlan)
  const variantTotal = gym.variantCount ?? gym.variants?.length ?? 0

  const [downloading, setDownloading] = useState<string | null>(null)
  const [processingInvoice, setProcessingInvoice] = useState<'download' | 'print' | null>(null)

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

  const handleInvoice = async (mode: 'download' | 'print', values?: SubscriptionValues) => {
    const payload = values ?? form.getValues()
    try {
      setProcessingInvoice(mode)
      const response = await fetch(`/api/super-admin/gyms/${gym.id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionStatus: payload.status,
          subscriptionPlan: payload.plan,
          billingInterval: payload.interval,
          subscriptionExpiresAt: payload.expiresAt || null,
          subscriptionGracePeriodDays: payload.grace,
          maxAdminAccounts: payload.maxAdmins,
          locale,
        }),
      })

      if (!response.ok) {
        const message = await response.text().catch(() => 'Impossible de générer la facture')
        throw new Error(message || 'Impossible de générer la facture')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      if (mode === 'print') {
        const win = window.open(url)
        if (win) {
          win.onload = () => {
            win.focus()
            win.print()
          }
        }
      } else {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `gym-renewal-${Date.now()}.pdf`
        anchor.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gym', gym.id] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de facture'
      toast.error(message)
    } finally {
      setProcessingInvoice(null)
    }
  }

  const onSubmit = (values: SubscriptionValues) => handleInvoice('download', values)

  const downloadReport = async (format: 'excel' | 'pdf') => {
    try {
      setDownloading(format)
      const endpoint =
        format === 'excel'
          ? `/api/super-admin/reports/excel?scope=gym&gymId=${gym.id}&locale=${locale}`
          : `/api/super-admin/reports/pdf?scope=gym&gymId=${gym.id}&locale=${locale}`

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
        <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="text-sm font-semibold">Modules actifs</p>
          <PlanModuleBadges features={planFeatures} />
          <p className="mt-2 text-xs text-muted-foreground">
            {gym.variantMode === 'MULTI' ? 'Multi-salles' : 'Mono-salle'} - {variantTotal} variante(s)
          </p>
        </div>

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
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
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
                    <Input
                      type="date"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
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

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" className="w-full sm:w-auto" disabled={processingInvoice !== null}>
                {processingInvoice === 'download' ? 'Génération...' : 'Télécharger la facture'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={form.handleSubmit((values) => handleInvoice('print', values))}
                disabled={processingInvoice !== null}
              >
                {processingInvoice === 'print' ? 'Préparation...' : 'Imprimer'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
