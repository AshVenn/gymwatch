"use client"

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const brandingSchema = z.object({
  supportEmail: z.string().email("Email invalide"),
  supportPhone: z.string().min(6, 'Numéro trop court'),
  brandColor: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Couleur hexadécimale attendue'),
})

const notificationsSchema = z.object({
  expiryReminder: z.boolean(),
  weeklyDigest: z.boolean(),
  incidentAlerts: z.boolean(),
  payoutReport: z.boolean(),
})

export default function SuperAdminSettingsPage() {
  const [pendingGeneral, startGeneral] = useTransition()
  const [pendingNotifications, startNotifications] = useTransition()

  const generalForm = useForm<z.infer<typeof brandingSchema>>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      supportEmail: 'support@gymwatch.ma',
      supportPhone: '+212 6 12 34 56 78',
      brandColor: '#5b4bff',
    },
  })

  const notificationsForm = useForm<z.infer<typeof notificationsSchema>>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      expiryReminder: true,
      weeklyDigest: true,
      incidentAlerts: true,
      payoutReport: false,
    },
  })

  const handleGeneralSubmit = (values: z.infer<typeof brandingSchema>) => {
    startGeneral(async () => {
      try {
        const response = await fetch('/api/super-admin/settings/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })

        if (!response.ok) throw new Error('Impossible de sauvegarder les paramètres')
        toast.success('Identité mise à jour')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur inattendue')
      }
    })
  }

  const handleNotificationsSubmit = (values: z.infer<typeof notificationsSchema>) => {
    startNotifications(async () => {
      try {
        const response = await fetch('/api/super-admin/settings/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })

        if (!response.ok) throw new Error("Impossible d'enregistrer les notifications")
        toast.success('Notifications mises à jour')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur inattendue')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Paramètres</h1>
        <p className="text-muted-foreground">Pilotez l’identité et les alertes de la plateforme GymWatch.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identité & support</CardTitle>
            <CardDescription>Coordonnées montrées aux clients et administrateurs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...generalForm}>
              <form className="space-y-4" onSubmit={generalForm.handleSubmit(handleGeneralSubmit)}>
                <FormField
                  control={generalForm.control}
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
                  control={generalForm.control}
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
                  control={generalForm.control}
                  name="brandColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur principale</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="#5b4bff" {...field} />
                      </FormControl>
                      <FormDescription>Utilisée sur la home et dans les e-mails marque blanche.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={pendingGeneral}>
                  {pendingGeneral ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications automatiques</CardTitle>
            <CardDescription>Alertes envoyées aux propriétaires et aux équipes internes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...notificationsForm}>
              <form className="space-y-4" onSubmit={notificationsForm.handleSubmit(handleNotificationsSubmit)}>
                <FormField
                  control={notificationsForm.control}
                  name="expiryReminder"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Alertes d’expiration</FormLabel>
                        <FormDescription>Prévenez les salles 10 jours avant la fin de leur abonnement.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={notificationsForm.control}
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
                  control={notificationsForm.control}
                  name="incidentAlerts"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Alertes critiques</FormLabel>
                        <FormDescription>Pannes d’API, erreurs de paiement, incidents sensibles.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={notificationsForm.control}
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

                <Button type="submit" className="w-full" disabled={pendingNotifications}>
                  {pendingNotifications ? 'Sauvegarde...' : 'Mettre à jour'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
