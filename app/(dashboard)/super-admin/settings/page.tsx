"use client"

import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'

const settingsSchema = z.object({
  supportEmail: z.string().email('Email invalide'),
  supportPhone: z.string().min(6, 'Numéro trop court'),
  brandColor: z.string().min(4, 'Couleur hex attendue'),
  expiryReminder: z.boolean(),
  weeklyDigest: z.boolean(),
  incidentAlerts: z.boolean(),
  payoutReport: z.boolean(),
  gymSettingsIntervalMs: z.coerce.number().int().min(5_000).max(3_600_000),
  userSettingsIntervalMs: z.coerce.number().int().min(5_000).max(3_600_000),
})

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

type SettingsFormValues = z.infer<typeof settingsSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

const defaults: SettingsFormValues = {
  supportEmail: 'support@gymwatch.ma',
  supportPhone: '+212 6 12 34 56 78',
  brandColor: '#5b4bff',
  expiryReminder: true,
  weeklyDigest: true,
  incidentAlerts: true,
  payoutReport: false,
  gymSettingsIntervalMs: 60_000,
  userSettingsIntervalMs: 30_000,
}

export default function SuperAdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [pendingSettings, startSettingsTransition] = useTransition()
  const [pendingPassword, startPasswordTransition] = useTransition()

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaults,
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/super-admin/settings')
        if (!response.ok) throw new Error('Impossible de charger les paramètres')
        const data = await response.json()
        if (active) {
          settingsForm.reset({
            supportEmail: data.supportEmail ?? defaults.supportEmail,
            supportPhone: data.supportPhone ?? defaults.supportPhone,
            brandColor: data.brandColor ?? defaults.brandColor,
            expiryReminder: Boolean(data.expiryReminder),
            weeklyDigest: Boolean(data.weeklyDigest),
            incidentAlerts: Boolean(data.incidentAlerts),
            payoutReport: Boolean(data.payoutReport),
            gymSettingsIntervalMs: Number(data.gymSettingsIntervalMs ?? defaults.gymSettingsIntervalMs),
            userSettingsIntervalMs: Number(data.userSettingsIntervalMs ?? defaults.userSettingsIntervalMs),
          })
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur de chargement')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [settingsForm])

  const submitSettings = (values: SettingsFormValues) => {
    startSettingsTransition(async () => {
      try {
        const response = await fetch('/api/super-admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!response.ok) throw new Error('Impossible de sauvegarder les paramètres')
        toast.success('Paramètres mis à jour')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur inattendue')
      }
    })
  }

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <Skeleton key={idx} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Paramètres</h1>
        <p className="text-muted-foreground">Pilotez l'identité, les intervalles et la sécurité de la plateforme.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-3 text-sm">
        <Badge variant="outline">
          Intervalle gym: {settingsForm.watch('gymSettingsIntervalMs') ?? defaults.gymSettingsIntervalMs} ms
        </Badge>
        <Badge variant="outline">
          Intervalle utilisateur: {settingsForm.watch('userSettingsIntervalMs') ?? defaults.userSettingsIntervalMs} ms
        </Badge>
        <span className="text-xs text-muted-foreground">Valeurs chargees depuis la base</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identité & alertes</CardTitle>
            <CardDescription>Coordonnées, couleurs et notifications automatiques.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...settingsForm}>
              <form className="space-y-4" onSubmit={settingsForm.handleSubmit(submitSettings)}>
                <FormField
                  control={settingsForm.control}
                  name="supportEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email support</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="support@gymwatch.ma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={settingsForm.control}
                  name="supportPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone support</FormLabel>
                      <FormControl>
                        <Input placeholder="+212 ..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={settingsForm.control}
                  name="brandColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur principale</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="#5b4bff" {...field} />
                      </FormControl>
                      <FormDescription>Utilisée sur la home et les e-mails marque blanche.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    control={settingsForm.control}
                    name="gymSettingsIntervalMs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalle maj salle (ms)</FormLabel>
                        <FormControl>
                          <Input type="number" min={5000} max={3600000} {...field} />
                        </FormControl>
                        <FormDescription>Fenêtre minimale entre deux mises à jour du gym.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="userSettingsIntervalMs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalle maj profil (ms)</FormLabel>
                        <FormControl>
                          <Input type="number" min={5000} max={3600000} {...field} />
                        </FormControl>
                        <FormDescription>Anti-spam sur les préférences utilisateur.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={settingsForm.control}
                    name="expiryReminder"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Alertes d'expiration</FormLabel>
                          <FormDescription>Prévenir les salles 10 jours avant la fin de l'abonnement.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="weeklyDigest"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Digest hebdomadaire</FormLabel>
                          <FormDescription>Résumé des nouveaux membres, revenus et incidents.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="incidentAlerts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Alertes critiques</FormLabel>
                          <FormDescription>Pannes d'API, erreurs de paiement, incidents sensibles.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="payoutReport"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Rapport de versement</FormLabel>
                          <FormDescription>Envoi automatique du rapport détaillé des paiements.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={pendingSettings}>
                  {pendingSettings ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

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
    </div>
  )
}
