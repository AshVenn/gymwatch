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
import { MoreVertical, Plus, Edit2, Trash2, QrCode, FileDown } from 'lucide-react'
import QRCode from 'qrcode'
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner/dist/types'
import type { IScannerProps } from '@yudiel/react-qr-scanner/dist/components/Scanner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'

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
}

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  isActive: boolean
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
    planId: '',
    startDate: '',
  })

  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { hasQrTools, hasQrDownloads, hasCsvReports } = usePlanFeatures()
  const [qrMember, setQrMember] = useState<Member | null>(null)
  const [qrImage, setQrImage] = useState<string>('')
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [scanStatus, setScanStatus] = useState<{ status: 'success' | 'error'; message: string } | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const [memberReportLoading, setMemberReportLoading] = useState<string | null>(null)

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
    if (lastTokenRef.current === token) return
    lastTokenRef.current = token
    try {
      const response = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!response.ok) {
        throw new Error('Scan invalide')
      }
      const payload = await response.json()
      const fullName = `${payload.member?.firstName ?? ''} ${payload.member?.lastName ?? ''}`.trim()
      const success = Boolean(payload.active)
      setScanStatus({
        status: success ? 'success' : 'error',
        message: success
          ? `Acces valide pour ${fullName || 'ce membre'}.`
          : `Abonnement inactif pour ${fullName || 'ce membre'}.`,
      })
      playTone(success ? 880 : 240)
    } catch {
      setScanStatus({ status: 'error', message: 'QR invalide ou membre introuvable.' })
      playTone(180)
    } finally {
      setTimeout(() => {
        lastTokenRef.current = null
      }, 1500)
    }
  }

  const toggleScanner = () => setScannerEnabled((prev) => !prev)

  const downloadMemberReport = async (memberId: string) => {
    try {
      setMemberReportLoading(memberId)
      const response = await fetch(`/api/reports/csv?type=member&memberId=${memberId}`)
      if (!response.ok) {
        throw new Error('Export impossible')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `member-${memberId}-${Date.now()}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Impossible de telecharger le rapport membre')
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


  // 🔒 Authentication checks
  if (status === 'loading') return <div>Chargement de l'utilisateur...</div>

  if (status === 'unauthenticated')
    return <div className="text-red-500 font-medium">Accès refusé.</div>

  if (!session?.user?.gymId)
    return (
      <div className="text-red-500 font-medium">
        Aucun gymnase associé à votre compte.
      </div>
    )

  const gymId = session.user.gymId
  const membersQueryKey = useMemo(() => ['members', gymId] as const, [gymId])
  const plansQueryKey = useMemo(() => ['plans', gymId] as const, [gymId])

  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
  } = useQuery<Member[]>({
    queryKey: membersQueryKey,
    enabled: status === 'authenticated',
    queryFn: async () => {
      const response = await fetch('/api/members')

      if (!response.ok) {
        throw new Error('Impossible de charger les membres')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const memberPagination = usePagination(members, 10)

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: plansQueryKey,
    enabled: status === 'authenticated',
    queryFn: async () => {
      const response = await fetch('/api/plans')
      if (!response.ok) {
        throw new Error('Impossible de charger les plans')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const saveMemberMutation = useMutation({
    mutationFn: async () => {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/members/${editingId}` : '/api/members'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
          toast.success(editingId ? 'Membre mis à jour avec succès' : 'Nouveau membre ajouté !')
        },

    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.'
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
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Impossible de supprimer le membre'
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
      planId: '',
      startDate: '',
    })
    setIsOpen(true)
  }

  const handleEditMember = (member: Member) => {
    setEditingId(member.id)
    setFormData({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      planId: '',
      startDate: '',
    })
    setIsOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error('Prénom et Nom obligatoires.')
      return
    }

    saveMemberMutation.mutate()
  }

  const handleDeleteMember = (memberId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      deleteMemberMutation.mutate(memberId)
    }
  }

  if (membersLoading) return <div>Chargement des membres...</div>

  return (
    <div className="space-y-6">
      {(error || membersError) && (
        <div className="text-red-500 font-medium">
          {error || 'Impossible de charger les membres.'}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Membres</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les membres de votre salle
          </p>
        </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleAddMember}>
            <Plus className="mr-2" size={20} />
            Ajouter un membre
          </Button>
        </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier le membre' : 'Ajouter un membre'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
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
                    onValueChange={(value) => setFormData({ ...formData, planId: value })}
                  >
                    <SelectTrigger id="member-plan">
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {plans.map((plan) => (
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
                />
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={saveMemberMutation.isPending}>
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

      {hasQrTools ? (
        <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">QR codes membres</p>
              <p className="text-sm text-muted-foreground">
                Scannez un membre pour verifier instantanement son abonnement.
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
                    onError={(error) => console.error(error)}
                    styles={{
                      container: {
                        width: "100%",
                      },
                    }}
                  />
              </div>
              <div className="rounded-xl border bg-background/80 p-4">
                {scanStatus ? (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                      scanStatus.status === 'success'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-red-300 bg-red-50 text-red-900'
                    }`}
                  >
                    {scanStatus.message}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Positionnez un QR code devant la camera pour voir le resultat du scan.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-500/10 p-4 text-sm text-amber-900">
          L'outil de generation et de scan de QR codes est reserve au plan Pro.
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Prénom</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {memberPagination.data.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.firstName}</TableCell>
                <TableCell>{member.lastName}</TableCell>
                <TableCell>{member.email || '-'}</TableCell>
                <TableCell>{member.phone || '-'}</TableCell>
                <TableCell>
                  {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleEditMember(member)}>
                        <Edit2 className="mr-2" size={16} />
                        Modifier
                      </DropdownMenuItem>
                      {hasQrTools && (
                        <DropdownMenuItem onSelect={() => setQrMember(member)}>
                          <QrCode className="mr-2" size={16} />
                          QR code membre
                        </DropdownMenuItem>
                      )}
                      {hasCsvReports && (
                        <DropdownMenuItem
                          disabled={memberReportLoading === member.id}
                          onSelect={() => downloadMemberReport(member.id)}
                        >
                          <FileDown className="mr-2" size={16} />
                          {memberReportLoading === member.id ? 'Export...' : 'Stats CSV'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => handleDeleteMember(member.id)}
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
      <PaginationControls
        page={memberPagination.page}
        pageCount={memberPagination.pageCount}
        onPageChange={memberPagination.setPage}
        totalItems={members.length}
      />
    </div>

      <Dialog open={Boolean(qrMember)} onOpenChange={(open) => !open && setQrMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR membre</DialogTitle>
            <DialogDescription>
              {qrMember ? `${qrMember.firstName} ${qrMember.lastName}` : 'QR code membre'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrImage ? (
              <img src={qrImage} alt="QR membre" className="rounded-xl border bg-white p-3" />
            ) : (
              <p className="text-sm text-muted-foreground">Generation du QR en cours...</p>
            )}
            {qrMember && (
              <p className="text-xs text-muted-foreground break-all">Token: {qrMember.qrToken}</p>
            )}
            {hasQrDownloads && (
              <Button onClick={downloadQrImage} disabled={!qrImage}>
                Telecharger le QR
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
