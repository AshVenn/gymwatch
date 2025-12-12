'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
import {
  DEFAULT_ANNUAL_DISCOUNT,
  DEFAULT_PLAN_LIMITS,
  PLAN_PRICING,
  computePricingFromSettings,
  isUnlimitedLimit,
} from '@/lib/subscription-plans'
import {
  usePlanSettings,
  useUpdatePlanSettings,
  type PlanSettingsInput,
} from '@/app/[locale]/(dashboard)/super-admin/hooks'

const schema = z.object({
  basicMonthlyPrice: z.coerce.number().min(0),
  proMonthlyPrice: z.coerce.number().min(0),
  enterpriseMonthlyPrice: z.coerce.number().min(0),
  annualDiscountPercent: z.coerce.number().min(0).max(90),
  basicPlanLimitPerVariant: z.coerce.number().int().min(-1),
  basicPlanLimitPerNetwork: z.coerce.number().int().min(-1),
  proPlanLimitPerVariant: z.coerce.number().int().min(-1),
  proPlanLimitPerNetwork: z.coerce.number().int().min(-1),
  enterprisePlanLimitPerVariant: z.coerce.number().int().min(-1),
  enterprisePlanLimitPerNetwork: z.coerce.number().int().min(-1),
})

function formatCurrency(value: number, locale: string) {
  // Keep MAD + 0 decimals like your app
  return value.toLocaleString(locale === 'ar' ? 'ar-MA' : 'fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  })
}

export function PlanSettingsForm() {
  const t = useTranslations('planSettings')
  const locale = useLocale()

  const { data, isLoading } = usePlanSettings()
  const updateSettings = useUpdatePlanSettings()

  const form = useForm<PlanSettingsInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      basicMonthlyPrice: PLAN_PRICING.BASIC.MONTHLY,
      proMonthlyPrice: PLAN_PRICING.PRO.MONTHLY,
      enterpriseMonthlyPrice: PLAN_PRICING.ENTERPRISE.MONTHLY,
      annualDiscountPercent: DEFAULT_ANNUAL_DISCOUNT,
      basicPlanLimitPerVariant: DEFAULT_PLAN_LIMITS.BASIC.perVariant,
      basicPlanLimitPerNetwork: DEFAULT_PLAN_LIMITS.BASIC.perNetwork,
      proPlanLimitPerVariant: DEFAULT_PLAN_LIMITS.PRO.perVariant,
      proPlanLimitPerNetwork: DEFAULT_PLAN_LIMITS.PRO.perNetwork,
      enterprisePlanLimitPerVariant: DEFAULT_PLAN_LIMITS.ENTERPRISE.perVariant,
      enterprisePlanLimitPerNetwork: DEFAULT_PLAN_LIMITS.ENTERPRISE.perNetwork,
    },
  })

  useEffect(() => {
    if (data?.settings) {
      form.reset({
        basicMonthlyPrice: data.settings.basicMonthlyPrice,
        proMonthlyPrice: data.settings.proMonthlyPrice,
        enterpriseMonthlyPrice: data.settings.enterpriseMonthlyPrice,
        annualDiscountPercent: data.settings.annualDiscountPercent,
        basicPlanLimitPerVariant: data.settings.basicPlanLimitPerVariant,
        basicPlanLimitPerNetwork: data.settings.basicPlanLimitPerNetwork,
        proPlanLimitPerVariant: data.settings.proPlanLimitPerVariant,
        proPlanLimitPerNetwork: data.settings.proPlanLimitPerNetwork,
        enterprisePlanLimitPerVariant: data.settings.enterprisePlanLimitPerVariant,
        enterprisePlanLimitPerNetwork: data.settings.enterprisePlanLimitPerNetwork,
      })
    }
  }, [data, form])

  const watchedBasic = form.watch('basicMonthlyPrice')
  const watchedPro = form.watch('proMonthlyPrice')
  const watchedEnterprise = form.watch('enterpriseMonthlyPrice')
  const watchedDiscount = form.watch('annualDiscountPercent')

  const previewPricing = useMemo(
    () =>
      computePricingFromSettings({
        basicMonthlyPrice: Number(watchedBasic) || 0,
        proMonthlyPrice: Number(watchedPro) || 0,
        enterpriseMonthlyPrice: Number(watchedEnterprise) || 0,
        annualDiscountPercent: Number(watchedDiscount) || 0,
      }),
    [watchedBasic, watchedPro, watchedEnterprise, watchedDiscount],
  )

  const formatLimit = (value?: number | null) => {
    if (isUnlimitedLimit(value)) return t('limits.unlimited')
    return t('limits.activeCount', { count: value ?? 0 })
  }

  const onSubmit = (values: PlanSettingsInput) => {
    updateSettings.mutate(values)
  }

  const lastUpdatedLabel = data?.settings.updatedAt
    ? new Date(data.settings.updatedAt).toLocaleString(
        locale === 'en' ? 'en-US' : locale === 'ar' ? 'ar-MA' : 'fr-FR',
        { dateStyle: 'medium', timeStyle: 'short' },
      )
    : t('meta.never')

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        <Badge variant="outline" className="w-fit">
          {t('meta.lastUpdated', { value: lastUpdatedLabel })}
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
                <p className="font-medium">{t('preview.title')}</p>
                <p className="text-muted-foreground">
                  {t('preview.subtitle', { discount: watchedDiscount })}
                </p>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {(['BASIC', 'PRO', 'ENTERPRISE'] as const).map((tier) => (
                    <div
                      key={tier}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
                    >
                      <div className="font-semibold">{tier}</div>
                      <div className="flex flex-col items-end">
                        <span>
                          {formatCurrency(previewPricing[tier].MONTHLY, locale)} {t('pricing.perMonth')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(previewPricing[tier].ANNUAL, locale)} {t('pricing.perYear')}
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
                      <FormLabel>{t('fields.basicMonthly')}</FormLabel>
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
                      <FormLabel>{t('fields.proMonthly')}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enterpriseMonthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.enterpriseMonthly')}</FormLabel>
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
                      <FormLabel>{t('fields.annualDiscount')}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={90} step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{t('badges.currency')}</Badge>
                <Badge variant="outline">{t('badges.discountRule')}</Badge>
                {updateSettings.isPending && <span>{t('saving.inline')}</span>}
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t('limits.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('limits.description')}</p>
                  </div>
                  <Badge variant="outline" className="border-dashed border-border/60 text-[11px]">
                    {t('limits.unlimitedHint')}
                  </Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {/* BASIC */}
                  <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-3">
                    <p className="text-sm font-semibold">Basic</p>
                    <FormField
                      control={form.control}
                      name="basicPlanLimitPerVariant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('limits.perVariant')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicPlanLimitPerNetwork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('limits.perNetwork')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t('limits.effective', {
                        perVariant: formatLimit(form.watch('basicPlanLimitPerVariant')),
                        perNetwork: formatLimit(form.watch('basicPlanLimitPerNetwork')),
                      })}
                    </p>
                  </div>

                  {/* PRO */}
                  <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-3">
                    <p className="text-sm font-semibold">Pro</p>
                    <FormField
                      control={form.control}
                      name="proPlanLimitPerVariant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('limits.perVariant')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="proPlanLimitPerNetwork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('limits.perNetwork')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t('limits.effective', {
                        perVariant: formatLimit(form.watch('proPlanLimitPerVariant')),
                        perNetwork: formatLimit(form.watch('proPlanLimitPerNetwork')),
                      })}
                    </p>
                  </div>

                  {/* ENTERPRISE */}
                  <div className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-3">
                    <p className="text-sm font-semibold">Enterprise</p>
                    <FormField
                      control={form.control}
                      name="enterprisePlanLimitPerVariant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('limits.perVariant')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enterprisePlanLimitPerNetwork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('limits.perNetwork')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t('limits.effective', {
                        perVariant: formatLimit(form.watch('enterprisePlanLimitPerVariant')),
                        perNetwork: formatLimit(form.watch('enterprisePlanLimitPerNetwork')),
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? t('saving.ctaPending') : t('saving.cta')}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
