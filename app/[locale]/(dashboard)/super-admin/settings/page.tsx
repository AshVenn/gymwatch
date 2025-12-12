'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PlanSettingsForm } from '@/components/superadmin/PlanSettingsForm'

export default function SuperAdminSettingsPage() {
  const t = useTranslations('superAdminSettings')
  const [pendingPassword, startPasswordTransition] = useTransition()

  /**
   * Zod schema (localized)
   */
  const passwordSchema = z
    .object({
      currentPassword: z.string().min(8, t('validation.min8')),
      newPassword: z.string().min(8, t('validation.min8')),
      confirmPassword: z.string().min(8, t('validation.min8')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    })

  type PasswordFormValues = z.infer<typeof passwordSchema>

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  /**
   * Submit password change
   */
  const submitPassword = (values: PasswordFormValues) => {
    startPasswordTransition(async () => {
      try {
        const response = await fetch('/api/super-admin/settings/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || t('toast.passwordError'))
        }

        toast.success(t('toast.passwordUpdated'))
        passwordForm.reset()
        await signOut({ callbackUrl: '/login' })
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.unexpectedError')
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Plan settings */}
      <PlanSettingsForm />

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle>{t('password.cardTitle')}</CardTitle>
          <CardDescription>{t('password.cardDescription')}</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...passwordForm}>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(submitPassword)}
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password.current')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password.new')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password.confirm')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={pendingPassword}
              >
                {pendingPassword
                  ? t('password.submitting')
                  : t('password.submit')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
