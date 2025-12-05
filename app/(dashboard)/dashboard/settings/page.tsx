"use client"
//(dashboard)/dashboard/settings/page.tsx
import { useSession } from "next-auth/react"
import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"

interface GymData {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  maxSessionMinutes?: number | null
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
    if (plan === "COMPLEX") return "Complex"
    return plan
  }

  const formatInterval = (interval?: string | null) => {
    if (!interval) return "Non renseigne"
    return interval === "ANNUAL" ? "Annuel" : "Mensuel"
  }

  if (isLoading) {
    return <div>Chargement des parametres...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parametres</h1>
        <p className="text-muted-foreground mt-2">
          Ces informations sont en lecture seule pour les comptes salle. Contactez le support pour toute mise a jour.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil utilisateur</CardTitle>
            <CardDescription>Informations issues de votre compte et de votre abonnement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user-name">Nom complet</Label>
              <Input
                id="user-name"
                value={formatValue(session?.user?.name)}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                value={formatValue(session?.user?.email)}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Input
                id="user-role"
                value={roleLabels[session?.user?.role as string] ?? "Non renseigne"}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="user-plan">Plan</Label>
                <Input
                  id="user-plan"
                  value={formatPlan(session?.user?.subscriptionPlan as string | null | undefined)}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="user-interval">Facturation</Label>
                <Input
                  id="user-interval"
                  value={formatInterval(session?.user?.billingInterval as string | null | undefined)}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations de la salle</CardTitle>
            <CardDescription>Repris automatiquement du profil salle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isError && (
              <div className="p-3 rounded-md text-sm bg-red-100 text-red-800">
                Une erreur est survenue lors du chargement
              </div>
            )}

            <div>
              <Label htmlFor="gym-name">Nom</Label>
              <Input
                id="gym-name"
                value={formatValue(gym?.name)}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>

            <div>
              <Label htmlFor="gym-email">Email</Label>
              <Input
                id="gym-email"
                value={formatValue(gym?.email)}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>

            <div>
              <Label htmlFor="gym-phone">Telephone</Label>
              <Input
                id="gym-phone"
                value={formatValue(gym?.phone)}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="gym-city">Ville</Label>
                <Input
                  id="gym-city"
                  value={formatValue(gym?.city)}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="gym-country">Pays</Label>
                <Input
                  id="gym-country"
                  value={formatValue(gym?.country)}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="gym-address">Adresse</Label>
              <Input
                id="gym-address"
                value={formatValue(gym?.address)}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>

            <div>
              <Label htmlFor="gym-session-limit">Duree max de session</Label>
              <Input
                id="gym-session-limit"
                value={
                  gym?.maxSessionMinutes
                    ? `${gym.maxSessionMinutes} minutes`
                    : formatValue(gym?.maxSessionMinutes)
                }
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Mise a jour des parametres globale desactivee pour les comptes owner/admin.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
