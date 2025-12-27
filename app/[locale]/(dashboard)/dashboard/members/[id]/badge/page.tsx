'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { AccessEventSource, AccessEventStatus, SubscriptionStatus } from '@prisma/client'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Copy, Download, QrCode, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { AccessLogTable, type AccessLogRow } from '@/components/dashboard/access-logs/table'
import { buildLabeledQrDataUrl } from '@/components/dashboard/qr-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { buildQrUrl } from '@/lib/qr'

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

export default function MemberBadgePage() {
  const t = useTranslations('dashboard.members.badge')
  const tNav = useTranslations('dashboard.nav')
  const locale = useLocale()

  const params = useParams()
  const memberId = useMemo(() => {
    const raw = (params as any)?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const { hasAccessControl, hasQrTools, hasQrDownloads } = usePlanFeatures()
  const [qrImage, setQrImage] = useState<string>('')
  const [markVisit, setMarkVisit] = useState(false)

  const statusTone = useMemo(
    () =>
      ({
        [AccessEventStatus.GRANTED]: {
          label: t('status.GRANTED.label'),
          color: 'text-emerald-700 dark:text-emerald-300',
          message: t('status.GRANTED.message'),
        },
        [AccessEventStatus.CHECKED_OUT]: {
          label: t('status.CHECKED_OUT.label'),
          color: 'text-sky-700 dark:text-sky-300',
          message: t('status.CHECKED_OUT.message'),
        },
        [AccessEventStatus.SESSION_OVERSTAY]: {
          label: t('status.SESSION_OVERSTAY.label'),
          color: 'text-red-700 dark:text-red-300',
          message: t('status.SESSION_OVERSTAY.message'),
        },
        [AccessEventStatus.DENIED_DAILY_LIMIT]: {
          label: t('status.DENIED_DAILY_LIMIT.label'),
          color: 'text-purple-700 dark:text-purple-300',
          message: t('status.DENIED_DAILY_LIMIT.message'),
        },
        [AccessEventStatus.ALREADY_CHECKED_IN]: {
          label: t('status.ALREADY_CHECKED_IN.label'),
          color: 'text-amber-700 dark:text-amber-300',
          message: t('status.ALREADY_CHECKED_IN.message'),
        },
        [AccessEventStatus.DENIED_EXPIRED]: {
          label: t('status.DENIED_EXPIRED.label'),
          color: 'text-red-700 dark:text-red-300',
          message: t('status.DENIED_EXPIRED.message'),
        },
        [AccessEventStatus.DENIED_INACTIVE]: {
          label: t('status.DENIED_INACTIVE.label'),
          color: 'text-orange-700 dark:text-orange-300',
          message: t('status.DENIED_INACTIVE.message'),
        },
        [AccessEventStatus.DENIED_FORBIDDEN]: {
          label: t('status.DENIED_FORBIDDEN.label'),
          color: 'text-rose-700 dark:text-rose-300',
          message: t('status.DENIED_FORBIDDEN.message'),
        },
      }) as Record<AccessEventStatus, { label: string; color: string; message: string }>,
    [t],
  )

  const memberQuery = useQuery<MemberDetail>({
    queryKey: ['member', memberId],
    enabled: Boolean(memberId),
    queryFn: async () => {
      const response = await fetch(`/api/gym-team/members/${memberId}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || t('errors.loadMember'))
      }
      return body as MemberDetail
    },
  })

  const eventsQuery = useQuery<AccessLogRow[]>({
    queryKey: ['access-events', memberId, 'recent'],
    enabled: Boolean(memberId) && hasAccessControl,
    queryFn: async () => {
      const params = new URLSearchParams({ memberId: memberId as string, limit: '10' })
      const response = await fetch(`/api/gym-team/access-events?${params.toString()}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || t('errors.loadAccess'))
      }
      return (body.events as AccessLogRow[] | undefined) ?? []
    },
  })

  useEffect(() => {
    if (!memberQuery.data?.qrToken || !hasQrTools) return
    let active = true
    setQrImage('')
    const value = (() => {
      try {
        return buildQrUrl(
          memberQuery.data?.qrToken,
          locale,
          typeof window !== 'undefined' ? window.location.origin : undefined,
        )
      } catch {
        return memberQuery.data?.qrToken
      }
    })()

    QRCode.toDataURL(value, { width: 280, margin: 2 }).then((url) => {
      if (active) setQrImage(url)
    })
    return () => {
      active = false
    }
  }, [locale, memberQuery.data?.qrToken, hasQrTools])

  const simulateScan = useMutation({
    mutationFn: async (withVisit: boolean) => {
      const response = await fetch('/api/gym-team/access-events', {
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
        throw new Error(body.error || t('errors.simulation'))
      }
      return body as { accessStatus: AccessEventStatus; event?: AccessLogRow; visit?: any }
    },
    onSuccess: (data) => {
      const tone = statusTone[data.accessStatus]
      const limitState = (data as any)?.visit?.limitState as string | undefined
      const visitsRemaining =
        typeof (data as any)?.visit?.visitsRemaining === 'number'
          ? Math.max((data as any).visit.visitsRemaining, 0)
          : null
      const blocked =
        data.accessStatus === AccessEventStatus.DENIED_DAILY_LIMIT ||
        data.accessStatus === AccessEventStatus.DENIED_EXPIRED ||
        data.accessStatus === AccessEventStatus.DENIED_INACTIVE ||
        data.accessStatus === AccessEventStatus.DENIED_FORBIDDEN ||
        limitState === 'BLOCKED'
      const warning =
        data.accessStatus === AccessEventStatus.SESSION_OVERSTAY ||
        data.accessStatus === AccessEventStatus.ALREADY_CHECKED_IN ||
        limitState === 'WARNING'
      const baseLabel = tone?.label ?? t('simulator.toasts.base')
      const labelWithRemaining =
        visitsRemaining !== null
          ? `${baseLabel} (${visitsRemaining})`
          : baseLabel

      if (blocked) {
        toast.error(labelWithRemaining)
      } else if (warning) {
        toast.warning(labelWithRemaining)
      } else {
        toast.success(labelWithRemaining)
      }
      eventsQuery.refetch()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('errors.simulation')
      toast.error(message)
    },
  })

  const member = memberQuery.data
  const latestEventStatus = eventsQuery.data?.[0]?.status ?? null
  const latestTone = latestEventStatus ? statusTone[latestEventStatus] : null

  const handleCopy = () => {
    if (!member?.qrToken) return
    navigator.clipboard?.writeText(member.qrToken).then(
      () => toast.success(t('toasts.tokenCopied')),
      () => toast.error(t('toasts.tokenCopyError')),
    )
  }

  const handleDownload = async () => {
    if (!qrImage) return
    const anchor = document.createElement('a')
    const label = `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim()
    try {
      const dataUrl = await buildLabeledQrDataUrl(qrImage, label)
      anchor.href = dataUrl
    } catch {
      anchor.href = qrImage
    }
    anchor.download = `${member?.firstName ?? 'member'}-${member?.lastName ?? ''}-qr.png`
    anchor.click()
  }

  const subscriptionBadge = useMemo(() => {
    if (!member?.subscription) return null
    const status = member.subscription.status
    const isExpired = status === 'EXPIRED'
    const statusKey =
      status === 'ACTIVE'
        ? 'active'
        : status === 'EXPIRES_TODAY'
          ? 'expiresToday'
          : 'expired'
    const endDateLabel = member.subscription.endDate
      ? new Date(member.subscription.endDate).toLocaleDateString(locale)
      : null

    return (
      <Badge
        variant="outline"
        className={isExpired ? 'border-red-300 text-red-700' : 'border-emerald-200 text-emerald-700'}
      >
        {t(`subscription.status.${statusKey}`)}{' '}
        {endDateLabel ? `· ${endDateLabel}` : ''}
      </Badge>
    )
  }, [member?.subscription, locale, t])

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
          {t('errors.notFoundTitle')}
        </div>
        <p className="mt-2 text-sm">
          {t('errors.notFoundBody')}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/members">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('page.backToMembers')}
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
            {tNav('members')}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {t('page.title', {
              firstName: member.firstName,
              lastName: member.lastName,
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('page.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              {t('profile.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-lg font-semibold">
                {member.firstName} {member.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {member.email || member.phone || t('profile.noContact')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.gymVariant?.name ? (
                <Badge variant="secondary">{member.gymVariant.name}</Badge>
              ) : null}
              {subscriptionBadge}
              {member.lastVisitedAt ? (
                <Badge variant="outline" className="border-blue-200 text-blue-700">
                  {t('profile.lastVisit', {
                    date: new Date(member.lastVisitedAt).toLocaleDateString(locale),
                  })}
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>{t('profile.tokenLabel')}</Label>
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
            <CardTitle className="text-base text-muted-foreground">
              {t('qr.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {!hasQrTools ? (
              <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-900">
                <p className="font-semibold">{t('qr.lockedTitle')}</p>
                <p className="text-sm">{t('qr.lockedBody')}</p>
              </div>
            ) : (
              <>
                {qrImage ? (
                  <img
                    src={qrImage || '/placeholder.svg'}
                    alt={t('qr.imageAlt')}
                    className="h-auto w-48 rounded-xl border bg-white p-3"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('qr.generating')}
                  </p>
                )}
                <p className="text-sm font-semibold">
                  {member.firstName} {member.lastName}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('qr.copyToken')}
                  </Button>
                  {hasQrDownloads ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownload}
                      disabled={!qrImage}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('qr.download')}
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
            {t('simulator.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAccessControl ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                {t('simulator.lockedTitle')}
              </div>
              <p className="text-sm">
                {t('simulator.lockedBody')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {t('simulator.panelTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('simulator.panelDescription')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="mark-visit"
                    checked={markVisit}
                    onCheckedChange={setMarkVisit}
                  />
                  <Label htmlFor="mark-visit" className="text-sm">
                    {t('simulator.panelMarkVisit')}
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
                    {t('simulator.runPending')}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('simulator.runLabel')}
                  </>
                )}
              </Button>
              {eventsQuery.data?.length ? (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                  <p className="mb-2 font-semibold">
                    {t('simulator.latestTitle')}
                  </p>
                  {latestTone ? (
                    <p className={latestTone.color}>{latestTone.label}</p>
                  ) : (
                    <p className="text-muted-foreground">
                      {t('simulator.latestEmpty')}
                    </p>
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
            <CardTitle className="text-base text-muted-foreground">
              {t('events.title')}
            </CardTitle>
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
