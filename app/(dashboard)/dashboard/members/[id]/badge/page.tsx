'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { AccessEventSource, AccessEventStatus, SubscriptionStatus } from '@prisma/client'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Copy, Download, QrCode, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

import { AccessLogTable, type AccessLogRow } from '@/components/dashboard/access-logs/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'

interface MemberDetail {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  qrToken: string
  lastVisitedAt?: string | null
  gymVariant?: { id: string; name: string; slug: string; isDefault?: boolean | null }
  subscription?: {
    id: string
    status: SubscriptionStatus
    endDate: string
    planName?: string | null
  } | null
}

const statusTone: Record<AccessEventStatus, { label: string; color: string; message: string }> = {
  GRANTED: {
    label: 'Accès autorisé',
    color: 'text-emerald-700 dark:text-emerald-300',
    message: 'Le badge est valide, abonnement actif.',
  },
  CHECKED_OUT: {
    label: 'Sortie enregistree',
    color: 'text-sky-700 dark:text-sky-300',
    message: 'Sortie marquee pour cette visite.',
  },
  ALREADY_CHECKED_IN: {
    label: 'Déjà compté',
    color: 'text-amber-700 dark:text-amber-300',
    message: 'Ce membre a déjà été comptabilisé aujourd’hui.',
  },
  DENIED_EXPIRED: {
    label: 'Abonnement expiré',
    color: 'text-red-700 dark:text-red-300',
    message: 'L’abonnement est expiré. Renouvelez avant de débloquer l’accès.',
  },
  DENIED_INACTIVE: {
    label: 'Abonnement inactif',
    color: 'text-orange-700 dark:text-orange-300',
    message: 'Aucun abonnement actif ou démarrage différé.',
  },
  DENIED_FORBIDDEN: {
    label: 'Variante non autorisée',
    color: 'text-rose-700 dark:text-rose-300',
    message: 'Ce badge n’est pas autorisé pour cette variante.',
  },
}

