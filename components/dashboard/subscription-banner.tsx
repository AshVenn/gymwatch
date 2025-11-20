'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, CalendarClock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatInterval(interval?: string | null) {
  return interval === 'ANNUAL' ? 'Annuel' : 'Mensuel'
}

function formatPlan(plan?: string | null) {
  return plan === 'PRO' ? 'Pro' : 'Basic'
}

export function SubscriptionBanner() {
  const { data: session } = useSession()
  const subscriptionStatus = session?.user?.subscriptionStatus ?? null
  const expiresAtRaw = session?.user?.subscriptionExpiresAt ?? null
  const demoEndsAtRaw = (session?.user as any)?.demoEndsAt ?? null
  const isDemo = Boolean((session?.user as any)?.isDemo)
  const planLabel = formatPlan(session?.user?.subscriptionPlan ?? null)
  const intervalLabel = formatInterval(session?.user?.billingInterval ?? null)

  const { message, tone, daysLeft } = useMemo(() => {
    if (!subscriptionStatus) return { message: null, tone: null, daysLeft: null }

    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null
    const diffDays = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

    if (subscriptionStatus === 'EXPIRED' || (diffDays !== null && diffDays < 0)) {
      return {
        tone: 'danger' as const,
        message: 'Votre abonnement est expire. Renouvelez votre plan pour conserver l acces aux fonctionnalites.',
        daysLeft: diffDays,
      }
    }

    if (diffDays !== null && diffDays <= 7) {
      return {
        tone: 'warning' as const,
        message: `Votre abonnement expirera dans ${diffDays} jour${diffDays > 1 ? 's' : ''}.`,
        daysLeft: diffDays,
      }
    }

    return { message: null, tone: null, daysLeft: diffDays }
  }, [expiresAtRaw, subscriptionStatus])

  if (!message || !tone) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-cyan-500/10 p-5">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.25),transparent_60%)] blur-3xl" />
        <div className="relative flex flex-col gap-2 text-sm text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
            <Sparkles className="h-4 w-4" />
            GymWatch Plan {planLabel} {isDemo ? '(Demo)' : null}
          </div>
          <p className="text-base font-semibold">
            {planLabel} - {intervalLabel}
          </p>
          <p className="text-white/70">
            {isDemo && demoEndsAtRaw
              ? `Compte demo actif jusqu'au ${new Date(demoEndsAtRaw).toLocaleDateString('fr-FR')}`
              : 'Merci d utiliser GymWatch'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-red-500/70 via-orange-500/60 to-amber-500/60 p-5 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)] blur-3xl opacity-50" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/80">
            <Sparkles className="h-4 w-4" />
            Plan {planLabel} - {intervalLabel}
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
              tone === 'danger' ? 'bg-white/20' : 'bg-white/10'
            )}
          >
            {tone === 'danger' ? <AlertTriangle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {tone === 'danger' ? 'Action requise' : 'Rappel'}
          </div>
        </div>
        <p className="text-base font-semibold leading-relaxed">{message}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
          {typeof daysLeft === 'number' && daysLeft >= 0 && (
            <span className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              {daysLeft} jours restants
            </span>
          )}
          <a
            href="/dashboard/settings"
            className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
          >
            Gerer mon abonnement
          </a>
        </div>
      </div>
    </div>
  )
}
