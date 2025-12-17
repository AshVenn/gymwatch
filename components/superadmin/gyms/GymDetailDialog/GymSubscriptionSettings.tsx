'use client'

import { useEffect, useState } from 'react'
import type { SuperAdminGymDetail } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { useLocale, useTranslations } from 'next-intl'
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
  const t = useTranslations('superAdminGymSubscription')
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

  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null)
  const [processingInvoice, setProcessingInvoice] = useState<'download' | 'print' | null>(null)
  const [saving, setSaving] = useState(false)

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
          apply: false,
        }),
      })

      if (!response.ok) {
        const message = await response.text().catch(() => t('errors.invoiceGeneric'))
        throw new Error(message || t('errors.invoiceGeneric'))
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
        toast.success(t('toasts.invoicePrintReady'))
      } else {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `gym-renewal-${Date.now()}.pdf`
        anchor.click()
        toast.success(t('toasts.invoiceDownloaded'))
      }

      setTimeout(() => URL.revokeObjectURL(url), 1000)

      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gym', gym.id] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('errors.invoiceGeneric')
      toast.error(msg)
    } finally {
      setProcessingInvoice(null)
    }
  }

  const onSubmit = async (values: SubscriptionValues) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/super-admin/gyms/${gym.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionStatus: values.status,
          subscriptionPlan: values.plan,
          billingInterval: values.interval,
          subscriptionExpiresAt: values.expiresAt || null,
          subscriptionGracePeriodDays: values.grace,
          maxAdminAccounts: values.maxAdmins,
        }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((body as any)?.error || t('errors.saveFailed'))
      }

      toast.success(t('toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gym', gym.id] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('errors.saveFailed')
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const downloadReport = async (format: 'excel' | 'pdf') => {
    try {
      setDownloading(format)

      const endpoint =
        format === 'excel'
          ? `/api/super-admin/reports/excel?scope=gym&gymId=${gym.id}&locale=${locale}`
          : `/api/super-admin/reports/pdf?scope=gym&gymId=${gym.id}&locale=${locale}`

      const response = await fetch(endpoint)
      if (!response.ok) throw new Error(t('errors.exportFailed'))

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `gym-${gym.id}-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      anchor.click()
      URL.revokeObjectURL(url)

      toast.success(t('toasts.exportSuccess', { format: format.toUpperCase() }))
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('errors.exportFailed')
      toast.error(msg)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="text-sm font-semibold">{t('modulesActive')}</p>
          <PlanModuleBadges features={planFeatures} />
          <p className="mt-2 text-xs text-muted-foreground">
            {t(gym.variantMode === 'MULTI' ? 'variantMode.multi' : 'variantMode.mono', { count: variantTotal })}
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
                  <FormLabel>{t('fields.status')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
                      <SelectItem value="SUSPENDED">{t('status.suspended')}</SelectItem>
                      <SelectItem value="EXPIRED">{t('status.expired')}</SelectItem>
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
                    <FormLabel>{t('fields.plan')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BASIC">{t('plan.basic')}</SelectItem>
                        <SelectItem value="PRO">{t('plan.pro')}</SelectItem>
                        <SelectItem value="ENTERPRISE">{t('plan.enterprise')}</SelectItem>
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
                    <FormLabel>{t('fields.interval')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MONTHLY">{t('interval.monthly')}</SelectItem>
                        <SelectItem value="ANNUAL">{t('interval.annual')}</SelectItem>
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
                  <FormLabel>{t('fields.expiresAt')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={t('placeholders.pickDate')}
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
                    <FormLabel>{t('fields.graceDays')}</FormLabel>
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
                    <FormLabel>{t('fields.maxAdmins')}</FormLabel>
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
              <p className="text-sm font-semibold">{t('exports.title')}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport('excel')}
                  disabled={downloading === 'excel'}
                >
                  {downloading === 'excel' ? t('exports.loading') : t('exports.excel')}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport('pdf')}
                  disabled={downloading === 'pdf'}
                >
                  {downloading === 'pdf' ? t('exports.loading') : t('exports.pdf')}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:flex-wrap">
              <Button type="submit" className="w-full sm:w-auto" disabled={saving || processingInvoice !== null}>
                {saving ? t('invoice.saving') : t('invoice.save')}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={form.handleSubmit((values) => handleInvoice('download', values))}
                disabled={processingInvoice !== null || saving}
              >
                {processingInvoice === 'download' ? t('invoice.generating') : t('invoice.download')}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={form.handleSubmit((values) => handleInvoice('print', values))}
                disabled={processingInvoice !== null || saving}
              >
                {processingInvoice === 'print' ? t('invoice.preparing') : t('invoice.print')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
