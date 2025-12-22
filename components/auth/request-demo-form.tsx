"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Mail, MapPin, Phone, Shield, Sparkles, Clock3, BadgeCheck } from "lucide-react"

import type { AppLocale } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RequestDemoCopy = {
  hero: { badge: string; trustChip: string; title: string; subtitle: string }
  left: {
    title: string
    description: string
    cards: {
      verify: { title: string; desc: string }
      invite: { title: string; desc: string }
      local: { title: string; desc: string }
      speed: { title: string; desc: string }
    }
    hint: { title: string; desc: string }
  }
  plans: {
    basic: { title: string; desc: string }
    pro: { title: string; desc: string }
    enterprise: { title: string; desc: string }
  }
  form: {
    title: string
    description: string
    sideHint: string
    disclaimer: string
    actions: { submit: string; sending: string }
    fields: {
      gymName: { label: string; placeholder: string }
      gymEmail: { label: string; placeholder: string }
      phone: { label: string; placeholder: string }
      address: { label: string; placeholder: string }
      city: { label: string; placeholder: string }
      country: { label: string; placeholder: string }
      adminFirstName: { label: string; placeholder: string }
      adminLastName: { label: string; placeholder: string }
      adminEmail: { label: string; placeholder: string }
      plan: { label: string; placeholder: string }
      message: { label: string; placeholder: string }
    }
  }
  toast: { success: string; errorFallback: string }
  validation: { required: string; email: string; phone: string; messageMax: string }
}

type DemoRequestValues = {
  gymName: string
  gymEmail: string
  adminEmail: string
  adminFirstName: string
  adminLastName: string
  phone: string
  address: string
  city: string
  country: string
  plan: "BASIC" | "PRO" | "ENTERPRISE"
  message: string
  botField?: string
}

const defaultValues: DemoRequestValues = {
  gymName: "",
  gymEmail: "",
  adminEmail: "",
  adminFirstName: "",
  adminLastName: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  plan: "BASIC",
  message: "",
  botField: "",
}

