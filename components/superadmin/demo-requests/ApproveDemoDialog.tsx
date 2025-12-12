'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, Sparkles } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type {
  DemoRequest,
  GymBillingInterval,
  GymPlanTier,
} from '@/app/[locale]/(dashboard)/super-admin/hooks'
import {
  useApproveDemoRequest,
  usePlanSettings,
} from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { PLAN_PRICING } from '@/lib/subscription-plans'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

function slugifyVariantName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'principal'
  )
}

type ApproveValues = {
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  country?: string
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
  billingInterval: 'MONTHLY' | 'ANNUAL'
  expiresAt?: string
  grace: number
  maxAdmins: number
  demoEndsAt?: string
  variantNames: string
  ownerEmail: string
  ownerPassword: string
  ownerFirstName?: string
  ownerLastName?: string
  adminEmail?: string
  adminPassword?: string
  adminFirstName?: string
  adminLastName?: string
  adminVariantSlug?: string
  resolutionNote?: string
}

const defaultValues: ApproveValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  plan: 'BASIC',
  billingInterval: 'MONTHLY',
  expiresAt: '',
  grace: 7,
  maxAdmins: 3,
  demoEndsAt: '',
  variantNames: 'Principal, Annexe',
  ownerEmail: '',
  ownerPassword: '',
  ownerFirstName: '',
  ownerLastName: '',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
  adminVariantSlug: '',
  resolutionNote: '',
}

type Props = {
  request: DemoRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApproved?: (payload: { requestId: string; createdGymId?: string }) => void
}

