'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SubscriptionBanner() {
  const { data: session } = useSession()
  const subscriptionStatus = session?.user?.subscriptionStatus
  const expiresAtRaw = session?.user?.subscriptionExpiresAt ?? null

  const { message, tone } = useMemo(() => {
    if (!subscriptionStatus) return { message: null, tone: null as null | 'warning' | 'danger' }

    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

    if (subscriptionStatus === 'EXPIRED' || (daysLeft !== null && daysLeft < 0)) {
      return {
        tone: 'danger' as const,
        message:
          "Votre abonnement est arrivé à expiration. Merci de renouveler votre plan pour continuer d'utiliser GymWatch.",
      }
    }

    if (daysLeft !== null && daysLeft <= 7) {
      return {
        tone: 'warning' as const,
        message: `Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Pensez à le renouveler.`,
      }
    }

    return { message: null, tone: null as const }
  }, [expiresAtRaw, subscriptionStatus])

  if (!message || !tone) return null

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium',
        tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      )}
    >
      {tone === 'danger' ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      <span>{message}</span>
    </div>
  )
}
