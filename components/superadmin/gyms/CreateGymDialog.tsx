"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocale, useTranslations } from "next-intl"

import {
  useCreateGym,
  usePlanSettings,
  type GymSubscriptionStatus,
  type GymPlanTier,
  type GymBillingInterval,
} from "@/app/[locale]/(dashboard)/super-admin/hooks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { PLAN_PRICING, getPlanFeatures } from "@/lib/subscription-plans"
import { PlanModuleBadges } from "./PlanModules"
import { Badge } from "@/components/ui/badge"

type CreateGymValues = {
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  country?: string
  tier: "BASIC" | "PRO" | "ENTERPRISE"
  interval: "MONTHLY" | "ANNUAL"
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED"
  expiresAt?: string
  grace: number
  maxAdmins: number
  gymType: "SINGLE" | "MULTI"
  variantNames?: string
  ownerEmail: string
  ownerPassword: string
  ownerFirstName?: string
  ownerLastName?: string
}

const defaultValues: CreateGymValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  tier: "BASIC",
  interval: "MONTHLY",
  status: "ACTIVE",
  expiresAt: "",
  grace: 5,
  maxAdmins: 3,
  gymType: "SINGLE",
  variantNames: "Principal",
  ownerEmail: "",
  ownerPassword: "",
  ownerFirstName: "",
  ownerLastName: "",
}