export function ApproveDemoDialog({
  request,
  open,
  onOpenChange,
  onApproved,
}: Props) {
  const t = useTranslations('superAdminApproveDemo')
  const locale = useLocale()

  const approveDemo = useApproveDemoRequest()
  const [prefilled, setPrefilled] = useState(false)
  const planSettings = usePlanSettings()

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('validation.nameRequired')),
        email: z.string().email(t('validation.invalidEmail')),
        phone: z.string().min(6, t('validation.phoneRequired')),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
        billingInterval: z.enum(['MONTHLY', 'ANNUAL']),
        expiresAt: z.string().optional(),
        grace: z.coerce.number().min(0).max(30),
        maxAdmins: z.coerce.number().min(1).max(20),
        demoEndsAt: z.string().optional(),
        variantNames: z.string().min(1, t('validation.atLeastOneVariant')),
        ownerEmail: z.string().email(t('validation.invalidEmail')),
        ownerPassword: z.string().min(8, t('validation.min8')),
        ownerFirstName: z.string().optional(),
        ownerLastName: z.string().optional(),
        adminEmail: z.string().email().optional(),
        adminPassword: z.string().min(8).optional(),
        adminFirstName: z.string().optional(),
        adminLastName: z.string().optional(),
        adminVariantSlug: z.string().optional(),
        resolutionNote: z.string().optional(),
      }),
    [t],
  )

  const form = useForm<ApproveValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const variantNamesValue = form.watch('variantNames')
  const parsedVariants = useMemo(() => {
    const raw = variantNamesValue
      ?.split(',')
      .map((name) => name.trim())
      .filter(Boolean)

    const base = raw?.length ? raw : [t('defaults.defaultVariant')]
    return base.map((name, index) => ({
      name,
      slug: slugifyVariantName(name),
      isDefault: index === 0,
    }))
  }, [t, variantNamesValue])

  useEffect(() => {
    if (request && open) {
      const defaultExpiration = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      form.reset({
        name: request.gymName,
        email: request.gymEmail,
        phone: request.phone ?? '',
        address: request.address ?? '',
        city: request.city ?? '',
        country: request.country ?? '',
        plan: request.plan,
        billingInterval: 'MONTHLY',
        expiresAt: defaultExpiration,
        grace: 7,
        maxAdmins: 3,
        demoEndsAt: defaultExpiration,
        variantNames: t('defaults.variantNames'),
        ownerEmail: request.adminEmail,
        ownerPassword: '',
        ownerFirstName: request.adminFirstName ?? '',
        ownerLastName: request.adminLastName ?? '',
        adminEmail: '',
        adminPassword: '',
        adminFirstName: '',
        adminLastName: '',
        adminVariantSlug: '',
        resolutionNote: '',
      })

      setPrefilled(true)
    } else if (!request) {
      form.reset(defaultValues)
      setPrefilled(false)
    }
  }, [form, open, request, t])

  const pricingTable = planSettings.data?.pricing ?? PLAN_PRICING

  const estimatedPrice = useMemo(() => {
    const plan = form.watch('plan') as GymPlanTier
    const interval = form.watch('billingInterval') as GymBillingInterval
    return pricingTable[plan][interval]
  }, [form, pricingTable])

  const intervalLabel = form.watch('billingInterval') === 'ANNUAL'
    ? t('labels.annual')
    : t('labels.monthly')

  const currencyLocale = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-US' : 'fr-MA'
  const estimatedPriceLabel = estimatedPrice.toLocaleString(currencyLocale, {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  })

  const onSubmit = (values: ApproveValues) => {
    if (!request) return

    approveDemo.mutate(
      {
        requestId: request.id,
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address || undefined,
          city: values.city || undefined,
          country: values.country || undefined,
          subscriptionPlan: values.plan as GymPlanTier,
          billingInterval: values.billingInterval as GymBillingInterval,
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiresAt: values.expiresAt || null,
          subscriptionGracePeriodDays: values.grace,
          maxAdminAccounts: values.maxAdmins,
          demoEndsAt: values.demoEndsAt || null,
          resolutionNote: values.resolutionNote || undefined,
          variants: parsedVariants.map((variant, index) => ({
            ...variant,
            isDefault: index === 0 || variant.isDefault,
          })),
          admins:
            values.adminEmail && values.adminPassword
              ? [
                  {
                    email: values.adminEmail,
                    password: values.adminPassword,
                    firstName: values.adminFirstName || t('defaults.adminFirstName'),
                    lastName: values.adminLastName || t('defaults.adminLastName'),
                    variantSlug:
                      values.adminVariantSlug || parsedVariants[0]?.slug,
                  },
                ]
              : undefined,
          owner: {
            email: values.ownerEmail,
            password: values.ownerPassword,
            firstName: values.ownerFirstName || t('defaults.ownerFirstName'),
            lastName: values.ownerLastName || values.name,
          },
        },
      },
      {
        onSuccess: (createdGym) => {
          onOpenChange(false)
          onApproved?.({
            requestId: request.id,
            createdGymId: (createdGym as any)?.id,
          })
          toast.success(t('toast.provisioned'))
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : t('toast.failed'),
          )
        },
      },
    )
  }

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>
                {t('labels.plan')} {form.watch('plan')} - {intervalLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span>{estimatedPriceLabel}</span>
            </div>
          </div>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.gymName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.phone')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.address')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.city')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.country')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="variantNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.variantsLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('fields.variantsPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {t('hints.firstVariantDefault')}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {parsedVariants.map((variant) => (
                        <Badge
                          key={variant.slug}
                          variant={variant.isDefault ? 'secondary' : 'outline'}
                        >
                          {variant.name}{' '}
                          {variant.isDefault ? `(${t('labels.default')})` : ''}
                        </Badge>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

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
                          <SelectItem value="BASIC">{t('plans.basic')}</SelectItem>
                          <SelectItem value="PRO">{t('plans.pro')}</SelectItem>
                          <SelectItem value="ENTERPRISE">{t('plans.enterprise')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.billing')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MONTHLY">{t('labels.monthly')}</SelectItem>
                          <SelectItem value="ANNUAL">{t('labels.annual')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.subscriptionExpiresAt')}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="demoEndsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.demoEndsAt')}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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

                <FormField
                  control={form.control}
                  name="resolutionNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.internalNote')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('fields.internalNotePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.ownerEmail')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.ownerPassword')}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ownerFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.ownerFirstName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.ownerLastName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border border-dashed border-border/60 p-4">
                <p className="text-sm font-semibold">{t('secondaryAdmin.title')}</p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('secondaryAdmin.email')}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('secondaryAdmin.password')}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="adminFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('secondaryAdmin.firstName')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('secondaryAdmin.lastName')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-3">
                  <FormField
                    control={form.control}
                    name="adminVariantSlug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('secondaryAdmin.variant')}</FormLabel>

                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={parsedVariants[0]?.name ?? t('labels.default')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parsedVariants.map((variant) => (
                              <SelectItem key={variant.slug} value={variant.slug}>
                                {variant.name}{' '}
                                {variant.isDefault ? `(${t('labels.default')})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {t('secondaryAdmin.defaultVariant', {
                            name: parsedVariants[0]?.name ?? t('defaults.defaultVariant'),
                          })}
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={approveDemo.isPending || !prefilled}
              >
                {approveDemo.isPending ? t('actions.creating') : t('actions.create')}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