export default function MemberBadgePage() {
  const params = useParams()
  const memberId = useMemo(() => {
    const raw = (params as any)?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const { hasAccessControl, hasQrTools, hasQrDownloads } = usePlanFeatures()
  const [qrImage, setQrImage] = useState<string>('')
  const [markVisit, setMarkVisit] = useState(false)

  const memberQuery = useQuery<MemberDetail>({
    queryKey: ['member', memberId],
    enabled: Boolean(memberId),
    queryFn: async () => {
      const response = await fetch(`/api/members/${memberId}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Impossible de charger le membre')
      }
      return body as MemberDetail
    },
  })

  const eventsQuery = useQuery<AccessLogRow[]>({
    queryKey: ['access-events', memberId, 'recent'],
    enabled: Boolean(memberId) && hasAccessControl,
    queryFn: async () => {
      const params = new URLSearchParams({ memberId: memberId as string, limit: '10' })
      const response = await fetch(`/api/access-events?${params.toString()}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Impossible de charger les accès')
      }
      return (body.events as AccessLogRow[] | undefined) ?? []
    },
  })

  useEffect(() => {
    if (!memberQuery.data?.qrToken || !hasQrTools) return
    let active = true
    setQrImage('')
    QRCode.toDataURL(memberQuery.data.qrToken, { width: 280, margin: 2 }).then((url) => {
      if (active) setQrImage(url)
    })
    return () => {
      active = false
    }
  }, [memberQuery.data?.qrToken, hasQrTools])

  const simulateScan = useMutation({
    mutationFn: async (withVisit: boolean) => {
      const response = await fetch('/api/access-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          source: AccessEventSource.SIMULATOR,
          markVisit: withVisit,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Simulation impossible')
      }
      return body as { accessStatus: AccessEventStatus; event?: AccessLogRow; visit?: any }
    },
    onSuccess: (data) => {
      const tone = statusTone[data.accessStatus]
      toast.success(tone?.label ?? 'Simulation enregistrée')
      eventsQuery.refetch()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Simulation impossible'
      toast.error(message)
    },
  })

  const member = memberQuery.data
  const latestEventStatus = eventsQuery.data?.[0]?.status ?? null
  const latestTone = latestEventStatus ? statusTone[latestEventStatus] : null

  const handleCopy = () => {
    if (!member?.qrToken) return
    navigator.clipboard?.writeText(member.qrToken).then(
      () => toast.success('Token copié'),
      () => toast.error('Impossible de copier le token'),
    )
  }

  const handleDownload = () => {
    if (!qrImage) return
    const anchor = document.createElement('a')
    anchor.href = qrImage
    anchor.download = `${member?.firstName ?? 'member'}-${member?.lastName ?? ''}-qr.png`
    anchor.click()
  }

  const subscriptionBadge = useMemo(() => {
    if (!member?.subscription) return null
    const status = member.subscription.status
    const isExpired = status === 'EXPIRED'
    const label =
      status === 'ACTIVE'
        ? 'Actif'
        : status === 'EXPIRES_TODAY'
          ? "Expire aujourd'hui"
          : 'Expiré'
    return (
      <Badge variant="outline" className={isExpired ? 'border-red-300 text-red-700' : 'border-emerald-200 text-emerald-700'}>
        {label} {member.subscription.endDate ? `· ${new Date(member.subscription.endDate).toLocaleDateString('fr-FR')}` : ''}
      </Badge>
    )
  }, [member?.subscription])

  if (memberQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (memberQuery.isError || !member) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-destructive">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5" />
          Membre introuvable
        </div>
        <p className="mt-2 text-sm">Vérifiez l&apos;identifiant ou retournez à la liste des membres.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/members">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux membres
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/members">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Membres
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            Badge de {member.firstName} {member.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">QR, statut d&apos;abonnement et simulations d&apos;accès.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-lg font-semibold">
                {member.firstName} {member.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {member.email || member.phone || 'Aucun contact'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.gymVariant?.name ? <Badge variant="secondary">{member.gymVariant.name}</Badge> : null}
              {subscriptionBadge}
              {member.lastVisitedAt ? (
                <Badge variant="outline" className="border-blue-200 text-blue-700">
                  Dernière visite : {new Date(member.lastVisitedAt).toLocaleDateString('fr-FR')}
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Token</Label>
              <div className="flex items-center gap-2">
                <Input value={member.qrToken} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Badge QR</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {!hasQrTools ? (
              <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-900">
                <p className="font-semibold">QR codes réservés au plan Pro</p>
                <p className="text-sm">Mettez à niveau pour afficher et télécharger les badges.</p>
              </div>
            ) : (
              <>
                {qrImage ? (
                  <img src={qrImage || '/placeholder.svg'} alt="QR code membre" className="h-auto w-48 rounded-xl border bg-white p-3" />
                ) : (
                  <p className="text-sm text-muted-foreground">Génération du QR…</p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier le token
                  </Button>
                  {hasQrDownloads ? (
                    <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!qrImage}>
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
            <QrCode className="h-4 w-4" />
            Simulateur de scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAccessControl ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Plan Pro ou Enterprise requis
              </div>
              <p className="text-sm">
                Activez le contrôle d&apos;accès pour simuler les scans et enregistrer les évènements.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Simuler un passage</p>
                  <p className="text-xs text-muted-foreground">
                    Enregistre un évènement d&apos;accès avec ce badge. Optionnellement, marque la visite.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="mark-visit" checked={markVisit} onCheckedChange={setMarkVisit} />
                  <Label htmlFor="mark-visit" className="text-sm">
                    Marquer la visite
                  </Label>
                </div>
              </div>
              <Button
                onClick={() => simulateScan.mutate(markVisit)}
                disabled={simulateScan.isPending}
              >
                {simulateScan.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Simulation...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Lancer la simulation
                  </>
                )}
              </Button>
              {eventsQuery.data?.length ? (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                  <p className="mb-2 font-semibold">Dernier statut</p>
                  {latestTone ? (
                    <p className={latestTone.color}>{latestTone.label}</p>
                  ) : (
                    <p className="text-muted-foreground">Aucun évènement récent.</p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {hasAccessControl ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Derniers évènements</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <AccessLogTable events={eventsQuery.data ?? []} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
