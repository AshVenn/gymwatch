'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSession, signIn, useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarketingNavbar } from '@/components/marketing/navbar'
import { motion } from 'framer-motion'
import { Sparkles, Shield, Zap, TrendingUp } from 'lucide-react'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace('/')
    }
  }, [session, status, router])

  useEffect(() => {
    if (searchParams.get('demo')) {
      toast.success('Demande de demo envoyee, vous pouvez suivre vos acces dans votre boite mail.')
    }
  }, [searchParams])

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
            ? 'Votre abonnement est inactif. Merci de le renouveler !'
            : 'Identifiants incorrects.'
        setError(message)
        toast.error(message)
        return
      }

      const currentSession = await getSession()
      const destination =
        currentSession?.user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'

      toast.success('Connexion reussie.')
      router.replace(destination)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inattendue.'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: Shield, text: 'Sécurité avancée' },
    { icon: Zap, text: 'Performance optimale' },
    { icon: TrendingUp, text: 'Analyses en temps réel' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNavbar />
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
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
            className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
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

        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
          {/* Left side - Marketing content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"
              >
                <Sparkles className="h-4 w-4" />
                Plateforme de gestion
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Bienvenue sur{' '}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  GymWatch
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Gérez votre salle de sport avec une plateforme moderne, intuitive et performante.
                Accédez à toutes vos données en temps réel.
              </p>
            </div>

            <div className="space-y-4 pt-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right side - Login form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mx-auto"
          >
            <Card className="border-border/70 shadow-xl backdrop-blur-sm bg-card/95">
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-3xl font-bold">Connexion</CardTitle>
                <CardDescription className="text-base">
                  Accédez à votre espace GymWatch
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@salle.ma"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
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

                  <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
                    {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Pas encore de compte ?{' '}
                    <a href="/request-demo" className="text-primary hover:underline font-medium">
                      Demander une demo
                    </a>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
