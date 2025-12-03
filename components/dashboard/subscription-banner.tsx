'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, CalendarClock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatInterval(interval?: string | null) {
  return interval === 'ANNUAL' ? 'Annuel' : 'Mensuel'
}

function formatPlan(plan?: string | null) {
  if (plan === 'PRO') return 'Pro'
  if (plan === 'COMPLEX') return 'Complex'
  return 'Basic'
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
    const diffDays = expiresAt
      ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    if (subscriptionStatus === 'EXPIRED' || (diffDays !== null && diffDays < 0)) {
      return {
        tone: 'danger' as const,
        message:
          "Votre abonnement est expiré. Renouvelez votre plan pour conserver l'accès aux fonctionnalités.",
        daysLeft: diffDays,
      }
    }

    if (diffDays !== null && diffDays <= 7) {
      return {
        tone: 'warning' as const,
        message: `Votre abonnement expirera dans ${diffDays} jour${
          diffDays > 1 ? 's' : ''
        }.`,
        daysLeft: diffDays,
      }
    }

    return { message: null, tone: null, daysLeft: diffDays }
  }, [expiresAtRaw, subscriptionStatus])

  if (!message || !tone) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-linear-to-r from-primary/90 via-indigo-700 to-sky-500 p-5 shadow-lg shadow-primary/30">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.5),transparent_65%)] blur-3xl opacity-80" />
        <div className="relative flex flex-col gap-2 text-sm text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/80">
            <Sparkles className="h-4 w-4" />
            GymWatch Plan {planLabel} {isDemo ? '(Démo)' : null}
          </div>
          <p className="text-base font-semibold">
            {planLabel} · {intervalLabel}
          </p>
          <p className="text-white/85">
            {isDemo && demoEndsAtRaw
              ? `Compte démo actif jusqu'au ${new Date(
                  demoEndsAtRaw
                ).toLocaleDateString('fr-FR')}`
              : "Merci d'utiliser GymWatch."}
          </p>
        </div>
      </div>
    )
  }
return (
  <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-linear-to-r from-[#FFE7C7] via-[#FED7AA] to-[#FDBA74] p-5 text-slate-900 shadow-md">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),transparent_70%)] blur-xl opacity-70" />

    <div className="relative flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-600">
          <Sparkles className="h-4 w-4 text-slate-500" />
          Plan {planLabel} · {intervalLabel}
        </div>

        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm',
            tone === 'danger'
              ? 'bg-red-200 text-red-800'
              : 'bg-orange-200 text-orange-800'
          )}
        >
          {tone === 'danger' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CalendarClock className="h-4 w-4" />
          )}
          {tone === 'danger' ? 'Action requise' : 'Rappel'}
        </div>
      </div>

      <p className="text-base font-semibold leading-relaxed text-slate-800">
        {message}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        {typeof daysLeft === 'number' && daysLeft >= 0 && (
          <span className="rounded-full border border-slate-300 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            {daysLeft} jour{daysLeft > 1 ? 's' : ''} restants
          </span>
        )}

        <a
          href="/dashboard/settings"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white/70 px-4 py-1 text-sm font-semibold backdrop-blur transition hover:bg-white"
        >
          Gérer mon abonnement
        </a>
      </div>
    </div>
  </div>
)

}
