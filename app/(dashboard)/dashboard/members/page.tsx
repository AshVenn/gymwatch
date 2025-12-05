'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoreVertical, Plus, Edit2, Trash2, QrCode, FileDown, CheckCircle2, LogIn, LogOut } from 'lucide-react'
import QRCode from 'qrcode'
import type { IScannerProps } from '@yudiel/react-qr-scanner/dist/components/Scanner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { QrSuccessErrorAnimation } from '@/components/dashboard/qr-success-error-animation'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { VariantSelector } from '@/components/dashboard/variant-selector'
import { Skeleton } from '@/components/ui/skeleton'

const Scanner = dynamic<IScannerProps>(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false },
)

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
  gymVariantId?: string
  gymVariant?: { id: string; name: string; slug: string; isDefault?: boolean }
}

export default function MembersPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    planId: 'none',
    startDate: '',
  })

  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { hasQrTools, hasQrDownloads, hasExcelReports, hasMultiLocations } = usePlanFeatures()
  const [qrMember, setQrMember] = useState<Member | null>(null)
  const [qrImage, setQrImage] = useState<string>('')
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [scanDirection, setScanDirection] = useState<'IN' | 'OUT'>('IN')
  const [scanStatus, setScanStatus] = useState<{
    status: 'success' | 'error'
    message: string
    memberName: string
    daysRemaining?: number
  } | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const [memberReportLoading, setMemberReportLoading] = useState<string | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [visitDialogOpen, setVisitDialogOpen] = useState(false)
  const [visitSearch, setVisitSearch] = useState('')
  const [visitLoading, setVisitLoading] = useState<string | null>(null)
  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions({ allowAll: hasMultiLocations })
  const [memberVariantId, setMemberVariantId] = useState<string>('')
  const effectiveMemberVariantId = useMemo(
    () => memberVariantId || defaultVariantId || variants[0]?.id || '',
    [defaultVariantId, memberVariantId, variants],
  )

  useEffect(() => {
    if (!qrMember) return
    let active = true
    setQrImage('')
    QRCode.toDataURL(qrMember.qrToken, { width: 320, margin: 2 }).then((url: string) => {
      if (active) {
        setQrImage(url)
      }
    })
    return () => {
      active = false
    }
  }, [qrMember])

  useEffect(() => {
    if (editingId) return
    if (isGymAdmin && lockedVariantId) {
      setMemberVariantId(lockedVariantId)
      return
    }
    if (selectedVariant && selectedVariant !== 'all') {
      setMemberVariantId(selectedVariant)
    } else if (defaultVariantId) {
      setMemberVariantId(defaultVariantId)
    }
  }, [defaultVariantId, editingId, isGymAdmin, lockedVariantId, selectedVariant])

  const playTone = (frequency: number) => {
    if (typeof window === 'undefined') return
    if (!audioRef.current) {
      audioRef.current = new AudioContext()
    }
    const ctx = audioRef.current
    if (!ctx) return
    if (ctx.state === 'suspended') {
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

  
const handleScan = async (token: string | null) => {
    if (!token || token.length < 10) return
    const tokenKey = `${token}-${scanDirection}`
    if (lastTokenRef.current === tokenKey) return
    lastTokenRef.current = tokenKey
    try {
      const response = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, markVisit: scanDirection === 'IN', direction: scanDirection }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = (payload as any)?.error || 'Scan invalide'
        throw new Error(message)
      }

      if (payload.mode === 'CHECK_OUT') {
        const fullName = `${payload.member?.firstName ?? ''} ${payload.member?.lastName ?? ''}`.trim()
        const duration = typeof payload.visit?.durationMinutes === 'number' ? payload.visit.durationMinutes : null
        const message = duration ? `Sortie enregistree (${duration} min)` : 'Sortie enregistree'
        setScanStatus({
          status: 'success',
          message,
          memberName: fullName || 'Membre inconnu',
        })
        playTone(780)
        return
      }

      const fullName = `${payload.member?.firstName ?? ''} ${payload.member?.lastName ?? ''}`.trim()
      const active = Boolean(payload.active)
      const alreadyVisited = Boolean(payload.alreadyVisited)
      const success = active && !alreadyVisited
      const daysRemaining = typeof payload.daysRemaining === 'number' ? payload.daysRemaining : null
      const message = !active
        ? 'Abonnement inactif'
        : alreadyVisited
          ? "Deja visite aujourd'hui"
          : 'Acces valide'
      setScanStatus({
        status: success ? 'success' : 'error',
        message,
        memberName: fullName || 'Membre inconnu',
        daysRemaining: daysRemaining ?? undefined,
      })
      playTone(success ? 880 : alreadyVisited ? 520 : 240)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QR invalide ou membre introuvable'
      setScanStatus({
        status: 'error',
        message,
        memberName: 'Erreur',
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
    const permissionDenied = error instanceof Error && error.name === 'NotAllowedError'
    setScanStatus({
      status: 'error',
      memberName: 'Scanner QR',
      message: permissionDenied ? 'Permission caméra refusée' : 'Erreur lors du scan',
    })
    setScannerEnabled(false)
    playTone(160)
  }

  const toggleScanner = () => setScannerEnabled((prev) => !prev)

  const downloadMemberReport = async (memberId: string) => {
    try {
      setMemberReportLoading(memberId)
      const params = new URLSearchParams({ type: 'member', memberId })
      if (variantFilter) {
        params.set('variantId', variantFilter)
      }
      const response = await fetch(`/api/reports/excel?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = (payload as any)?.error ?? 'Export impossible'
        throw new Error(message)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `member-${memberId}-${Date.now()}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de telecharger le rapport membre"
      toast.error(message)
    } finally {
      setMemberReportLoading(null)
    }
  }

  const downloadQrImage = () => {
    if (!qrMember || !qrImage) return
    const anchor = document.createElement('a')
    anchor.href = qrImage
    anchor.download = `${qrMember.firstName}-${qrMember.lastName}-qr.png`
    anchor.click()
  }

  // Authentication checks
  if (status === 'loading') return <div>Chargement de l&apos;utilisateur...</div>

  if (status === 'unauthenticated')
    return <div className="text-red-500 font-medium">Accès refusé.</div>

  if (!session?.user?.gymId)
    return (
      <div className="text-red-500 font-medium">
        Aucun gymnase associé à votre compte.
      </div>
    )

  const gymId = session.user.gymId
  const allowAllVariants = hasMultiLocations || variants.length <= 1
  const variantFilter =
    selectedVariant === 'all'
      ? allowAllVariants
        ? null
        : defaultVariantId ?? variants[0]?.id ?? null
      : selectedVariant
  useEffect(() => {
    if (!allowAllVariants && selectedVariant === 'all') {
      const fallback = lockedVariantId ?? defaultVariantId ?? variants[0]?.id ?? 'all'
      if (fallback && fallback !== 'all') {
        setSelectedVariant(fallback)
      }
    }
  }, [allowAllVariants, defaultVariantId, lockedVariantId, selectedVariant, setSelectedVariant, variants])
  const membersQueryKey = useMemo(() => ['members', gymId, variantFilter] as const, [gymId, variantFilter])
  const plansQueryKey = useMemo(() => ['plans', gymId, variantFilter] as const, [gymId, variantFilter])

  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
  } = useQuery<Member[]>({
    queryKey: membersQueryKey,
    enabled: status === 'authenticated' && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) {
        params.set('variantId', variantFilter)
      }
      const response = await fetch(`/api/members${params.toString() ? `?${params.toString()}` : ''}`)

      if (!response.ok) {
        throw new Error('Impossible de charger les membres')
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
        return (
          fullName.includes(term) ||
          (member.email ?? '').toLowerCase().includes(term)
        )
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [members, variantFilter, visitSearch])

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: plansQueryKey,
    enabled: status === 'authenticated' && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) {
        params.set('variantId', variantFilter)
      }
      const response = await fetch(`/api/plans${params.toString() ? `?${params.toString()}` : ''}`)
      if (!response.ok) {
        throw new Error('Impossible de charger les plans')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })
  const availablePlans = useMemo(() => {
    const targetVariant = effectiveMemberVariantId
    return (plans ?? []).filter((plan) =>
      targetVariant ? plan.gymVariantId === targetVariant : true,
    )
  }, [effectiveMemberVariantId, plans])

  const saveMemberMutation = useMutation({
    mutationFn: async () => {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/members/${editingId}` : '/api/members'
      const payload = {
        ...formData,
        planId: formData.planId === 'none' ? null : formData.planId,
        startDate: formData.planId === 'none' ? null : formData.startDate,
        gymVariantId: effectiveMemberVariantId || undefined,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de sauvegarder le membre')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey })
      setIsOpen(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        planId: 'none',
        startDate: '',
      })
      setEditingId(null)
      setError(null)
      toast.success(
        editingId
          ? 'Membre mis à jour avec succès'
          : 'Nouveau membre ajouté !',
      )
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.'
      setError(message)
      toast.error(message)
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Impossible de supprimer le membre')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey })
      toast.success('Membre supprimé avec succès')
      setMemberToDelete(null)
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Impossible de supprimer le membre'
      toast.error(message)
    },
  })

  const handleAddMember = () => {
    setEditingId(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      planId: 'none',
      startDate: '',
    })
    const fallbackVariant = isGymAdmin
      ? lockedVariantId ?? ''
      : selectedVariant !== 'all'
        ? selectedVariant
        : defaultVariantId ?? ''
    setMemberVariantId(fallbackVariant ?? '')
    setIsOpen(true)
  }

  const handleEditMember = (member: Member) => {
    setEditingId(member.id)
    setFormData({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      planId: 'none',
      startDate: '',
    })
    setMemberVariantId(member.gymVariantId ?? member.gymVariant?.id ?? lockedVariantId ?? '')
    setIsOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error('Prénom et Nom obligatoires.')
      return
    }
    if (!effectiveMemberVariantId) {
      toast.error('Choisissez une variante pour ce membre.')
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
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, markVisit: true }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de marquer la visite')
      }
      const fullName = data.memberName || 'Membre'

      if (!data.active) {
        toast.error('Abonnement inactif ou expiré')
      } else if (data.alreadyVisited) {
        toast.warning(`${fullName} déjà comptabilisé aujourd'hui`)
      } else {
        toast.success(
          `${fullName} marqué présent (${
            data.todayVisitorCount ?? 0
          } visites aujourd'hui)`,
        )
      }
      setVisitDialogOpen(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Impossible de marquer la visite'
      toast.error(message)
    } finally {
      setVisitLoading(null)
    }
  }

  if (membersLoading || variantsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <QrSuccessErrorAnimation
        status={scanStatus?.status ?? null}
        memberName={scanStatus?.memberName ?? ''}
        message={scanStatus?.message ?? ''}
        daysRemaining={scanStatus?.daysRemaining}
        onClose={() => setScanStatus(null)}
      />

      {(error || membersError) && (
        <div className="text-red-500 font-medium">
          {error || 'Impossible de charger les membres.'}
        </div>
      )}

      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Membres</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les membres de votre salle
          </p>
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
            lockedMessage="Vue multi-salles et exports reserves au plan Complex"
          />
          <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setVisitDialogOpen(true)}>
                <CheckCircle2 className="mr-2" size={18} />
                Marquer une visite
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
              <DialogHeader>
                <DialogTitle>Marquer un membre présent</DialogTitle>
                <DialogDescription>
                  Recherchez un membre puis enregistrez sa visite du jour.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Rechercher par nom ou email"
                  value={visitSearch}
                  onChange={(e) => setVisitSearch(e.target.value)}
                />
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {visitableMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun membre trouvé.
                    </p>
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
                          {member.email || member.phone || 'Pas de contact'}
                        </p>
                        {member.gymVariant?.name ? (
                          <p className="text-xs text-muted-foreground">Variante : {member.gymVariant.name}</p>
                        ) : null}
                      </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={visitLoading === member.id}
                          onClick={() => markVisit(member.id)}
                        >
                          {visitLoading === member.id
                            ? 'Enregistrement...'
                            : 'Valider'}
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
                Ajouter un membre
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Modifier le membre' : 'Ajouter un membre'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="member-variant">Variante</Label>
                  {isGymAdmin ? (
                    <p className="text-sm text-muted-foreground">
                      {variants.find((variant) => variant.id === lockedVariantId)?.name ?? 'Variante assignée'}
                    </p>
                  ) : (
                    <Select
                      value={effectiveMemberVariantId}
                      onValueChange={(value) => setMemberVariantId(value)}
                    >
                      <SelectTrigger id="member-variant">
                        <SelectValue placeholder="Choisir une variante" />
                      </SelectTrigger>
                      <SelectContent>
                        {(variants ?? []).map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name} {variant.isDefault ? '(par défaut)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="member-first-name">Prénom</Label>
                  <Input
                    id="member-first-name"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="member-last-name">Nom</Label>
                  <Input
                    id="member-last-name"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="member-email">Email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="member-phone">Téléphone</Label>
                  <Input
                    id="member-phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                {/* PLAN */}
                <div>
                  <Label htmlFor="member-plan">Plan</Label>
                  <Select
                    value={formData.planId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, planId: value })
                    }
                  >
                    <SelectTrigger id="member-plan">
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {availablePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* START DATE */}
                <div>
                  <Label htmlFor="member-start-date">Date de début</Label>
                  <Input
                    id="member-start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    placeholder="Choisir une date"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={saveMemberMutation.isPending}
                >
                  {saveMemberMutation.isPending
                    ? 'Enregistrement...'
                    : editingId
                      ? 'Mettre à jour'
                      : 'Ajouter'}
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
              <p className="text-lg font-semibold">QR codes membres</p>
              <p className="text-sm text-muted-foreground">
                Scannez un membre pour vérifier instantanément son abonnement.
              </p>
            </div>
            <Button variant="outline" onClick={toggleScanner}>
              {scannerEnabled ? 'Masquer le scanner' : 'Activer le scanner'}
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
                      width: '100%',
                    },
                  }}
                />
              </div>
              <div className="rounded-xl border bg-background/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Mode</span>
                  <Button
                    size="sm"
                    variant={scanDirection === 'IN' ? 'default' : 'outline'}
                    className="gap-1"
                    onClick={() => setScanDirection('IN')}
                  >
                    <LogIn className="h-4 w-4" />
                    Entree
                  </Button>
                  <Button
                    size="sm"
                    variant={scanDirection === 'OUT' ? 'default' : 'outline'}
                    className="gap-1"
                    onClick={() => setScanDirection('OUT')}
                  >
                    <LogOut className="h-4 w-4" />
                    Sortie
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Positionnez un QR code devant la camera pour voir le resultat du
                  scan.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-500/10 p-4 text-sm text-amber-900">
          L&apos;outil de génération et de scan de QR codes est réservé au plan Pro.
        </div>
      )}

      <div className="rounded-2xl border border-border/70 bg-card">
        <div className="overflow-x-auto">
          {memberPagination.data.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4 text-sm text-muted-foreground">
              <span>
                {members.length} membre{members.length > 1 ? 's' : ''} total
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Page {memberPagination.page} / {memberPagination.pageCount}
              </span>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 text-muted-foreground">
                <TableHead>Prenom</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telephone</TableHead>
                <TableHead>Date d'inscription</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {memberPagination.data.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.firstName}
                  </TableCell>
                  <TableCell>{member.lastName}</TableCell>
                  <TableCell>{member.email || '-'}</TableCell>
                  <TableCell>{member.phone || '-'}</TableCell>
                  <TableCell>
                    {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>{member.gymVariant?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault()
                            markVisit(member.id)
                          }}
                        >
                          <CheckCircle2 className="mr-2" size={16} />
                          Marquer visite
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleEditMember(member)}
                        >
                          <Edit2 className="mr-2" size={16} />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!hasQrTools}
                          onSelect={(event) => {
                            event.preventDefault()
                            if (!hasQrTools) {
                              toast.error('QR code réservé au plan Pro')
                              return
                            }
                            setQrMember(member)
                          }}
                        >
                          <QrCode className="mr-2" size={16} />
                          QR code membre
                        </DropdownMenuItem>
                        {hasExcelReports && (
                          <DropdownMenuItem
                            disabled={memberReportLoading === member.id}
                            onSelect={() => downloadMemberReport(member.id)}
                          >
                            <FileDown className="mr-2" size={16} />
                            {memberReportLoading === member.id
                              ? 'Export...'
                              : 'Stats Excel'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => handleDeleteMember(member)}
                        >
                          <Trash2 className="mr-2" size={16} />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      <Dialog
        open={Boolean(qrMember)}
        onOpenChange={(open) => !open && setQrMember(null)}
      >
        <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>QR membre</DialogTitle>
            <DialogDescription>
              {qrMember
                ? `${qrMember.firstName} ${qrMember.lastName}`
                : 'QR code membre'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrImage ? (
              <img
                src={qrImage || '/placeholder.svg'}
                alt="QR membre"
                className="rounded-xl border bg-white p-3"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Génération du QR en cours...
              </p>
            )}
            {qrMember && (
              <p className="text-xs text-muted-foreground break-all">
                Token: {qrMember.qrToken}
              </p>
            )}
            {hasQrDownloads && (
              <Button onClick={downloadQrImage} disabled={!qrImage}>
                Télécharger le QR
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
            <AlertDialogTitle>Supprimer le membre</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete
                ? `Cette action supprimera ${memberToDelete.firstName} ${memberToDelete.lastName}. Les abonnements actifs resteront conservés.`
                : 'Confirmez la suppression du membre.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMemberMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMember}
              disabled={deleteMemberMutation.isPending}
            >
              {deleteMemberMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