export default function RequestDemoForm({ locale, copy }: { locale: AppLocale; copy: RequestDemoCopy }) {
  const router = useRouter()
  const { status } = useSession()

  const dirClass = locale === "ar" ? "rtl text-right" : "ltr text-left"

  useEffect(() => {
    if (status === "authenticated") router.replace("/")
  }, [router, status])

  // ✅ ALL REQUIRED (including message)
  const schema = useMemo(() => {
    const required = copy.validation.required
    return z.object({
      gymName: z.string().min(2, required),
      gymEmail: z.string().min(1, required).email(copy.validation.email),
      adminEmail: z.string().min(1, required).email(copy.validation.email),
      adminFirstName: z.string().min(1, required),
      adminLastName: z.string().min(1, required),
      phone: z.string().min(6, copy.validation.phone),
      address: z.string().min(1, required),
      city: z.string().min(1, required),
      country: z.string().min(1, required),
      plan: z.enum(["BASIC", "PRO", "ENTERPRISE"]),
      message: z.string().min(1, required).max(2000, copy.validation.messageMax),
      botField: z.string().max(0).optional(),
    })
  }, [copy])

  const form = useForm<DemoRequestValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const requestDemo = useMutation({
    mutationFn: async (payload: DemoRequestValues) => {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      const message =
        response.status === 429 ? copy.toast.errorFallback : data.error || copy.toast.errorFallback
      if (!response.ok) throw new Error(message)
      return data
    },
    onSuccess: () => {
      toast.success(copy.toast.success)
      form.reset(defaultValues)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleSubmit = (values: DemoRequestValues) => {
    requestDemo.mutate({
      ...values,
      gymName: values.gymName.trim(),
      gymEmail: values.gymEmail.trim(),
      adminEmail: values.adminEmail.trim(),
      adminFirstName: values.adminFirstName.trim(),
      adminLastName: values.adminLastName.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      country: values.country.trim(),
      message: values.message.trim(),
      botField: values.botField?.trim() ?? "",
    })
  }

  const planItems = useMemo(
    () => [
      { value: "BASIC" as const, title: copy.plans.basic.title, desc: copy.plans.basic.desc },
      { value: "PRO" as const, title: copy.plans.pro.title, desc: copy.plans.pro.desc },
      { value: "ENTERPRISE" as const, title: copy.plans.enterprise.title, desc: copy.plans.enterprise.desc },
    ],
    [copy],
  )

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-background text-foreground", dirClass)}>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_52%),radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.08),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-56 bg-linear-to-b from-background via-background/70 to-transparent" />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:px-6 md:py-12">
        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="min-h-11 rounded-full border-primary/30 bg-primary/10 px-4 py-2 text-primary backdrop-blur-sm transition-all duration-200 ease-out"
            >
              <Sparkles className="mr-1 h-4.5 w-4.5 md:h-5 md:w-5" aria-hidden />
              {copy.hero.badge}
            </Badge>

            <Badge
              variant="secondary"
              className="min-h-11 gap-2 rounded-full border border-border/30 bg-card/95 px-4 py-2 shadow-sm backdrop-blur-xl transition-all duration-200 ease-out"
            >
              <BadgeCheck className="h-4.5 w-4.5 md:h-5 md:w-5" aria-hidden />
              {copy.hero.trustChip}
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-pretty text-4xl font-bold tracking-tight md:text-5xl">
              {copy.hero.title}
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{copy.hero.subtitle}</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT */}
          <Card className="rounded-[20px] border border-primary/20 bg-card/95 shadow-sm backdrop-blur-xl">
            <CardHeader className="space-y-3 p-6">
              <CardTitle className="text-pretty text-2xl font-normal">{copy.left.title}</CardTitle>
              <CardDescription className="max-w-xl text-base leading-relaxed">{copy.left.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-[20px] border border-border/30 bg-background/50 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.01]">
                  <Shield className="text-primary h-7 w-7 md:h-8 md:w-8" />
                  <div className="space-y-1">
                    <p className="font-normal">{copy.left.cards.verify.title}</p>
                    <p className="text-sm text-muted-foreground">{copy.left.cards.verify.desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[20px] border border-border/30 bg-background/50 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.01]">
                  <Mail className="text-primary h-7 w-7 md:h-8 md:w-8" />
                  <div className="space-y-1">
                    <p className="font-normal">{copy.left.cards.invite.title}</p>
                    <p className="text-sm text-muted-foreground">{copy.left.cards.invite.desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[20px] border border-border/30 bg-background/50 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.01]">
                  <MapPin className="text-primary h-7 w-7 md:h-8 md:w-8" />
                  <div className="space-y-1">
                    <p className="font-normal">{copy.left.cards.local.title}</p>
                    <p className="text-sm text-muted-foreground">{copy.left.cards.local.desc}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[20px] border border-border/30 bg-background/50 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.01]">
                  <Clock3 className="text-primary h-7 w-7 md:h-8 md:w-8" />
                  <div className="space-y-1">
                    <p className="font-normal">{copy.left.cards.speed.title}</p>
                    <p className="text-sm text-muted-foreground">{copy.left.cards.speed.desc}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-border/30 bg-background/50 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-sm font-normal">{copy.left.hint.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.left.hint.desc}</p>
              </div>
            </CardContent>
          </Card>

          {/* FORM */}
          <Card className="rounded-[20px] border border-border/30 bg-card/95 shadow-sm backdrop-blur-xl">
            <CardHeader className="space-y-2 p-6">
              <CardTitle className="text-pretty text-xl font-normal">{copy.form.title}</CardTitle>
              <CardDescription className="text-base">{copy.form.description}</CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                    {...form.register("botField")}
                  />

                  <FormField
                    control={form.control}
                    name="gymName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">{copy.form.fields.gymName.label}</FormLabel>
                        <FormControl>
                          <Input
                            required
                            placeholder={copy.form.fields.gymName.placeholder}
                            className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                            {...field}
                          />
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
                          <FormLabel className="text-sm font-normal">{copy.form.fields.gymEmail.label}</FormLabel>
                          <FormControl>
                            <Input
                              required
                              type="email"
                              placeholder={copy.form.fields.gymEmail.placeholder}
                              className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                              {...field}
                            />
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
                          <FormLabel className="text-sm font-normal">{copy.form.fields.phone.label}</FormLabel>
                          <FormControl>
                            <Input
                              required
                              placeholder={copy.form.fields.phone.placeholder}
                              className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                              {...field}
                            />
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
                          <FormLabel className="text-sm font-normal">{copy.form.fields.address.label}</FormLabel>
                          <FormControl>
                            <Input
                              required
                              placeholder={copy.form.fields.address.placeholder}
                              className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                              {...field}
                            />
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
                          <FormLabel className="text-sm font-normal">{copy.form.fields.city.label}</FormLabel>
                          <FormControl>
                            <Input
                              required
                              placeholder={copy.form.fields.city.placeholder}
                              className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                              {...field}
                            />
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
                        <FormLabel className="text-sm font-normal">{copy.form.fields.country.label}</FormLabel>
                        <FormControl>
                          <Input
                            required
                            placeholder={copy.form.fields.country.placeholder}
                            className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                            {...field}
                          />
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
                          <FormLabel className="text-sm font-normal">{copy.form.fields.adminFirstName.label}</FormLabel>
                          <FormControl>
                            <Input
                              required
                              placeholder={copy.form.fields.adminFirstName.placeholder}
                              className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                              {...field}
                            />
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
                          <FormLabel className="text-sm font-normal">{copy.form.fields.adminLastName.label}</FormLabel>
                          <FormControl>
                            <Input
                              required
                              placeholder={copy.form.fields.adminLastName.placeholder}
                              className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                              {...field}
                            />
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
                        <FormLabel className="text-sm font-normal">{copy.form.fields.adminEmail.label}</FormLabel>
                        <FormControl>
                          <Input
                            required
                            type="email"
                            placeholder={copy.form.fields.adminEmail.placeholder}
                            className="h-12 rounded-xl border-border/50 bg-background/50 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/20"
                            {...field}
                          />
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
                          <FormLabel className="text-sm font-normal">{copy.form.fields.plan.label}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background/50 px-4 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out focus:ring-2 focus:ring-primary/20">
                                <SelectValue placeholder={copy.form.fields.plan.placeholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-border/30 bg-background/95 backdrop-blur-xl">
                              {planItems.map((p) => (
                                <SelectItem key={p.value} value={p.value} className="rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="font-normal">{p.title}</span>
                                    <span className="text-xs text-muted-foreground">{p.desc}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex min-h-11 items-center gap-3 rounded-[20px] border border-dashed border-border/30 bg-background/50 p-4 text-sm shadow-sm backdrop-blur-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{copy.form.sideHint}</span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">{copy.form.fields.message.label}</FormLabel>
                        <FormControl>
                          <textarea
                            required
                            className="min-h-30 w-full rounded-2xl border border-border/50 bg-background/50 px-4 py-3 text-sm shadow-sm outline-none backdrop-blur-sm transition-all duration-200 ease-out placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20"
                            placeholder={copy.form.fields.message.placeholder}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl px-5 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
                    disabled={requestDemo.isPending}
                  >
                    {requestDemo.isPending ? copy.form.actions.sending : copy.form.actions.submit}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">{copy.form.disclaimer}</p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
