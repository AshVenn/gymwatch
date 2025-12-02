import { useEffect } from 'react'
import type { SuperAdminGymDetail } from '@/app/(dashboard)/super-admin/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateGymAdmin } from '@/app/(dashboard)/super-admin/hooks'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  gym: SuperAdminGymDetail
}

const schema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(2, 'Prenom invalide'),
  lastName: z.string().min(2, 'Nom invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
  variantId: z.string().optional(),
})

type CreateAdminValues = z.infer<typeof schema>

export function GymTeam({ gym }: Props) {
  const createAdmin = useCreateGymAdmin()
  const form = useForm<CreateAdminValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', firstName: '', lastName: '', password: '', variantId: '' },
  })

  useEffect(() => {
    if (!createAdmin.isPending) {
      form.reset({ email: '', firstName: '', lastName: '', password: '', variantId: '' })
    }
  }, [createAdmin.isPending, form])

  const safeMaxAdmins = Math.max(gym.maxAdminAccounts ?? 0, 0)
  const adminUsage =
    safeMaxAdmins > 0 ? Math.min(100, Math.round(((gym.adminCount ?? 0) / safeMaxAdmins) * 100)) : 0

  const onSubmit = (values: CreateAdminValues) => {
    const targetVariant =
      values.variantId ||
      gym.variants?.find((variant) => variant.isDefault)?.id ||
      gym.variants?.[0]?.id

    createAdmin.mutate({
      gymId: gym.id,
      email: values.email,
      password: values.password,
      firstName: values.firstName,
      lastName: values.lastName,
      gymVariantId: targetVariant ?? undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Équipe ({gym.adminCount}/{gym.maxAdminAccounts})</CardTitle>
        <CardDescription>
          Capacité utilisée : <span className="font-semibold text-primary">{adminUsage}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${adminUsage}%` }}
          />
        </div>

        <div className="space-y-2 text-sm">
          {gym.admins?.length ? (
            gym.admins.map((admin) => (
              <div key={admin.id} className="rounded-md border border-border/70 p-3">
                <p className="font-medium">
                  {[admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email}
                </p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
                {admin.gymVariant?.name ? (
                  <p className="text-xs text-muted-foreground">Variante : {admin.gymVariant.name}</p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Aucun administrateur pour le moment.</p>
          )}
        </div>

        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <h3 className="text-sm font-semibold">Ajouter un administrateur</h3>

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

            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prenom</FormLabel>
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
                    <FormLabel>Nom</FormLabel>
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
                  <FormLabel>Variante</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Par defaut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(gym.variants ?? []).map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name} {variant.isDefault ? '(defaut)' : ''}
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
                  <FormLabel>Mot de passe temporaire</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createAdmin.isPending || gym.adminCount >= gym.maxAdminAccounts}>
              {createAdmin.isPending ? 'Creation...' : 'Ajouter'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
