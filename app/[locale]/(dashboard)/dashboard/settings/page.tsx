"use client"
//(dashboard)/dashboard/settings/page.tsx
import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { AlertCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { DEFAULT_PLAN_LIMITS, resolvePlanLimitsForTier, type PlanLimitsTable } from "@/lib/subscription-plans"

interface GymData {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  maxSessionMinutes?: number | null
  planLimitPerVariant?: number | null
  planLimitPerNetwork?: number | null
  planLimits?: {
    perVariant: number | null
    perNetwork: number | null
    unlimitedPerVariant: boolean
    unlimitedPerNetwork: boolean
    sources: { perVariant: "PLAN_DEFAULT" | "GYM_OVERRIDE"; perNetwork: "PLAN_DEFAULT" | "GYM_OVERRIDE" }
  }
}

function ReadonlyField({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-muted/40 px-4 py-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-tight text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const gymKey = useMemo(() => ["gym", session?.user?.gymId ?? "no-gym"] as const, [session?.user?.gymId])

  const {
    data: gym,
    isLoading,
    isError,
  } = useQuery<GymData>({
    queryKey: gymKey,
    enabled: Boolean(session?.user?.gymId),
    queryFn: async () => {
      const response = await fetch("/api/gym")

      if (!response.ok) {
        throw new Error("Impossible de charger les parametres du gymnase")
      }

      return response.json()
    },
  })

  const { data: planSettings } = useQuery<{ limits?: PlanLimitsTable }>({
    queryKey: ['plan-settings-public'],
    queryFn: async () => {
      const response = await fetch('/api/plan-settings')
      if (!response.ok) {
        throw new Error('Impossible de charger les limites des plans')
      }
      return response.json()
    },
  })

  const roleLabels: Record<string, string> = {
    GYM_OWNER: "Proprietaire",
    GYM_ADMIN: "Admin",
  }

  const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined) return "Non renseigne"
    const text = String(value).trim()
    return text.length ? text : "Non renseigne"
  }

  const formatPlan = (plan?: string | null) => {
    if (!plan) return "Non renseigne"
    if (plan === "BASIC") return "Basic"
    if (plan === "PRO") return "Pro"
    if (plan === "ENTERPRISE") return "Enterprise"
    return plan
  }

  const formatInterval = (interval?: string | null) => {
    if (!interval) return "Non renseigne"
    return interval === "ANNUAL" ? "Annuel" : "Mensuel"
  }

  const currentTier = (session?.user?.subscriptionPlan ?? "BASIC") as string
  const limitsTable: PlanLimitsTable = planSettings?.limits ?? DEFAULT_PLAN_LIMITS
  const effectiveLimits = useMemo(
    () => (gym?.planLimits ? gym.planLimits : resolvePlanLimitsForTier(currentTier as any, limitsTable)),
    [gym?.planLimits, currentTier, limitsTable],
  )
  const hasOverrides =
    (gym?.planLimitPerVariant ?? null) !== null || (gym?.planLimitPerNetwork ?? null) !== null

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[360px] rounded-2xl" />
          <Skeleton className="h-[360px] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card className="overflow-hidden border border-border/60 shadow-sm">
        <CardContent className="relative space-y-6 p-6 md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.08),transparent_25%),radial-gradient(circle_at_80%_0%,hsl(var(--muted-foreground)/0.08),transparent_25%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Parametres</p>
              <h1 className="text-3xl font-bold leading-tight">Espace salle</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Ces informations sont en lecture seule pour les comptes salle. Contactez le support pour toute mise a
                jour si besoin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full border border-border/60 bg-primary/10 text-primary">
                {roleLabels[session?.user?.role as string] ?? "Role inconnu"}
              </Badge>
              <Badge variant="outline" className="rounded-full border-border/60">
                Plan {formatPlan(session?.user?.subscriptionPlan as string | null | undefined)}
              </Badge>
              <Badge variant="outline" className="rounded-full border-border/60">
                {formatInterval(session?.user?.billingInterval as string | null | undefined)}
              </Badge>
            </div>
          </div>

          <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReadonlyField label="Utilisateur" value={formatValue(session?.user?.name ?? session?.user?.email)} />
            <ReadonlyField label="Email" value={formatValue(session?.user?.email)} />
            <ReadonlyField label="Salle" value={formatValue(gym?.name ?? session?.user?.gymId)} />
            <ReadonlyField label="Facturation" value={formatInterval(session?.user?.billingInterval)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card className="h-full border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Profil utilisateur</CardTitle>
            <CardDescription>Informations issues de votre compte et de votre abonnement.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <ReadonlyField label="Nom complet" value={formatValue(session?.user?.name)} />
            <ReadonlyField label="Email" value={formatValue(session?.user?.email)} />
            <ReadonlyField label="Role" value={roleLabels[session?.user?.role as string] ?? "Non renseigne"} />
            <ReadonlyField label="Plan" value={formatPlan(session?.user?.subscriptionPlan as string | null | undefined)} />
            <ReadonlyField
              label="Facturation"
              value={formatInterval(session?.user?.billingInterval as string | null | undefined)}
            />
            <ReadonlyField
              label="Identifiant salle"
              value={formatValue(session?.user?.gymId)}
              hint="Associe automatiquement a votre compte."
              className="md:col-span-2"
            />
          </CardContent>
        </Card>

        <Card className="h-full border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Informations de la salle</CardTitle>
            <CardDescription>Repris automatiquement du profil salle.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {isError ? (
              <div className="md:col-span-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Chargement impossible</p>
                  <p className="text-red-800">Une erreur est survenue lors du chargement des informations salle.</p>
                </div>
              </div>
            ) : null}

            <ReadonlyField label="Nom" value={formatValue(gym?.name)} />
            <ReadonlyField label="Email" value={formatValue(gym?.email)} />
            <ReadonlyField label="Telephone" value={formatValue(gym?.phone)} />
            <ReadonlyField label="Ville" value={formatValue(gym?.city)} />
            <ReadonlyField label="Pays" value={formatValue(gym?.country)} />
            <ReadonlyField label="Adresse" value={formatValue(gym?.address)} className="md:col-span-2" />
            <ReadonlyField
              label="Duree max de session"
              value={gym?.maxSessionMinutes ? `${gym.maxSessionMinutes} minutes` : formatValue(gym?.maxSessionMinutes)}
              className="md:col-span-2"
            />

            <p className="md:col-span-2 text-sm text-muted-foreground">
              Mise a jour des parametres globale desactivee pour les comptes owner/admin.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Limites de plans</CardTitle>
          <CardDescription>Plafonds appliques a vos offres d'abonnement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-semibold">Votre plafond actuel</p>
            <p className="text-sm text-muted-foreground">
              {effectiveLimits?.unlimitedPerVariant
                ? 'Illimite par variante'
                : `${effectiveLimits?.perVariant ?? 0} plan(s) actifs par variante`}
              {' '}
              ·
              {' '}
              {effectiveLimits?.unlimitedPerNetwork
                ? 'Illimite sur le reseau'
                : `${effectiveLimits?.perNetwork ?? 0} plan(s) actifs sur le reseau`}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasOverrides
                ? 'Exception appliquee par le support. Les owners/admin ne peuvent pas modifier ces valeurs.'
                : 'Valeurs calculees automatiquement selon votre plan.'}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(['BASIC', 'PRO', 'ENTERPRISE'] as const).map((tier) => {
              const limits = (planSettings?.limits ?? DEFAULT_PLAN_LIMITS)[tier]
              return (
                <div
                  key={tier}
                  className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm"
                >
                  <p className="font-semibold">{tier === 'ENTERPRISE' ? 'Enterprise' : tier === 'PRO' ? 'Pro' : 'Basic'}</p>
                  <p className="text-xs text-muted-foreground">
                    {limits?.perVariant && limits.perVariant >= 0
                      ? `${limits.perVariant} plan(s) par variante`
                      : 'Illimite par variante'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {limits?.perNetwork && limits.perNetwork >= 0
                      ? `${limits.perNetwork} plan(s) reseau`
                      : 'Illimite reseau'}
                  </p>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Les plafonds sont appliques sur les plans actifs. Contactez le support pour toute derogation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
