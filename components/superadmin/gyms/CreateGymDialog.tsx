'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useCreateGym, GymSubscriptionStatus, GymPlanTier, GymBillingInterval } from '@/app/(dashboard)/super-admin/hooks'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PLAN_PRICING } from '@/lib/subscription-plans'

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(6, 'Numero requis'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  tier: z.enum(['BASIC', 'PRO']),
  interval: z.enum(['MONTHLY', 'ANNUAL']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
  expiresAt: z.string().optional(),
  grace: z.coerce.number().min(0).max(30),
  maxAdmins: z.coerce.number().min(1),
  ownerEmail: z.string().email('Email invalide'),
  ownerPassword: z.string().min(8, 'Min. 8 caracteres'),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
})

type CreateGymValues = z.infer<typeof schema>

const defaultValues: CreateGymValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  tier: 'BASIC',
  interval: 'MONTHLY',
  status: 'ACTIVE',
  expiresAt: '',
  grace: 5,
  maxAdmins: 3,
  ownerEmail: '',
  ownerPassword: '',
  ownerFirstName: '',
  ownerLastName: '',
}

export function CreateGymDialog() {
  const [open, setOpen] = useState(false)
  const form = useForm<CreateGymValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const createGym = useCreateGym()

  const selectedTier = form.watch('tier') as GymPlanTier
  const selectedInterval = form.watch('interval') as GymBillingInterval
  const estimatedPrice = PLAN_PRICING[selectedTier][selectedInterval]

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    }
  }, [open, form])

  const onSubmit = (values: CreateGymValues) => {
    createGym.mutate(
      {
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        subscriptionPlan: values.tier as GymPlanTier,
        billingInterval: values.interval as GymBillingInterval,
        subscriptionStatus: values.status as GymSubscriptionStatus,
        subscriptionExpiresAt: values.expiresAt || undefined,
        subscriptionGracePeriodDays: values.grace,
        maxAdminAccounts: values.maxAdmins,
        owner: {
          email: values.ownerEmail,
          password: values.ownerPassword,
          firstName: values.ownerFirstName || 'Proprietaire',
          lastName: values.ownerLastName || values.name,
        },
      },
      {
        onSuccess: () => {
          form.reset(defaultValues)
          setOpen(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une salle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto space-y-6 rounded-2xl px-4 py-6 sm:px-8">
        <DialogHeader>
          <DialogTitle>Nouvelle salle</DialogTitle>
          <DialogDescription>Enregistrez une salle et son proprietaire.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telephone</FormLabel>
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
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tier"
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
                    <FormDescription>
                      Tarif estimatif: {estimatedPrice.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
                    </FormDescription>
                  </FormItem>
                )}
              />
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
                        <SelectItem value="EXPIRED">Expire</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jours de grace</FormLabel>
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
                    <FormLabel>Admins autorises</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email proprietaire</FormLabel>
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
                    <FormLabel>Mot de passe initial</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ownerFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prenom proprietaire</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom proprietaire</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={createGym.isPending}>
              {createGym.isPending ? 'Creation...' : 'Creer'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
