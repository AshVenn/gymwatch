'use client'

import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'

interface QrAnimationProps {
  status: 'success' | 'error' | null
  memberName: string
  message: string
  daysRemaining?: number
  onClose: () => void
}

export function QrSuccessErrorAnimation({
  status,
  memberName,
  message,
  daysRemaining,
  onClose,
}: QrAnimationProps) {
  const isSuccess = status === 'success'

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => {
      onClose()
    }, 3600)
    return () => window.clearTimeout(timer)
  }, [status, onClose])

  const styles = useMemo(
    () =>
      isSuccess
        ? {
            panel: 'bg-primary/15 border border-primary/40 shadow-primary/40',
            iconBg: 'bg-primary/20',
            iconColor: 'text-primary',
            accentBg: 'bg-primary/10',
            accentText: 'text-primary',
          }
        : {
            panel: 'bg-destructive/15 border border-destructive/40 shadow-destructive/30',
            iconBg: 'bg-destructive/20',
            iconColor: 'text-destructive',
            accentBg: 'bg-destructive/10',
            accentText: 'text-destructive',
          },
    [isSuccess],
  )

  const displayName = memberName?.trim() || (isSuccess ? 'Validation réussie' : 'Scanner')

  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <motion.div
            layout
            className={`pointer-events-auto flex max-w-sm flex-col items-center rounded-2xl px-8 py-8 text-center backdrop-blur-xl ${styles.panel}`}
            animate={{
              boxShadow: [
                '0 0 20px rgba(0,0,0,0.12)',
                '0 0 40px rgba(0,0,0,0.22)',
                '0 0 20px rgba(0,0,0,0.12)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
              className={`mb-4 rounded-full p-4 ${styles.iconBg}`}
            >
              {isSuccess ? (
                <Check className={`h-12 w-12 ${styles.iconColor}`} strokeWidth={3} />
              ) : (
                <X className={`h-12 w-12 ${styles.iconColor}`} strokeWidth={3} />
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-lg font-semibold tracking-wide ${styles.iconColor}`}
            >
              {displayName}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-2 text-sm text-muted-foreground"
            >
              {message}
            </motion.p>

            {isSuccess && typeof daysRemaining === 'number' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 }}
                className={`mt-4 rounded-xl px-4 py-2 ${styles.accentBg}`}
              >
                <p className={`text-sm font-medium ${styles.accentText}`}>
                  {daysRemaining} jour{daysRemaining > 1 || daysRemaining === 0 ? 's' : ''} restant
                  {daysRemaining > 1 || daysRemaining === 0 ? 's' : ''}
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
