"use client"

import { useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X } from "lucide-react"

interface QrAnimationProps {
  status: "success" | "error" | null
  memberName: string
  message: string
  daysRemaining?: number
  onClose: () => void
}

export function QrSuccessErrorAnimation({ status, memberName, message, daysRemaining, onClose }: QrAnimationProps) {
  const isSuccess = status === "success"

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
            panel: "bg-primary/10 border border-primary/30 shadow-primary/30",
            iconBg: "bg-primary/15",
            iconColor: "text-primary",
            accentBg: "bg-primary/10",
            accentText: "text-primary",
            ringColor: "border-primary/25",
          }
        : {
            panel: "bg-destructive/10 border border-destructive/30 shadow-destructive/20",
            iconBg: "bg-destructive/15",
            iconColor: "text-destructive",
            accentBg: "bg-destructive/10",
            accentText: "text-destructive",
            ringColor: "border-destructive/25",
          },
    [isSuccess],
  )

  const displayName = memberName?.trim() || (isSuccess ? "Validation réussie" : "Scanner")

  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/20 backdrop-blur-sm"
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                className={`absolute rounded-full border-2 ${styles.ringColor}`}
                style={{
                  width: `${180 + ring * 90}px`,
                  height: `${180 + ring * 90}px`,
                }}
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.15, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: ring * 0.25,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: "spring", damping: 22, stiffness: 280, duration: 0.4 }}
            className={`pointer-events-auto relative flex w-full max-w-md flex-col items-center rounded-3xl px-6 py-10 md:px-8 md:py-12 text-center shadow-2xl backdrop-blur-lg ${styles.panel}`}
          >
            <motion.div
              className={`absolute inset-0 rounded-3xl ${isSuccess ? "bg-primary/8" : "bg-destructive/8"} blur-3xl`}
              animate={{
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 2.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />

            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
              className={`relative mb-6 rounded-full p-6 ${styles.iconBg} shadow-lg ring-1 ring-black/5`}
            >
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: 0.4,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-current opacity-15"
              />
              {isSuccess ? (
                <Check className={`relative h-16 w-16 ${styles.iconColor}`} strokeWidth={2.5} />
              ) : (
                <X className={`relative h-16 w-16 ${styles.iconColor}`} strokeWidth={2.5} />
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className={`relative text-xl md:text-2xl font-bold tracking-wide ${styles.iconColor}`}
            >
              {displayName}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="relative mt-3 text-sm md:text-base text-muted-foreground leading-relaxed px-2"
            >
              {message}
            </motion.p>

            {isSuccess && typeof daysRemaining === "number" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className={`relative mt-6 rounded-xl px-6 py-3 ${styles.accentBg} shadow-md ring-1 ring-black/5`}
              >
                <p className={`text-sm font-semibold ${styles.accentText}`}>
                  {daysRemaining} jour{daysRemaining > 1 || daysRemaining === 0 ? "s" : ""} restant
                  {daysRemaining > 1 || daysRemaining === 0 ? "s" : ""}
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
