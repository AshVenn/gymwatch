"use client"

import { useSession } from "next-auth/react"
import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Edit2, Trash2, QrCode, FileDown, CheckCircle2, LogIn, LogOut } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import QRCode from "qrcode"
import type { IScannerProps } from "@yudiel/react-qr-scanner/dist/components/Scanner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PaginationControls, usePagination } from "@/components/dashboard/pagination-controls"
import { usePlanFeatures } from "@/app/hooks/use-plan-features"
import { useVariantOptions } from "@/app/hooks/use-variants"
import { VariantSelector } from "@/components/dashboard/variant-selector"
import { buildQrUrl, extractQrToken } from "@/lib/qr"

const Scanner = dynamic<IScannerProps>(() => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner), {
  ssr: false,
})

interface Member {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  createdAt: string
  qrToken: string
  lastVisitedAt?: string | null
  gymVariantId?: string
  gymVariant?: { id: string; name: string; slug: string }
}

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  isActive: boolean
  visitsPerDay: number
  gymVariantId?: string
  gymVariant?: { id: string; name: string; slug: string; isDefault?: boolean }
}

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10)
const formatTimeInput = (value: Date) => value.toISOString().slice(11, 16)
const buildDateTimeString = (date: string, time?: string) => {
  if (!date) return null
  const base = time ? new Date(`${date}T${time}`) : new Date(date)
  if (Number.isNaN(base.getTime())) return null
  return base.toISOString()
}

