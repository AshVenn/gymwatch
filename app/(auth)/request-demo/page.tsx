'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {  Mail, MapPin, Phone, Shield } from 'lucide-react'

import { MarketingNavbar } from '@/components/marketing/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const schema = z.object({
  gymName: z.string().min(2, 'Nom requis'),
  gymEmail: z.string().email('Email invalide'),
  adminEmail: z.string().email('Email invalide'),
  adminFirstName: z.string().optional(),
  adminLastName: z.string().optional(),
  phone: z.string().min(6, 'Numero invalide').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  plan: z.enum(['BASIC', 'PRO']),
  message: z.string().max(2000, 'Message trop long').optional(),
})

type DemoRequestValues = z.infer<typeof schema>

const defaultValues: DemoRequestValues = {
  gymName: '',
  gymEmail: '',
  adminEmail: '',
  adminFirstName: '',
  adminLastName: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  plan: 'BASIC',
  message: '',
}

export default function RequestDemoPage() {
  const router = useRouter()
  const { status } = useSession()

  const form = useForm<DemoRequestValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [router, status])

  const requestDemo = useMutation({
    mutationFn: async (payload: DemoRequestValues) => {
      const response = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Impossible denvoyer votre demande')
      }
      return data
    },
    onSuccess: () => {
      toast.success('Demande envoyee, nous revenons vers vous tres vite.')
      form.reset(defaultValues)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (values: DemoRequestValues) => {
    requestDemo.mutate({
      ...values,
      adminFirstName: values.adminFirstName?.trim() || undefined,
      adminLastName: values.adminLastName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      city: values.city?.trim() || undefined,
      country: values.country?.trim() || undefined,
      message: values.message?.trim() || undefined,
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border border-primary/20 bg-linear-to-br from-primary/5 via-card to-card shadow-lg">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit border-primary/40 text-primary">
                Nouveau flux demo
              </Badge>
              <CardTitle className="text-3xl">Planifiez votre demo sur-mesure</CardTitle>
              <CardDescription className="max-w-xl text-base">
                Donnez-nous quelques details pour pre-configurer votre espace. Nous validons la demande puis vous envoyons les acces a un compte demo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <Shield className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Verification rapide</p>
                  <p className="text-sm text-muted-foreground">Chaque demande est traitee par un super admin pour eviter les doublons.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <Mail className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Invite administrateur</p>
                  <p className="text-sm text-muted-foreground">Nous pre-remplissons le compte proprietaire avec vos informations.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Parametres locaux</p>
                  <p className="text-sm text-muted-foreground">Adresse, ville et plan choisi pour adapter la demo a votre realite.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle>Demander une demo</CardTitle>
              <CardDescription>Remplissez les infos cle pour creer votre instance test.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
                  <FormField
                    control={form.control}
                    name="gymName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la salle</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: FitZone Casablanca" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="gymEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email de la salle</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@salle.ma" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telephone</FormLabel>
                          <FormControl>
                            <Input placeholder="+212..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input placeholder="Avenue..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Casablanca" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input placeholder="Maroc" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="adminFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prenom admin</FormLabel>
                          <FormControl>
                            <Input placeholder="Sanae" {...field} />
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
                            <Input placeholder="Belkadi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email administrateur principal</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@salle.ma" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan souhaite</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir un plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="BASIC">Basic (gestion essentielle)</SelectItem>
                              <SelectItem value="PRO">Pro (QR codes, exports)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 p-3 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>Un demo peut etre provisionnee en quelques minutes.</span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contexte ou besoins particuliers</FormLabel>
                        <FormControl>
                          <textarea
                            className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            placeholder="Combien de salles ? Quels objectifs ?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={requestDemo.isPending}>
                    {requestDemo.isPending ? 'Envoi en cours...' : 'Envoyer ma demande'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
