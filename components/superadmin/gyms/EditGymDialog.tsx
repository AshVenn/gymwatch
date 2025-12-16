"use client"

import { useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useSuperAdminGym, useUpdateGymProfile } from "@/app/[locale]/(dashboard)/super-admin/hooks"

type Props = {
  gymId: string | null
  onClose: () => void
}

export function EditGymDialog({ gymId, onClose }: Props) {
  const t = useTranslations("superAdminEditGym")

  const schema = z.object({
    name: z.string().min(2, t("validation.nameMin")),
    email: z.string().email(t("validation.emailInvalid")),
    phone: z.string().min(6, t("validation.phoneMin")),
    city: z.string().min(2, t("validation.cityMin")),
    country: z.string().min(2, t("validation.countryMin")),
    address: z.string().optional(),
  })

  type FormValues = z.infer<typeof schema>

  const open = Boolean(gymId)
  const { data: gym, isLoading } = useSuperAdminGym(gymId)
  const updateGym = useUpdateGymProfile()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: "",
      country: "",
      address: "",
    },
  })

  useEffect(() => {
    if (gym) {
      form.reset({
        name: gym.name,
        email: gym.email,
        phone: gym.phone ?? "",
        city: gym.city ?? "",
        country: gym.country ?? "",
        address: gym.address ?? "",
      })
    }
  }, [gym, form])

  const handleSubmit = (values: FormValues) => {
    if (!gymId) return
    updateGym.mutate(
      {
        gymId,
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          city: values.city,
          country: values.country,
          address: values.address ?? "",
        },
      },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !updateGym.isPending && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl border-border/70 p-4 sm:p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl sm:text-2xl font-bold">{t("title")}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">{t("description")}</DialogDescription>
        </DialogHeader>

        {isLoading && !gym ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : (
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
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
                      <FormMessage />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <Button
                type="submit"
                className="w-full rounded-xl shadow-md hover:shadow-lg transition-all"
                disabled={updateGym.isPending}
              >
                {updateGym.isPending ? t("actions.saving") : t("actions.save")}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
