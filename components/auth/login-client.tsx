'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSession, signIn, useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Sparkles, Shield, Zap, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, Link, type AppLocale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

type LoginClientProps = {
  localeFromServer: AppLocale
}

function LoginClientContent({ localeFromServer }: LoginClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const t = useTranslations('auth.login')
  const isRTL = localeFromServer === 'ar'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace('/', { locale: localeFromServer })
    }
  }, [status, session, router, localeFromServer])

  useEffect(() => {
    if (searchParams.get('demo')) {
      toast.success(t('toasts.demoRequested'))
    }
  }, [searchParams, t])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        const message =
          result.error === 'PLAN_INACTIVE'
            ? t('errors.planInactive')
            : t('errors.invalidCredentials')

        setError(message)
        toast.error(message)
        return
      }

      const currentSession = await getSession()
      const destination: '/super-admin' | '/dashboard' =
        currentSession?.user?.role === 'SUPER_ADMIN'
          ? '/super-admin'
          : '/dashboard'

      toast.success(t('toasts.loginSuccess'))
      router.replace(destination, { locale: localeFromServer })
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.unexpected')
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: Shield, text: t('features.security') },
    { icon: Zap, text: t('features.performance') },
    { icon: TrendingUp, text: t('features.analytics') },
  ]

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute left-10 top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div
          className={cn(
            'relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2',
          )}
        >
          {/* Marketing text - RIGHT on RTL, LEFT on LTR */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'hidden space-y-8 lg:block',
              isRTL ? 'lg:order-2 text-right' : 'lg:order-1 text-left',
            )}
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary',
                  isRTL && 'flex-row-reverse',
                )}
              >
                <Sparkles className="h-4 w-4" />
                {t('marketing.badge')}
              </motion.div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                {t('marketing.headline', { brand: 'GymWatch' })}
              </h1>
              <p className="max-w-md text-lg text-muted-foreground">
                {t('marketing.subtitle')}
              </p>
            </div>

            <div className="space-y-4 pt-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className={cn(
                    'flex items-center gap-3',
                    isRTL && 'flex-row-reverse',
                  )}
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">
                    {feature.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Form - LEFT on RTL, RIGHT on LTR */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'mx-auto w-full max-w-md',
              isRTL ? 'lg:order-1' : 'lg:order-2',
            )}
          >
            <Card className="bg-card/95 border-border/70 shadow-xl backdrop-blur-sm">
              <CardHeader className={cn('space-y-2 text-center', isRTL && 'text-right')}>
                <CardTitle className="text-3xl font-bold">
                  {t('form.title')}
                </CardTitle>
                <CardDescription className="text-base">
                  {t('form.subtitle')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium"
                    >
                      {t('form.emailLabel')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('form.emailPlaceholder')}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium"
                    >
                      {t('form.passwordLabel')}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('form.passwordPlaceholder')}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-11"
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full text-base"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? t('form.submitPending')
                      : t('form.submit')}
                  </Button>
                </form>

                <div className={cn('mt-6 text-center', isRTL && 'text-right')}>
                  <p className="text-sm text-muted-foreground">
                    {t('footer.noAccount')}{' '}
                    <Link
                      href="/request-demo"
                      className="font-medium text-primary hover:underline"
                    >
                      {t('footer.requestDemo')}
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
            ...
        </div>
      }
    >
      <LoginClientContent {...props} />
    </Suspense>
  )
}
