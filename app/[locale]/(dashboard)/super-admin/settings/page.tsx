"use client"

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, '8 caractères minimum'),
    newPassword: z.string().min(8, '8 caractères minimum'),
    confirmPassword: z.string().min(8, '8 caractères minimum'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function SuperAdminSettingsPage() {
  const [pendingPassword, startPasswordTransition] = useTransition()

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

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
          throw new Error(data.error || 'Impossible de changer le mot de passe')
        }
        toast.success('Mot de passe mis à jour. Vous allez être déconnecté.')
        passwordForm.reset()
        await signOut({ callbackUrl: '/login' })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur inattendue')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Paramétrage des plans</h1>
        <p className="text-muted-foreground">
          Ajustez les prix, la remise annuelle et les plafonds de plans par palier.
        </p>
      </div>

      <PlanSettingsForm />

      <Card>
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
          <CardDescription>Valide immédiatement et force la reconnexion.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form className="space-y-4" onSubmit={passwordForm.handleSubmit(submitPassword)}>
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe actuel</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
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
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
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
                    <FormLabel>Confirmer</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={pendingPassword}>
                {pendingPassword ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
