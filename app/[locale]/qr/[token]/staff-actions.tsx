'use client'

import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

type ActionDirection = 'IN' | 'OUT'

interface StaffActionsProps {
  token: string
  canCheck: boolean
}

export function StaffActions({ token, canCheck }: StaffActionsProps) {
  const t = useTranslations('qrProfile.actions')
  const [loading, setLoading] = useState<ActionDirection | null>(null)

  const trigger = async (direction: ActionDirection) => {
    if (!canCheck) {
      toast.error(t('disabled'))
      return
    }

    try {
      setLoading(direction)
      const response = await fetch('/api/gym-team/qr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          markVisit: direction === 'IN',
          direction,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((payload as any)?.error || t('error'))
      }

      const fullName = `${payload.member?.firstName ?? ''} ${payload.member?.lastName ?? ''}`.trim()
      toast.success(
        direction === 'IN'
          ? t('success', { name: fullName || t('fallback') })
          : t('checkoutSuccess', { name: fullName || t('fallback') }),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error')
      toast.error(message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => trigger('IN')} disabled={loading !== null} className="rounded-xl">
        <LogIn className="mr-2 h-4 w-4" />
        {loading === 'IN' ? t('saving') : t('checkIn')}
      </Button>
      <Button
        variant="outline"
        onClick={() => trigger('OUT')}
        disabled={loading !== null}
        className="rounded-xl border-border/60"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {loading === 'OUT' ? t('saving') : t('checkOut')}
      </Button>
    </div>
  )
}