export default function MembersPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)

  const t = useTranslations("dashboard.members")
  const tPresence = useTranslations("dashboard.presence")
  const locale = useLocale()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    planId: "none",
    startDate: "",
  })

  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { hasQrTools, hasQrDownloads, hasExcelReports, hasMultiLocations } = usePlanFeatures()
  const [qrMember, setQrMember] = useState<Member | null>(null)
  const [qrImage, setQrImage] = useState<string>("")
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [scanDirection, setScanDirection] = useState<"IN" | "OUT">("IN")
  const [scanStatus, setScanStatus] = useState<{
    status: "success" | "error"
    message: string
    memberName: string
    daysRemaining?: number
  } | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const [memberReportLoading, setMemberReportLoading] = useState<string | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [visitDialogOpen, setVisitDialogOpen] = useState(false)
  const [visitSearch, setVisitSearch] = useState("")
  const [visitLoading, setVisitLoading] = useState<string | null>(null)
  const [manualCheckoutDialogOpen, setManualCheckoutDialogOpen] = useState(false)
  const [checkoutSearch, setCheckoutSearch] = useState("")
  const [checkoutMember, setCheckoutMember] = useState<Member | null>(null)
  const [checkoutVisitId, setCheckoutVisitId] = useState<string | null>(null)
  const [checkoutDate, setCheckoutDate] = useState<string>(formatInputDate(new Date()))
  const [checkoutTime, setCheckoutTime] = useState<string>(formatTimeInput(new Date()))
  const [checkoutWindowStart, setCheckoutWindowStart] = useState("")
  const [checkoutWindowEnd, setCheckoutWindowEnd] = useState("")
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions({ allowAll: hasMultiLocations })
  const [memberVariantId, setMemberVariantId] = useState<string>("")

  const effectiveMemberVariantId = useMemo(
    () => memberVariantId || defaultVariantId || variants[0]?.id || "",
    [defaultVariantId, memberVariantId, variants],
  )

  const gymId = session?.user?.gymId
  const allowAllVariants = hasMultiLocations || variants.length <= 1
  const variantFilter =
    selectedVariant === "all"
      ? allowAllVariants
        ? null
        : (defaultVariantId ?? variants[0]?.id ?? null)
      : selectedVariant

  const membersQueryKey = useMemo(() => ["members", gymId, variantFilter] as const, [gymId, variantFilter])
  const plansQueryKey = useMemo(() => ["plans", gymId, variantFilter] as const, [gymId, variantFilter])

  const saveMemberMutation = useMutation({
    mutationFn: async () => {
      const method = editingId ? "PUT" : "POST"
      const url = editingId ? `/api/gym-team/members/${editingId}` : "/api/gym-team/members"
      const payload = {
        ...formData,
        planId: formData.planId === "none" ? null : formData.planId,
        startDate: formData.planId === "none" ? null : formData.startDate,
        gymVariantId: effectiveMemberVariantId || undefined,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || t("errors.saveMember"))
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey })
      setIsOpen(false)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        planId: "none",
        startDate: "",
      })
      setEditingId(null)
      setError(null)
      toast.success(editingId ? t("toasts.memberUpdated") : t("toasts.memberCreated"))
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("toasts.saveError")
      setError(message)
      toast.error(message)
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/gym-team/members/${memberId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t("errors.deleteMember"))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey })
      toast.success(t("toasts.memberDeleted"))
      setMemberToDelete(null)
    },
    onError: () => {
      toast.error(t("toasts.deleteError"))
    },
  })

  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
  } = useQuery<Member[]>({
    queryKey: membersQueryKey,
    enabled: status === "authenticated" && !variantsLoading && Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) {
        params.set("variantId", variantFilter)
      }
      const response = await fetch(`/api/gym-team/members${params.toString() ? `?${params.toString()}` : ""}`)

      if (!response.ok) {
        throw new Error(t("errors.loadMembers"))
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: plansQueryKey,
    enabled: status === "authenticated" && !variantsLoading && Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) {
        params.set("variantId", variantFilter)
      }
      const response = await fetch(`/api/gym-team/plans${params.toString() ? `?${params.toString()}` : ""}`)
      if (!response.ok) {
        throw new Error(t("errors.loadPlans"))
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const memberPagination = usePagination(members, 10)

  const visitableMembers = useMemo(() => {
    const term = visitSearch.trim().toLowerCase()
    return members
      .filter((member) => {
        const matchesVariant = !variantFilter || member.gymVariantId === variantFilter
        if (!matchesVariant) return false
        if (!term) return true
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
        return fullName.includes(term) || (member.email ?? "").toLowerCase().includes(term)
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [members, variantFilter, visitSearch])

  const checkoutOptions = useMemo(() => {
    const term = checkoutSearch.trim().toLowerCase()
    return members
      .filter((member) => {
        const matchesVariant = !variantFilter || member.gymVariantId === variantFilter
        if (!matchesVariant) return false
        if (!term) return true
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
        return fullName.includes(term) || (member.email ?? "").toLowerCase().includes(term) || (member.phone ?? "").toLowerCase().includes(term)
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [checkoutSearch, members, variantFilter])

  const availablePlans = useMemo(() => {
    const targetVariant = effectiveMemberVariantId
    return (plans ?? []).filter((plan) => (targetVariant ? plan.gymVariantId === targetVariant : true))
  }, [effectiveMemberVariantId, plans])

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
        const fullName = `${payload.member?.firstName ?? ""} ${payload.member?.lastName ?? ""}`.trim()
        const duration = typeof payload.visit?.durationMinutes === "number" ? payload.visit.durationMinutes : null
        const overstay = Boolean(payload.visit?.isOverMaxDuration)
        const limitLabel =
          typeof payload.visit?.sessionLimitMinutes === "number" && payload.visit.sessionLimitMinutes > 0
            ? `${payload.visit.sessionLimitMinutes} min`
            : null
        const message = overstay
          ? t("scanner.checkout.overstay", {
              limitLabel: limitLabel ?? t("scanner.checkout.sessionLimitLabel"),
            })
          : duration
            ? t("scanner.checkout.successWithDuration", { duration })
            : t("scanner.checkout.success")
        setScanStatus({
          status: overstay ? "error" : "success",
          message,
          memberName: fullName || t("scanner.generic.unknownMember"),
        })
        playTone(overstay ? 360 : 780)
        return
      }

      const fullName = `${payload.member?.firstName ?? ""} ${payload.member?.lastName ?? ""}`.trim()
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
      const daysRemaining = typeof payload.daysRemaining === "number" ? payload.daysRemaining : null
      const message = !active
        ? t("scanner.errors.inactive")
        : blocked
          ? t("scanner.errors.dailyLimit")
          : limitWarning && visitsRemaining !== null
            ? t("scanner.warnings.lastVisitAvailable", {
                remaining: visitsRemaining,
              })
            : t("scanner.success.accessGranted")

      setScanStatus({
        status: success ? "success" : "error",
        message,
        memberName: fullName || t("scanner.generic.unknownMember"),
        daysRemaining: daysRemaining ?? undefined,
      })
      const tone = blocked ? 240 : limitWarning ? 520 : success ? 880 : alreadyVisited ? 520 : 240
      playTone(tone)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("scanner.errors.invalidOrNotFound")
      setScanStatus({
        status: "error",
        message,
        memberName: t("scanner.generic.errorTitle"),
      })
      playTone(180)
    } finally {
      setTimeout(() => {
        lastTokenRef.current = null
      }, 1500)
    }
  }

  const handleScannerError = (error: unknown) => {
    console.error(error)
    const permissionDenied = error instanceof Error && error.name === "NotAllowedError"
    setScanStatus({
      status: "error",
      memberName: t("scanner.generic.scannerTitle"),
      message: permissionDenied ? t("scanner.errors.cameraPermissionDenied") : t("scanner.errors.scanError"),
    })
    setScannerEnabled(false)
    playTone(160)
  }

  const toggleScanner = () => setScannerEnabled((prev) => !prev)

  const downloadMemberReport = async (memberId: string) => {
    try {
      setMemberReportLoading(memberId)
      const params = new URLSearchParams({ type: "member", memberId })
      if (variantFilter) {
        params.set("variantId", variantFilter)
      }
      params.set("locale", locale)
      const response = await fetch(`/api/gym-team/reports/excel?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = (payload as any)?.error || t("reports.errors.exportFailed")
        throw new Error(message)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `member-${memberId}-${Date.now()}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("reports.errors.downloadFailed")
      toast.error(message)
    } finally {
      setMemberReportLoading(null)
    }
  }

  const downloadQrImage = () => {
    if (!qrMember || !qrImage) return
    const anchor = document.createElement("a")
    anchor.href = qrImage
    anchor.download = `${qrMember.firstName}-${qrMember.lastName}-qr.png`
    anchor.click()
  }

  const handleAddMember = () => {
    setEditingId(null)
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      planId: "none",
      startDate: "",
    })
    const fallbackVariant = isGymAdmin
      ? (lockedVariantId ?? "")
      : selectedVariant !== "all"
        ? selectedVariant
        : (defaultVariantId ?? "")
    setMemberVariantId(fallbackVariant ?? "")
    setIsOpen(true)
  }

  const handleEditMember = (member: Member) => {
    setEditingId(member.id)
    setFormData({
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      planId: "none",
      startDate: "",
    })
    setMemberVariantId(member.gymVariantId ?? member.gymVariant?.id ?? lockedVariantId ?? "")
    setIsOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error(t("validation.nameRequired"))
      return
    }
    if (!effectiveMemberVariantId) {
      toast.error(t("validation.variantRequired"))
      return
    }

    saveMemberMutation.mutate()
  }

  const handleDeleteMember = (member: Member) => {
    setMemberToDelete(member)
  }

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      deleteMemberMutation.mutate(memberToDelete.id)
    }
  }

  const markVisit = async (memberId: string) => {
    if (!memberId) return
    try {
      setVisitLoading(memberId)
      const response = await fetch("/api/gym-team/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, markVisit: true }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t("errors.markVisit"))
      }
      const fullName = data.memberName || t("visits.fullNameFallback")
      const visitLimit = typeof data.visitLimit === "number" ? data.visitLimit : null
      const visitsToday = typeof data.visitsToday === "number" ? data.visitsToday : null
      const overDailyLimit =
        typeof (data as any).overDailyLimit === "boolean"
          ? (data as any).overDailyLimit
          : visitLimit !== null && visitLimit > 0 && visitsToday !== null && visitsToday >= visitLimit
      const visitsRemaining =
        typeof (data as any).visitsRemaining === "number" ? Math.max((data as any).visitsRemaining, 0) : null
      const limitState = ((data as any).limitState as string) ?? "OK"
      const limitWarning = limitState === "WARNING"
      const openVisitId = typeof (data as any)?.openVisitId === "string" ? (data as any).openVisitId : null
      const hasOpenVisit = Boolean(openVisitId)
      const blocked = (limitState === "BLOCKED" || overDailyLimit) && !hasOpenVisit

      if (!data.active) {
        toast.error(t("toasts.visitInactive"))
        return
      }

      if (hasOpenVisit) {
        const targetMember = members.find((m) => m.id === memberId)
        if (targetMember) {
          openCheckoutDialog(targetMember, openVisitId ?? undefined)
        }
        toast.warning(t("toasts.checkoutRequired", { name: fullName }))
        setVisitDialogOpen(false)
        return
      }

      if (blocked) {
        toast.error(t("toasts.visitLimitReached", { name: fullName }))
        return
      }

      if (limitWarning) {
        const remainingLabel =
          visitsRemaining !== null ? t("visits.remainingLabel", { remaining: visitsRemaining }) : ""
        toast.warning(
          t("toasts.visitLastOfDay", {
            name: fullName,
            remainingLabel,
          }),
        )
      }

      const remainingLabel =
        visitsRemaining !== null ? t("visits.remainingLabel", { remaining: visitsRemaining }) : ""
      toast.success(
        t("toasts.visitRecorded", {
          name: fullName,
          count: data.todayVisitorCount ?? 0,
          remainingLabel,
        }),
      )
      setVisitDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.markVisit")
      toast.error(message)
    } finally {
      setVisitLoading(null)
    }
  }

  const openCheckoutDialog = (member: Member, visitId?: string | null) => {
    setCheckoutMember(member)
    setCheckoutVisitId(visitId ?? null)
    const now = new Date()
    setCheckoutDate(formatInputDate(now))
    setCheckoutTime(formatTimeInput(now))
    setCheckoutWindowStart("")
    setCheckoutWindowEnd("")
  }

  const closeCheckoutDialog = () => {
    if (checkoutLoading) return
    setCheckoutMember(null)
    setCheckoutVisitId(null)
  }

  const submitManualCheckout = async () => {
    if (!checkoutMember) return
    try {
      setCheckoutLoading(checkoutMember.id)
      const payload: Record<string, unknown> = { direction: "OUT", memberId: checkoutMember.id }
      if (checkoutVisitId) payload.visitId = checkoutVisitId

      const checkoutAtIso = buildDateTimeString(checkoutDate, checkoutTime)
      const windowFromIso = checkoutWindowStart ? buildDateTimeString(checkoutDate, checkoutWindowStart) : null
      const windowToIso = checkoutWindowEnd ? buildDateTimeString(checkoutDate, checkoutWindowEnd) : null

      if (checkoutAtIso) payload.checkoutAt = checkoutAtIso
      if (windowFromIso) payload.rangeFrom = windowFromIso
      if (windowToIso) payload.rangeTo = windowToIso

      const response = await fetch("/api/gym-team/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((body as any)?.error || tPresence("errors.checkout"))
      }

      const segments: string[] = [tPresence("manualCheckout.toasts.base")]
      if ((body as any)?.memberName)
        segments.push(tPresence("manualCheckout.toasts.member", { memberName: (body as any).memberName }))
      if (typeof (body as any)?.durationMinutes === "number")
        segments.push(tPresence("manualCheckout.toasts.duration", { minutes: (body as any).durationMinutes }))

      if ((body as any)?.isOverMaxDuration) {
        segments.push(
          typeof (body as any)?.sessionLimitMinutes === "number"
            ? tPresence("manualCheckout.toasts.limit", { limit: (body as any).sessionLimitMinutes })
            : tPresence("manualCheckout.toasts.overstay"),
        )
      }

      toast.success(segments.filter(Boolean).join(" "))
      setCheckoutMember(null)
      setCheckoutVisitId(null)
      setCheckoutWindowStart("")
      setCheckoutWindowEnd("")
      queryClient.invalidateQueries({ queryKey: membersQueryKey })
    } catch (error) {
      const message = error instanceof Error ? error.message : tPresence("errors.checkout")
      toast.error(message)
    } finally {
      setCheckoutLoading(null)
    }
  }

  useEffect(() => {
    if (!qrMember) return
    let active = true
    setQrImage("")
    const value = (() => {
      try {
        return buildQrUrl(qrMember.qrToken, locale, typeof window !== "undefined" ? window.location.origin : undefined)
      } catch {
        return qrMember.qrToken
      }
    })()
    QRCode.toDataURL(value, { width: 320, margin: 2 }).then((url: string) => {
      if (active) {
        setQrImage(url)
      }
    })
    return () => {
      active = false
    }
  }, [locale, qrMember])

  useEffect(() => {
    if (editingId) return
    if (isGymAdmin && lockedVariantId) {
      setMemberVariantId(lockedVariantId)
      return
    }
    if (selectedVariant && selectedVariant !== "all") {
      setMemberVariantId(selectedVariant)
    } else if (defaultVariantId) {
      setMemberVariantId(defaultVariantId)
    }
  }, [defaultVariantId, editingId, isGymAdmin, lockedVariantId, selectedVariant])

  useEffect(() => {
    if (!allowAllVariants && selectedVariant === "all") {
      const fallback = lockedVariantId ?? defaultVariantId ?? variants[0]?.id ?? "all"
      if (fallback && fallback !== "all") {
        setSelectedVariant(fallback)
      }
    }
  }, [allowAllVariants, defaultVariantId, lockedVariantId, selectedVariant, setSelectedVariant, variants])

  if (status === "loading")
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48 rounded-2xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4 animate-pulse">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-border/60 bg-card/80 p-6">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )

  if (status === "unauthenticated") return <div className="text-red-500 font-medium">{t("page.unauthenticated")}</div>

  if (!gymId) return <div className="text-red-500 font-medium">{t("page.noGym")}</div>

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {(error || membersError) && <div className="text-red-500 font-medium">{error || t("errors.genericMembers")}</div>}

      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{t("page.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("page.description")}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <VariantSelector
            variants={variants}
            value={selectedVariant}
            onChange={setSelectedVariant}
            isGymAdmin={isGymAdmin}
            lockedVariantId={lockedVariantId}
            loading={variantsLoading}
            allowAll={allowAllVariants}
          />

          <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setVisitDialogOpen(true)}>
                <CheckCircle2 className="mr-2" size={18} />
                {t("visitsDialog.trigger")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
              <DialogHeader>
                <DialogTitle>{t("visitsDialog.title")}</DialogTitle>
                <DialogDescription>{t("visitsDialog.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder={t("visitsDialog.searchPlaceholder")}
                  value={visitSearch}
                  onChange={(e) => setVisitSearch(e.target.value)}
                />
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {visitableMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("visitsDialog.empty")}</p>
                  ) : (
                    visitableMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.email || member.phone || t("visitsDialog.noContact")}
                          </p>
                          {member.gymVariant?.name ? (
                            <p className="text-xs text-muted-foreground">
                              {t("visitsDialog.variantLabel", {
                                variant: member.gymVariant.name,
                              })}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={visitLoading === member.id}
                          onClick={() => markVisit(member.id)}
                        >
                          {visitLoading === member.id
                            ? t("visitsDialog.actions.saving")
                            : t("visitsDialog.actions.submit")}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={manualCheckoutDialogOpen} onOpenChange={setManualCheckoutDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                onClick={() => setManualCheckoutDialogOpen(true)}
                className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <LogOut className="mr-2" size={18} />
                {tPresence("manualCheckout.trigger")}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
              <DialogHeader>
                <DialogTitle>{tPresence("manualCheckout.title")}</DialogTitle>
                <DialogDescription>{tPresence("manualCheckout.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder={t("visitsDialog.searchPlaceholder")}
                  value={checkoutSearch}
                  onChange={(event) => setCheckoutSearch(event.target.value)}
                />
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {checkoutOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("visitsDialog.empty")}</p>
                  ) : (
                    checkoutOptions.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.email || member.phone || t("visitsDialog.noContact")}
                          </p>
                          {member.gymVariant?.name ? (
                            <p className="text-xs text-muted-foreground">
                              {t("visitsDialog.variantLabel", {
                                variant: member.gymVariant.name,
                              })}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            openCheckoutDialog(member)
                            setManualCheckoutDialogOpen(false)
                          }}
                        >
                          {tPresence("manualCheckout.trigger")}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddMember}>
                <Plus className="mr-2" size={20} />
                {t("form.addMember")}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? t("form.editTitle") : t("form.addTitle")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="member-variant">{t("form.variantLabel")}</Label>
                  {isGymAdmin ? (
                    <p className="text-sm text-muted-foreground">
                      {variants.find((variant) => variant.id === lockedVariantId)?.name ??
                        t("form.assignedVariantFallback")}
                    </p>
                  ) : (
                    <Select value={effectiveMemberVariantId} onValueChange={(value) => setMemberVariantId(value)}>
                      <SelectTrigger id="member-variant">
                        <SelectValue placeholder={t("form.variantPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(variants ?? []).map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name}
                            {variant.isDefault ? ` ${t("form.defaultTag")}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="member-first-name">{t("form.firstName.label")}</Label>
                  <Input
                    id="member-first-name"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="member-last-name">{t("form.lastName.label")}</Label>
                  <Input
                    id="member-last-name"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="member-email">{t("form.email.label")}</Label>
                  <Input
                    id="member-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="member-phone">{t("form.phone.label")}</Label>
                  <Input
                    id="member-phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="member-plan">{t("form.plan.label")}</Label>
                  <Select
                    value={formData.planId}
                    onValueChange={(value) => setFormData({ ...formData, planId: value })}
                  >
                    <SelectTrigger id="member-plan">
                      <SelectValue placeholder={t("form.plan.nonePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("form.plan.noneOption")}</SelectItem>
                      {availablePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="member-start-date">{t("form.startDate.label")}</Label>
                  <Input
                    id="member-start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startDate: e.target.value,
                      })
                    }
                    placeholder={t("form.startDate.placeholder")}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={saveMemberMutation.isPending}>
                  {saveMemberMutation.isPending
                    ? t("form.actions.saving")
                    : editingId
                      ? t("form.actions.update")
                      : t("form.actions.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {hasQrTools ? (
        <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">{t("qr.tools.title")}</p>
              <p className="text-sm text-muted-foreground">{t("qr.tools.description")}</p>
            </div>
            <Button variant="outline" onClick={toggleScanner}>
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
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-500/10 p-4 text-sm text-amber-900">
          {t("qr.tools.lockedBanner")}
        </div>
      )}

      <div className="rounded-2xl border border-border/70 bg-card">
        <div className="overflow-x-auto">
          {memberPagination.data.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4 text-sm text-muted-foreground">
              <span>
                {t("table.summary.totalCount", {
                  count: members.length,
                })}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t("table.summary.pageLabel", {
                  page: memberPagination.page,
                  pages: memberPagination.pageCount,
                })}
              </span>
            </div>
          )}
          <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30">
                  <TableHead>{t("table.columns.firstName")}</TableHead>
                  <TableHead>{t("table.columns.lastName")}</TableHead>
                  <TableHead>{t("table.columns.email")}</TableHead>
                  <TableHead>{t("table.columns.phone")}</TableHead>
                  <TableHead>{t("table.columns.createdAt")}</TableHead>
                  <TableHead>{t("table.columns.variant")}</TableHead>
                  <TableHead className="text-right">{t("table.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {memberPagination.data.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.firstName}</TableCell>
                    <TableCell>{member.lastName}</TableCell>
                    <TableCell>{member.email || "-"}</TableCell>
                  <TableCell>{member.phone || "-"}</TableCell>
                  <TableCell>{new Date(member.createdAt).toLocaleDateString(locale)}</TableCell>
                  <TableCell>{member.gymVariant?.name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                onClick={() => markVisit(member.id)}
                                disabled={visitLoading === member.id}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.actions.markVisit")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                onClick={() => handleEditMember(member)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.actions.edit")}</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-full border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                                disabled={!hasQrTools}
                                onClick={() => {
                                  if (!hasQrTools) {
                                    toast.error(t("toasts.qrPlanOnly"))
                                    return
                                  }
                                  setQrMember(member)
                                }}
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.actions.qrCode")}</TooltipContent>
                          </Tooltip>

                          {hasExcelReports ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 rounded-full border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                                  disabled={memberReportLoading === member.id}
                                  onClick={() => downloadMemberReport(member.id)}
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {memberReportLoading === member.id
                                  ? t("table.actions.exportPending")
                                  : t("table.actions.statsExcel")}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive"
                                onClick={() => handleDeleteMember(member)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("table.actions.delete")}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </Card>
        </div>
        <div className="border-t border-border/70 px-4 py-4">
          <PaginationControls
            page={memberPagination.page}
            pageCount={memberPagination.pageCount}
            pageSize={memberPagination.pageSize}
            onPageChange={memberPagination.setPage}
            totalItems={members.length}
          />
        </div>
      </div>

      <Dialog open={Boolean(checkoutMember)} onOpenChange={(open) => (!open ? closeCheckoutDialog() : undefined)}>
        <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{tPresence("manualCheckout.title")}</DialogTitle>
            <DialogDescription>{tPresence("manualCheckout.description")}</DialogDescription>
          </DialogHeader>

          {checkoutMember ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                <p className="font-semibold">
                  {checkoutMember.firstName} {checkoutMember.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {checkoutMember.email || checkoutMember.phone || t("visitsDialog.noContact")}
                </p>
                {checkoutMember.gymVariant?.name ? (
                  <p className="text-xs text-muted-foreground">{checkoutMember.gymVariant.name}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="checkout-date-member">{tPresence("manualCheckout.checkoutDate")}</Label>
                  <Input
                    id="checkout-date-member"
                    type="date"
                    value={checkoutDate}
                    onChange={(event) => setCheckoutDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-time-member">{tPresence("manualCheckout.checkoutTime")}</Label>
                  <Input
                    id="checkout-time-member"
                    type="time"
                    value={checkoutTime}
                    onChange={(event) => setCheckoutTime(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="checkout-window-from-member">{tPresence("manualCheckout.windowFrom")}</Label>
                  <Input
                    id="checkout-window-from-member"
                    type="time"
                    value={checkoutWindowStart}
                    onChange={(event) => setCheckoutWindowStart(event.target.value)}
                    placeholder="08:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-window-to-member">{tPresence("manualCheckout.windowTo")}</Label>
                  <Input
                    id="checkout-window-to-member"
                    type="time"
                    value={checkoutWindowEnd}
                    onChange={(event) => setCheckoutWindowEnd(event.target.value)}
                    placeholder="22:00"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{tPresence("manualCheckout.noOpenVisits")}</p>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={closeCheckoutDialog} disabled={Boolean(checkoutLoading)}>
              {tPresence("manualCheckout.cancel")}
            </Button>
            <Button onClick={submitManualCheckout} disabled={!checkoutMember || Boolean(checkoutLoading)}>
              {checkoutLoading ? tPresence("manualCheckout.submitPending") : tPresence("manualCheckout.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(qrMember)} onOpenChange={(open) => !open && setQrMember(null)}>
        <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("qr.dialog.title")}</DialogTitle>
            <DialogDescription>
              {qrMember
                ? t("qr.dialog.descriptionWithName", {
                    firstName: qrMember.firstName,
                    lastName: qrMember.lastName,
                  })
                : t("qr.dialog.descriptionFallback")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrImage ? (
              <img
                src={qrImage || "/placeholder.svg"}
                alt={t("qr.dialog.imageAlt")}
                className="rounded-xl border bg-white p-3"
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t("qr.dialog.loading")}</p>
            )}
            {qrMember && (
              <p className="text-xs text-muted-foreground break-all">
                {t("qr.dialog.tokenLabel", {
                  token: qrMember.qrToken,
                })}
              </p>
            )}
            {hasQrDownloads && (
              <Button onClick={downloadQrImage} disabled={!qrImage}>
                {t("qr.dialog.download")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(memberToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteMemberMutation.isPending) {
            setMemberToDelete(null)
          }
        }}
      >
        <AlertDialogContent className="max-w-md sm:max-w-lg w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete
                ? t("deleteDialog.descriptionWithName", {
                    firstName: memberToDelete.firstName,
                    lastName: memberToDelete.lastName,
                  })
                : t("deleteDialog.descriptionFallback")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMemberMutation.isPending}>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} disabled={deleteMemberMutation.isPending}>
              {deleteMemberMutation.isPending ? t("deleteDialog.pending") : t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
