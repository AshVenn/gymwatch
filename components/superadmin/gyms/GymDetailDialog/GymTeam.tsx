'use client'

import { useEffect } from 'react'
import type { SuperAdminGymDetail } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { useTranslations } from 'next-intl'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateGymAdmin } from '@/app/[locale]/(dashboard)/super-admin/hooks'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type Props = {
  gym: SuperAdminGymDetail
}

type CreateAdminValues = {
  email: string
  firstName: string
  lastName: string
  password: string
  variantId?: string
}

export function GymTeam({ gym }: Props) {
  const t = useTranslations('superAdminGymTeam')
  const createAdmin = useCreateGymAdmin()

  const schema = z.object({
    email: z.string().email(t('validation.email')),
    firstName: z.string().min(2, t('validation.firstName')),
    lastName: z.string().min(2, t('validation.lastName')),
    password: z.string().min(6, t('validation.password')),
    variantId: z.string().optional(),
  })

  const form = useForm<CreateAdminValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', firstName: '', lastName: '', password: '', variantId: '' },
  })

  useEffect(() => {
    if (!createAdmin.isPending) {
      form.reset({ email: '', firstName: '', lastName: '', password: '', variantId: '' })
    }
  }, [createAdmin.isPending, form])

  const adminCount = gym.adminCount ?? gym.admins?.length ?? 0
  const safeMaxAdmins = Math.max(gym.maxAdminAccounts ?? 0, 0)
  const adminUsage = safeMaxAdmins > 0 ? Math.min(100, Math.round((adminCount / safeMaxAdmins) * 100)) : 0
  const capacityReached = safeMaxAdmins > 0 && adminCount >= safeMaxAdmins

  const onSubmit = (values: CreateAdminValues) => {
    const targetVariant =
      values.variantId ||
      gym.variants?.find((variant) => variant.isDefault)?.id ||
      gym.variants?.[0]?.id

    createAdmin.mutate(
      {
        gymId: gym.id,
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        gymVariantId: targetVariant ?? undefined,
      },
      {
        onSuccess: () => toast.success(t('toasts.created')),
        onError: (err: any) => toast.error(err?.message ?? t('errors.createFailed')),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('title', { used: adminCount, max: safeMaxAdmins || t('infinite') })}
        </CardTitle>
        <CardDescription>
          {t('capacityUsed')}{' '}
          <span className="font-semibold text-primary">{adminUsage}%</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${adminUsage}%` }} />
        </div>

        <div className="space-y-2 text-sm">
          {gym.admins?.length ? (
            gym.admins.map((admin) => (
              <div key={admin.id} className="rounded-md border border-border/60 bg-muted/40 p-3">
                <p className="font-medium">
                  {[admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email}
                </p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
                {admin.gymVariant?.name ? (
                  <p className="text-xs text-muted-foreground">
                    {t('labels.variant')}: {admin.gymVariant.name}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">{t('empty')}</p>
          )}
        </div>

        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <h3 className="text-sm font-semibold">{t('addTitle')}</h3>

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

            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.firstName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.lastName')}</FormLabel>
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
              name="variantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.variant')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('placeholders.defaultVariant')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(gym.variants ?? []).map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name} {variant.isDefault ? `(${t('labels.default')})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.tempPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {capacityReached ? (
              <p className="text-sm text-destructive">{t('capacityReached')}</p>
            ) : null}

            <Button type="submit" disabled={createAdmin.isPending || capacityReached || !form.formState.isValid}>
              {createAdmin.isPending ? t('actions.creating') : t('actions.add')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
