"use client"

import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { IScannerProps } from "@yudiel/react-qr-scanner/dist/components/Scanner"
import { useTranslations } from "next-intl"
import { LogIn, LogOut, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { extractQrToken } from "@/lib/qr"
import { cn } from "@/lib/utils"

const Scanner = dynamic<IScannerProps>(() => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner), {
  ssr: false,
})

type QrScannerToolsProps = {
  hasQrTools: boolean
  className?: string
}

export function QrScannerTools({ hasQrTools, className }: QrScannerToolsProps) {
  const t = useTranslations("dashboard.members")
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [scanDirection, setScanDirection] = useState<"IN" | "OUT">("IN")
  const lastTokenRef = useRef<string | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const playTone = (frequency: number) => {
    if (typeof window === "undefined") return
    if (!audioRef.current) {
      audioRef.current = new AudioContext()
    }
    const ctx = audioRef.current
    if (!ctx) return
    if (ctx.state === "suspended") {
      ctx.resume()
    }
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.frequency.value = frequency
    gain.gain.value = 0.08
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.2)
  }

  const handleScan = async (rawToken: string | null) => {
    const token = extractQrToken(rawToken ?? "")
    if (!token) return

    const tokenKey = `${token}-${scanDirection}`
    if (lastTokenRef.current === tokenKey) return
    lastTokenRef.current = tokenKey

    try {
      const response = await fetch("/api/gym-team/qr/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          markVisit: scanDirection === "IN",
          direction: scanDirection,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = (payload as any)?.error || t("scanner.errors.invalidScan")
        throw new Error(message)
      }

      if (payload.mode === "CHECK_OUT") {
        const overstay = Boolean(payload.visit?.isOverMaxDuration)
        playTone(overstay ? 360 : 780)
        return
      }

      const active = Boolean(payload.active)
      const visitLimit = typeof payload.visitLimit === "number" ? payload.visitLimit : null
      const visitsToday = typeof payload.visitsToday === "number" ? payload.visitsToday : null
      const overDailyLimit =
        typeof payload.overDailyLimit === "boolean"
          ? payload.overDailyLimit
          : visitLimit !== null && visitLimit > 0 && visitsToday !== null && visitsToday >= visitLimit
      const visitsRemaining = typeof payload.visitsRemaining === "number" ? Math.max(payload.visitsRemaining, 0) : null
      const limitState = (payload.limitState as string) ?? "OK"
      const limitWarning = limitState === "WARNING"
      const blocked = limitState === "BLOCKED" || overDailyLimit
      const alreadyVisited = Boolean(payload.alreadyVisited)
      const success = active && !blocked
      const tone = blocked ? 240 : limitWarning ? 520 : success ? 880 : alreadyVisited ? 520 : 240
      playTone(tone)
    } catch (error) {
      playTone(180)
    } finally {
      setTimeout(() => {
        lastTokenRef.current = null
      }, 1500)
    }
  }

  const handleScannerError = (error: unknown) => {
    console.error(error)
    setScannerEnabled(false)
    playTone(160)
  }

  const toggleScanner = () => setScannerEnabled((prev) => !prev)

  if (!hasQrTools) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-amber-300/60 bg-amber-500/10 p-4 text-sm text-amber-900", className)}>
        {t("qr.tools.lockedBanner")}
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold">{t("qr.tools.title")}</p>
          <p className="text-sm text-muted-foreground">{t("qr.tools.description")}</p>
        </div>
        <Button variant="outline" onClick={toggleScanner} className="w-full md:w-auto">
          <QrCode className="mr-2 h-4 w-4" />
          {scannerEnabled ? t("qr.tools.hideScanner") : t("qr.tools.showScanner")}
        </Button>
      </div>
      {scannerEnabled && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
          <div className="rounded-xl border bg-black/80 p-2">
            <Scanner
              onScan={(results) => handleScan(results[0]?.rawValue ?? null)}
              onError={handleScannerError}
              styles={{
                container: {
                  width: "100%",
                },
              }}
            />
          </div>
          <div className="rounded-xl border bg-background/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                {t("qr.tools.modeLabel")}
              </span>
              <Button
                size="sm"
                variant={scanDirection === "IN" ? "default" : "outline"}
                className="gap-1"
                onClick={() => setScanDirection("IN")}
              >
                <LogIn className="h-4 w-4" />
                {t("qr.tools.modeIn")}
              </Button>
              <Button
                size="sm"
                variant={scanDirection === "OUT" ? "default" : "outline"}
                className="gap-1"
                onClick={() => setScanDirection("OUT")}
              >
                <LogOut className="h-4 w-4" />
                {t("qr.tools.modeOut")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t("qr.tools.helper")}</p>
          </div>
        </div>
      )}
    </div>
  )
}
