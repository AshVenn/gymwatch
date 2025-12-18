"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Trash2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { usePurgeAccessLogs } from "../hooks"

export default function SuperAdminSettingsPage() {
  const t = useTranslations("superAdminSettings")
  const [pendingPassword, startPasswordTransition] = useTransition()
  const purgeLogs = usePurgeAccessLogs()
  const purgeRetentionDays = 30

  /**
   * Zod schema (localized)
   */
  const passwordSchema = z
    .object({
      currentPassword: z.string().min(8, t("validation.min8")),
      newPassword: z.string().min(8, t("validation.min8")),
      confirmPassword: z.string().min(8, t("validation.min8")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmPassword"],
    })

  type PasswordFormValues = z.infer<typeof passwordSchema>

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  /**
   * Submit password change
   */
  const submitPassword = (values: PasswordFormValues) => {
    startPasswordTransition(async () => {
      try {
        const response = await fetch("/api/super-admin/settings/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || t("toast.passwordError"))
        }

        toast.success(t("toast.passwordUpdated"))
        passwordForm.reset()
        await signOut({ callbackUrl: "/login" })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("toast.unexpectedError"))
      }
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-rm-foreground to-foreground/70 bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">{t("subtitle")}</p>
      </div>

      <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{t("planSetupMoved.title")}</CardTitle>
          <CardDescription className="text-base">{t("planSetupMoved.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("planSetupMoved.helper")}</p>
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/super-admin/plan-setup">{t("planSetupMoved.cta")}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{t("maintenance.title")}</CardTitle>
          <CardDescription className="text-base">
            {t("maintenance.subtitle", { days: purgeRetentionDays })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("maintenance.hint", { days: purgeRetentionDays })}</p>
          <Button
            variant="destructive"
            onClick={() => purgeLogs.mutate()}
            disabled={purgeLogs.isPending}
            className="gap-2 rounded-xl shadow-sm"
          >
            <Trash2 size={16} />
            {purgeLogs.isPending ? t("maintenance.purging") : t("maintenance.button")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{t("password.cardTitle")}</CardTitle>
          <CardDescription className="text-base">{t("password.cardDescription")}</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...passwordForm}>
            <form className="space-y-5" onSubmit={passwordForm.handleSubmit(submitPassword)}>
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">{t("password.current")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        className="rounded-xl border-border/60 bg-background/50 transition-all duration-200 focus:border-primary/50 focus:shadow-md"
                        {...field}
                      />
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
                    <FormLabel className="text-sm font-semibold">{t("password.new")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="rounded-xl border-border/60 bg-background/50 transition-all duration-200 focus:border-primary/50 focus:shadow-md"
                        {...field}
                      />
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
                    <FormLabel className="text-sm font-semibold">{t("password.confirm")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="rounded-xl border-border/60 bg-background/50 transition-all duration-200 focus:border-primary/50 focus:shadow-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full rounded-xl transition-all duration-200 hover:scale-[1.02]"
                disabled={pendingPassword}
              >
                {pendingPassword ? t("password.submitting") : t("password.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
