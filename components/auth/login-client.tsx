"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getSession, signIn, useSession } from "next-auth/react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Sparkles, Shield, Zap, TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, Link, type AppLocale } from "@/i18n/routing"
import { cn } from "@/lib/utils"

type LoginClientProps = {
  localeFromServer: AppLocale
}

function LoginClientContent({ localeFromServer }: LoginClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const t = useTranslations("auth.login")
  const isRTL = localeFromServer === "ar"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace("/", { locale: localeFromServer })
    }
  }, [status, session, router, localeFromServer])

  useEffect(() => {
    if (searchParams.get("demo")) {
      toast.success(t("toasts.demoRequested"))
    }
  }, [searchParams, t])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        const message = result.error === "PLAN_INACTIVE" ? t("errors.planInactive") : t("errors.invalidCredentials")

        setError(message)
        toast.error(message)
        return
      }

      const currentSession = await getSession()
      const destination: "/super-admin" | "/dashboard" =
        currentSession?.user?.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard"

      toast.success(t("toasts.loginSuccess"))
      router.replace(destination, { locale: localeFromServer })
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.unexpected")
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: Shield, text: t("features.security") },
    { icon: Zap, text: t("features.performance") },
    { icon: TrendingUp, text: t("features.analytics") },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute left-0 top-10 h-64 w-64 rounded-full bg-primary/8 blur-3xl sm:left-10 sm:top-20 sm:h-80 sm:w-80"
            animate={{
              scale: [1, 1.15, 1],
              x: [0, 40, 0],
              y: [0, 25, 0],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-primary/8 blur-3xl sm:bottom-20 sm:right-10 sm:h-96 sm:w-96"
            animate={{
              scale: [1, 1.25, 1],
              x: [0, -40, 0],
              y: [0, -25, 0],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        </div>

        <div className={cn("relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-12")}>
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={cn("space-y-6 lg:space-y-8", isRTL ? "lg:order-2 text-right" : "lg:order-1 text-left")}
          >
            <div className="space-y-4 lg:space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-primary backdrop-blur-sm sm:px-4 sm:py-2",
                  isRTL && "flex-row-reverse",
                )}
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t("marketing.badge")}
              </motion.div>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-5xl">
                {t("marketing.headline", { brand: "GymWatch" })}
              </h1>
              <p className="max-w-md text-base text-muted-foreground sm:text-lg">{t("marketing.subtitle")}</p>
            </div>

            <div className="space-y-3 pt-4 sm:space-y-4 lg:pt-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-3 backdrop-blur-sm transition-all duration-200 hover:border-border/60 hover:bg-card/60 sm:gap-4 sm:p-4",
                    isRTL && "flex-row-reverse",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 sm:h-12 sm:w-12">
                    <feature.icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-sm font-medium text-foreground/90 sm:text-base">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={cn("mx-auto w-full max-w-md", isRTL ? "lg:order-1" : "lg:order-2")}
          >
            <Card className="border-border/30 bg-card/80 shadow-2xl shadow-black/5 backdrop-blur-xl">
              <CardHeader
                className={cn("space-y-2 px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-10", isRTL && "text-right")}
              >
                <CardTitle className="text-2xl font-bold sm:text-3xl">{t("form.title")}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground sm:text-base">
                  {t("form.subtitle")}
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 pb-8 sm:px-8 sm:pb-10">
                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
                      {t("form.emailLabel")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("form.emailPlaceholder")}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-border/50 bg-background/60 px-4 text-base transition-all duration-200 placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/20 sm:h-14 sm:text-base"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
                      {t("form.passwordLabel")}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t("form.passwordPlaceholder")}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-border/50 bg-background/60 px-4 text-base transition-all duration-200 placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/20 sm:h-14 sm:text-base"
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm text-destructive backdrop-blur-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 sm:h-14"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t("form.submitPending") : t("form.submit")}
                  </Button>
                </form>

                <div className={cn("mt-6 text-center sm:mt-8", isRTL && "text-right")}>
                  <p className="text-sm text-muted-foreground">
                    {t("footer.noAccount")}{" "}
                    <Link
                      href="/request-demo"
                      className="font-semibold text-primary transition-colors duration-200 hover:text-primary/80"
                    >
                      {t("footer.requestDemo")}
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export function LoginClient(props: LoginClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginClientContent {...props} />
    </Suspense>
  )
}