export function CreateGymDialog() {
  const t = useTranslations("superAdminCreateGym")
  const locale = useLocale()

  const [open, setOpen] = useState(false)

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, t("validation.nameRequired")),
          email: z.string().email(t("validation.invalidEmail")),
          phone: z.string().min(6, t("validation.phoneRequired")),
          address: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          tier: z.enum(["BASIC", "PRO", "ENTERPRISE"]),
          interval: z.enum(["MONTHLY", "ANNUAL"]),
          status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED"]),
          expiresAt: z.string().optional(),
          grace: z.coerce.number().min(0).max(30),
          maxAdmins: z.coerce.number().min(1, t("validation.minAdmins")),
          gymType: z.enum(["SINGLE", "MULTI"]),
          variantNames: z.string().optional(),
          ownerEmail: z.string().email(t("validation.invalidEmail")),
          ownerPassword: z.string().min(8, t("validation.min8")),
          ownerFirstName: z.string().optional(),
          ownerLastName: z.string().optional(),
        })
        .superRefine((values, ctx) => {
          if (values.gymType === "MULTI") {
            const variants = (values.variantNames ?? "")
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean)

            if (!variants.length) {
              ctx.addIssue({
                code: "custom",
                path: ["variantNames"],
                message: t("validation.atLeastOneVariant"),
              })
            }
          }
        }),
    [t],
  )

  const form = useForm<CreateGymValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const createGym = useCreateGym()
  const planSettings = usePlanSettings()

  const selectedTier = form.watch("tier") as GymPlanTier
  const selectedInterval = form.watch("interval") as GymBillingInterval
  const gymType = form.watch("gymType") as "SINGLE" | "MULTI"
  const variantNamesValue = form.watch("variantNames") ?? ""
  const gymNameValue = form.watch("name")

  const pricingTable = planSettings.data?.pricing ?? PLAN_PRICING
  const estimatedPrice = pricingTable[selectedTier][selectedInterval]
  const selectedFeatures = useMemo(() => getPlanFeatures(selectedTier), [selectedTier])

  const parsedVariants = useMemo(() => {
    if (gymType === "SINGLE") {
      const base = (gymNameValue || "").trim() || t("defaults.singleVariantFallback")
      return [{ name: base, isDefault: true }]
    }

    const names = variantNamesValue
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)

    const base = names.length ? names : [t("defaults.multiVariantFallback")]
    return base.map((name, index) => ({ name, isDefault: index === 0 }))
  }, [gymNameValue, gymType, t, variantNamesValue])

  const currencyLocale = locale === "ar" ? "ar-MA" : locale === "en" ? "en-US" : "fr-MA"
  const estimatedPriceLabel = estimatedPrice.toLocaleString(currencyLocale, {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    }
  }, [open, form])

  const onSubmit = (values: CreateGymValues) => {
    const variantList =
      values.gymType === "MULTI"
        ? (values.variantNames ?? "")
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name, index) => ({ name, isDefault: index === 0 }))
        : [{ name: values.name?.trim() || t("defaults.singleVariantFallback"), isDefault: true }]

    const safeVariants = variantList.length
      ? variantList
      : [{ name: t("defaults.singleVariantFallback"), isDefault: true }]

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
        variants: safeVariants,
        owner: {
          email: values.ownerEmail,
          password: values.ownerPassword,
          firstName: values.ownerFirstName || t("defaults.ownerFirstName"),
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
        <Button className="gap-2 rounded-xl shadow-sm hover:shadow-md transition-all">
          <Plus className="h-4 w-4" /> {t("actions.addGym")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg md:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto space-y-6 rounded-3xl border-border/70 px-4 py-6 sm:px-8">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold">{t("title")}</DialogTitle>
          <DialogDescription className="text-base">{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl border-border/70" />
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
                    <FormLabel className="text-sm font-semibold">{t("fields.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="rounded-xl border-border/70" />
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
                  <FormLabel className="text-sm font-semibold">{t("fields.phone")}</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-xl border-border/70" />
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
                  <FormLabel className="text-sm font-semibold">{t("fields.address")}</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-xl border-border/70" />
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
                    <FormLabel className="text-sm font-semibold">{t("fields.city")}</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl border-border/70" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.country")}</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl border-border/70" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="gymType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.gymType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-border/70">
                          <SelectValue placeholder={t("placeholders.chooseType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="SINGLE">{t("gymTypes.single")}</SelectItem>
                        <SelectItem value="MULTI">{t("gymTypes.multi")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <FormDescription className="text-xs">{t("hints.gymType")}</FormDescription>
                  </FormItem>
                )}
              />

              <div className="rounded-2xl border border-dashed border-border/60 bg-linear-to-brm-muted/40 to-muted/20 p-4 shadow-sm">
                <p className="text-sm font-semibold text-foreground">{t("variants.previewTitle")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {parsedVariants.map((variant) => (
                    <Badge
                      key={variant.name}
                      variant={variant.isDefault ? "secondary" : "outline"}
                      className="rounded-full border-border/60"
                    >
                      {variant.name} {variant.isDefault ? `(${t("labels.default")})` : ""}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("variants.firstDefaultHint")}</p>
              </div>
            </div>

            {gymType === "MULTI" ? (
              <FormField
                control={form.control}
                name="variantNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.variantNames")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("placeholders.variantNames")}
                        className="rounded-xl border-border/70"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                <p className="text-sm font-semibold">{t("variants.singleTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("variants.singleHint", { name: parsedVariants[0]?.name ?? "-" })}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.plan")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-border/70">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="BASIC">{t("plans.basic")}</SelectItem>
                        <SelectItem value="PRO">{t("plans.pro")}</SelectItem>
                        <SelectItem value="ENTERPRISE">{t("plans.enterprise")}</SelectItem>
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
                    <FormLabel className="text-sm font-semibold">{t("fields.billing")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-border/70">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="MONTHLY">{t("labels.monthly")}</SelectItem>
                        <SelectItem value="ANNUAL">{t("labels.annual")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <FormDescription className="text-xs">
                      {t("hints.estimatedPrice", { price: estimatedPriceLabel })}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-border/70">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ACTIVE">{t("statuses.active")}</SelectItem>
                        <SelectItem value="SUSPENDED">{t("statuses.suspended")}</SelectItem>
                        <SelectItem value="EXPIRED">{t("statuses.expired")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-linear-to-br from-primary/5 via-primary/3 to-background p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="font-semibold">{t("modules.title", { tier: selectedTier })}</p>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {t("modules.estimate", { price: estimatedPriceLabel })}
                </span>
              </div>
              <PlanModuleBadges features={selectedFeatures} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.expiresAt")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={t("placeholders.chooseDate")}
                        className="rounded-xl border-border/70"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.graceDays")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-xl border-border/70" />
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
                    <FormLabel className="text-sm font-semibold">{t("fields.maxAdmins")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-xl border-border/70" />
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
                    <FormLabel className="text-sm font-semibold">{t("fields.ownerEmail")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="rounded-xl border-border/70" />
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
                    <FormLabel className="text-sm font-semibold">{t("fields.ownerPassword")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="rounded-xl border-border/70" />
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
                    <FormLabel className="text-sm font-semibold">{t("fields.ownerFirstName")}</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl border-border/70" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("fields.ownerLastName")}</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl border-border/70" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl shadow-md hover:shadow-lg transition-all"
              disabled={createGym.isPending}
            >
              {createGym.isPending ? t("actions.creating") : t("actions.create")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
