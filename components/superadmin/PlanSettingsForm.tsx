'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_ANNUAL_DISCOUNT, PLAN_PRICING, computePricingFromSettings } from '@/lib/subscription-plans'
import { usePlanSettings, useUpdatePlanSettings, type PlanSettingsInput } from '@/app/(dashboard)/super-admin/hooks'

const schema = z.object({
  basicMonthlyPrice: z.coerce.number().min(0),
  proMonthlyPrice: z.coerce.number().min(0),
  complexMonthlyPrice: z.coerce.number().min(0),
  annualDiscountPercent: z.coerce.number().min(0).max(90),
})

function formatCurrency(value: number) {
  return value.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })
}

export function PlanSettingsForm() {
  const { data, isLoading } = usePlanSettings()
  const updateSettings = useUpdatePlanSettings()

  const form = useForm<PlanSettingsInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      basicMonthlyPrice: PLAN_PRICING.BASIC.MONTHLY,
      proMonthlyPrice: PLAN_PRICING.PRO.MONTHLY,
      complexMonthlyPrice: PLAN_PRICING.COMPLEX.MONTHLY,
      annualDiscountPercent: DEFAULT_ANNUAL_DISCOUNT,
    },
  })

  useEffect(() => {
    if (data?.settings) {
      form.reset({
        basicMonthlyPrice: data.settings.basicMonthlyPrice,
        proMonthlyPrice: data.settings.proMonthlyPrice,
        complexMonthlyPrice: data.settings.complexMonthlyPrice,
        annualDiscountPercent: data.settings.annualDiscountPercent,
      })
    }
  }, [data, form])

  const watchedBasic = form.watch('basicMonthlyPrice')
  const watchedPro = form.watch('proMonthlyPrice')
  const watchedComplex = form.watch('complexMonthlyPrice')
  const watchedDiscount = form.watch('annualDiscountPercent')

  const previewPricing = useMemo(
    () =>
      computePricingFromSettings({
        basicMonthlyPrice: Number(watchedBasic) || 0,
        proMonthlyPrice: Number(watchedPro) || 0,
        complexMonthlyPrice: Number(watchedComplex) || 0,
        annualDiscountPercent: Number(watchedDiscount) || 0,
      }),
    [watchedBasic, watchedPro, watchedComplex, watchedDiscount],
  )

  const onSubmit = (values: PlanSettingsInput) => {
    updateSettings.mutate(values)
  }

  const lastUpdatedLabel = data?.settings.updatedAt
    ? new Date(data.settings.updatedAt).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Jamais'

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Plans et tarifs</CardTitle>
          <CardDescription>Définissez les prix mensuels et la remise appliquée aux paiements annuels.</CardDescription>
        </div>
        <Badge variant="outline" className="w-fit">
          Dernière mise à jour : {lastUpdatedLabel}
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-16 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        ) : (
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-sm">
                <p className="font-medium">Aperçu automatique</p>
                <p className="text-muted-foreground">
                  Les prix annuels se mettent à jour selon la remise appliquée ({watchedDiscount}%).
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {(['BASIC', 'PRO', 'COMPLEX'] as const).map((tier) => (
                    <div
                      key={tier}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
                    >
                      <div className="font-semibold">{tier}</div>
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(previewPricing[tier].MONTHLY)} / mois</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(previewPricing[tier].ANNUAL)} / an
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="basicMonthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Basic (mensuel)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proMonthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pro (mensuel)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complexMonthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complex (mensuel)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="annualDiscountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remise annuelle (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={90} step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">Les montants sont enregistrés en MAD</Badge>
                <Badge variant="outline">Réduction appliquée sur 12 mois</Badge>
                {updateSettings.isPending && <span>Mise à jour des plans...</span>}
              </div>

              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer les tarifs'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
