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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          {/* Animated background rings */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.5 }}
          >
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                className={`absolute rounded-full border-2 ${
                  isSuccess ? 'border-primary/20' : 'border-destructive/20'
                }`}
                style={{
                  width: `${200 + ring * 100}px`,
                  height: `${200 + ring * 100}px`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: ring * 0.2,
                }}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`pointer-events-auto relative flex max-w-sm flex-col items-center rounded-3xl px-8 py-10 text-center shadow-2xl ${styles.panel}`}
          >
            {/* Glowing effect */}
            <motion.div
              className={`absolute inset-0 rounded-3xl ${
                isSuccess ? 'bg-primary/10' : 'bg-destructive/10'
              } blur-2xl`}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 250, delay: 0.1 }}
              className={`relative mb-6 rounded-full p-5 ${styles.iconBg} shadow-lg`}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.3,
                }}
                className="absolute inset-0 rounded-full bg-current opacity-20"
              />
              {isSuccess ? (
                <Check className={`relative h-14 w-14 ${styles.iconColor}`} strokeWidth={3} />
              ) : (
                <X className={`relative h-14 w-14 ${styles.iconColor}`} strokeWidth={3} />
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`relative text-xl font-bold tracking-wide ${styles.iconColor}`}
            >
              {displayName}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="relative mt-3 text-sm text-muted-foreground"
            >
              {message}
            </motion.p>

            {isSuccess && typeof daysRemaining === 'number' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className={`relative mt-6 rounded-xl px-6 py-3 ${styles.accentBg} shadow-md`}
              >
                <p className={`text-sm font-semibold ${styles.accentText}`}>
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
