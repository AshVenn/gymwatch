'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, Sparkles } from 'lucide-react'

import type { DemoRequest, GymBillingInterval, GymPlanTier } from '@/app/(dashboard)/super-admin/hooks'
import { useApproveDemoRequest } from '@/app/(dashboard)/super-admin/hooks'
import { PLAN_PRICING } from '@/lib/subscription-plans'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

function slugifyVariantName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'principal'
}

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(6, 'Telephone requis'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  plan: z.enum(['BASIC', 'PRO']),
  billingInterval: z.enum(['MONTHLY', 'ANNUAL']),
  expiresAt: z.string().optional(),
  grace: z.coerce.number().min(0).max(30),
  maxAdmins: z.coerce.number().min(1).max(20),
  demoEndsAt: z.string().optional(),
  variantNames: z.string().min(1, 'Au moins une variante'),
  ownerEmail: z.string().email('Email invalide'),
  ownerPassword: z.string().min(8, 'Min. 8 caracteres'),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
  adminFirstName: z.string().optional(),
  adminLastName: z.string().optional(),
  adminVariantSlug: z.string().optional(),
  resolutionNote: z.string().optional(),
})

type ApproveValues = z.infer<typeof schema>

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
}

export function ApproveDemoDialog({ request, open, onOpenChange }: Props) {
  const approveDemo = useApproveDemoRequest()
  const [prefilled, setPrefilled] = useState(false)

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

    const base = raw?.length ? raw : ['Principal']
    return base.map((name, index) => ({
      name,
      slug: slugifyVariantName(name),
      isDefault: index === 0,
    }))
  }, [variantNamesValue])

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
        variantNames: 'Principal, Annexe',
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
  }, [form, open, request])

  const estimatedPrice = useMemo(() => {
    const plan = form.watch('plan') as GymPlanTier
    const interval = form.watch('billingInterval') as GymBillingInterval
    return PLAN_PRICING[plan][interval]
  }, [form])

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
                    firstName: values.adminFirstName || 'Admin',
                    lastName: values.adminLastName || 'Demo',
                    variantSlug: values.adminVariantSlug || parsedVariants[0]?.slug,
                  },
                ]
              : undefined,
          owner: {
            email: values.ownerEmail,
            password: values.ownerPassword,
            firstName: values.ownerFirstName || 'Proprietaire',
            lastName: values.ownerLastName || values.name,
          },
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Compte demo provisionne')
        },
      },
    )
  }

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creer le compte demo</DialogTitle>
          <DialogDescription>
            Les champs sont pre-remplis depuis la demande. Ajustez si necessaire avant de confirmer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Plan {form.watch('plan')} - {form.watch('billingInterval') === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span>{estimatedPrice.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
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
                      <FormLabel>Nom de la salle</FormLabel>
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

              <div className="grid gap-4 md:grid-cols-2">
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
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
                      <FormLabel>Pays</FormLabel>
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
                    <FormLabel>Variantes du gym (separees par des virgules)</FormLabel>
                    <FormControl>
                      <Input placeholder="Principal, Premium, Budget" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      La premiere variante est appliquee par defaut aux nouveaux comptes.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {parsedVariants.map((variant) => (
                        <Badge key={variant.slug} variant={variant.isDefault ? 'secondary' : 'outline'}>
                          {variant.name} {variant.isDefault ? '(defaut)' : ''}
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
                  name="billingInterval"
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
                      <FormLabel>Expiration abonnement</FormLabel>
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
                      <FormLabel>Fin de la demo</FormLabel>
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
                      <FormLabel>Jours de grace</FormLabel>
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
                      <FormLabel>Admins autorises</FormLabel>
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
                      <FormLabel>Note interne (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="Access envoye par mail..." {...field} />
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
                      <FormLabel>Mot de passe proprietaire</FormLabel>
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
                      <FormLabel>Prenom proprietaire</FormLabel>
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
                      <FormLabel>Nom proprietaire</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border border-dashed border-border/60 p-4">
                <p className="text-sm font-semibold">Ajouter un admin secondaire (optionnel)</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email admin</FormLabel>
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
                        <FormLabel>Mot de passe admin</FormLabel>
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
                        <FormLabel>Prenom admin</FormLabel>
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
                        <FormLabel>Nom admin</FormLabel>
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
                        <FormLabel>Variante assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={parsedVariants[0]?.name ?? 'Par defaut'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parsedVariants.map((variant) => (
                              <SelectItem key={variant.slug} value={variant.slug}>
                                {variant.name} {variant.isDefault ? '(defaut)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Par defaut : {parsedVariants[0]?.name ?? 'Principal'}
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={approveDemo.isPending || !prefilled}>
                {approveDemo.isPending ? 'Creation en cours...' : 'Creer le compte demo'}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
