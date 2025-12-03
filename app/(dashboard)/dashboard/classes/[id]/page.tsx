'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClassForm, ClassFormValues } from '@/components/dashboard/classes/class-form'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { toast } from 'sonner'
import { ArrowLeft, Clock, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

type BookingStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED'

type Member = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
}

type Booking = {
  id: string
  status: BookingStatus
  position: number
  createdAt: string
  member: Member
}

type ClassDetail = {
  id: string
  title: string
  coach: string | null
  room: string | null
  capacity: number
  startAt: string
  endAt: string
  waitlist: boolean
  gymVariantId: string
  gymVariant?: { id: string; name: string }
  confirmedCount: number
  waitlistCount: number
  bookings: Booking[]
}

const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const combineDateTime = (date: string, time: string) => {
  if (!date || !time) return null
  const composed = new Date(`${date}T${time}`)
  return Number.isNaN(composed.getTime()) ? null : composed
}

const statusLabels: Record<BookingStatus, string> = {
  CONFIRMED: 'Confirme',
  WAITLISTED: 'Attente',
  CANCELLED: 'Annule',
}

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { hasCourses } = usePlanFeatures()
  const {
    variants,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
  } = useVariantOptions()

  const gymId = session?.user?.gymId ?? null
  const [editOpen, setEditOpen] = useState(false)
  const [editValues, setEditValues] = useState<ClassFormValues>({
    title: '',
    coach: '',
    room: '',
    capacity: '0',
    date: toDateInput(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    waitlist: true,
    gymVariantId: '',
  })
  const [selectedMember, setSelectedMember] = useState<string>('')

  const classQueryKey = useMemo(() => ['class-detail', params.id], [params.id])

  const detailQuery = useQuery<ClassDetail>({
    queryKey: classQueryKey,
    enabled: status === 'authenticated' && hasCourses,
    queryFn: async () => {
      const response = await fetch(`/api/classes/${params.id}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de charger le cours')
      }
      return data
    },
  })

  const membersQuery = useQuery<Member[]>({
    queryKey: ['members', gymId, detailQuery.data?.gymVariantId],
    enabled: Boolean(gymId && detailQuery.data?.gymVariantId && hasCourses),
    queryFn: async () => {
      const paramsQuery = new URLSearchParams()
      if (detailQuery.data?.gymVariantId) {
        paramsQuery.set('variantId', detailQuery.data.gymVariantId)
      }
      const response = await fetch(`/api/members${paramsQuery.toString() ? `?${paramsQuery.toString()}` : ''}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de charger les membres')
      }
      return Array.isArray(data) ? data : []
    },
  })

  useEffect(() => {
    if (!detailQuery.data) return
    const start = new Date(detailQuery.data.startAt)
    const end = new Date(detailQuery.data.endAt)
    const toTimeInput = (value: Date) =>
      `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`

    setEditValues({
      title: detailQuery.data.title,
      coach: detailQuery.data.coach ?? '',
      room: detailQuery.data.room ?? '',
      capacity: String(detailQuery.data.capacity),
      date: toDateInput(start),
      startTime: toTimeInput(start),
      endTime: toTimeInput(end),
      waitlist: detailQuery.data.waitlist,
      gymVariantId: detailQuery.data.gymVariantId,
    })
  }, [detailQuery.data])

  const addBooking = useMutation({
    mutationFn: async () => {
      if (!selectedMember) {
        throw new Error('Choisissez un membre')
      }
      const response = await fetch(`/api/classes/${params.id}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMember }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Reservation impossible')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      toast.success('Reservation enregistree')
      setSelectedMember('')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Reservation impossible'
      toast.error(message)
    },
  })

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/classes/${params.id}/bookings/${bookingId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Annulation impossible')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      toast.success('Reservation annulee')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Annulation impossible'
      toast.error(message)
    },
  })

  const updateClass = useMutation({
    mutationFn: async () => {
      const startAt = combineDateTime(editValues.date, editValues.startTime)
      const endAt = combineDateTime(editValues.date, editValues.endTime)
      if (!startAt || !endAt) {
        throw new Error('Date ou heure invalide')
      }
      const variantId = isGymAdmin
        ? lockedVariantId
        : editValues.gymVariantId || defaultVariantId || detailQuery.data?.gymVariantId
      if (!variantId) {
        throw new Error('Variante obligatoire')
      }
      const response = await fetch(`/api/classes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editValues.title,
          coach: editValues.coach || null,
          room: editValues.room || null,
          capacity: Number(editValues.capacity),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          waitlist: editValues.waitlist,
          gymVariantId: variantId,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Mise a jour impossible')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      toast.success('Cours mis a jour')
      setEditOpen(false)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Mise a jour impossible'
      toast.error(message)
    },
  })

  const deleteClass = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/classes/${params.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Suppression impossible')
      }
    },
    onSuccess: () => {
      toast.success('Cours supprime')
      router.push('/dashboard/classes')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Suppression impossible'
      toast.error(message)
    },
  })

  const renderStatusBadge = (status: BookingStatus) => {
    const variant = status === 'CONFIRMED' ? 'default' : status === 'WAITLISTED' ? 'secondary' : 'outline'
    return <Badge variant={variant}>{statusLabels[status]}</Badge>
  }

  const renderContent = () => {
    if (status === 'loading' || detailQuery.isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )
    }

    if (status === 'unauthenticated') {
      return <div className="text-red-500 font-medium">Acces refuse.</div>
    }

    if (!gymId) {
      return <div className="text-red-500 font-medium">Aucun gym associe.</div>
    }

    if (!hasCourses) {
      return (
        <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-500/10 p-4 text-sm text-amber-900">
          La gestion des cours est reservee au plan Complex.
        </div>
      )
    }

    if (detailQuery.isError || !detailQuery.data) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          Impossible de charger le cours.
        </div>
      )
    }

    const course = detailQuery.data
    const start = new Date(course.startAt)
    const end = new Date(course.endAt)
    const timeRange = `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
    const booked = course.confirmedCount ?? 0
    const waitlist = course.waitlistCount ?? 0
    const freeSpots = Math.max(0, course.capacity - booked)

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/classes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <p className="text-sm text-muted-foreground">
                {start.toLocaleDateString('fr-FR')} · {timeRange}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {course.gymVariant?.name ? <Badge variant="secondary">{course.gymVariant.name}</Badge> : null}
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Supprimer ce cours ?')) {
                  deleteClass.mutate()
                }
              }}
              disabled={deleteClass.isPending}
            >
              {deleteClass.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Supprimer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
            <p className="text-sm text-muted-foreground">Capacite</p>
            <p className="mt-1 text-2xl font-semibold">{course.capacity} places</p>
            <p className="text-xs text-muted-foreground">
              {booked} confirmes · {waitlist} attente · {freeSpots} libres
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
            <p className="text-sm text-muted-foreground">Coach</p>
            <p className="mt-1 text-2xl font-semibold">{course.coach || 'Non renseigne'}</p>
            <p className="text-xs text-muted-foreground">Salle: {course.room || 'A definir'}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
            <p className="text-sm text-muted-foreground">Liste d attente</p>
            <p className="mt-1 text-2xl font-semibold">{course.waitlist ? 'Activee' : 'Desactivee'}</p>
            <p className="text-xs text-muted-foreground">Reservation prioritaire par ordre d arrivee</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">Ajouter une reservation</p>
              <p className="text-sm text-muted-foreground">Limite: {course.capacity} participants</p>
            </div>
            <div className="flex items-end gap-2">
              <div className="grid gap-1">
                <Label htmlFor="member">Membre</Label>
                <Select
                  value={selectedMember}
                  onValueChange={setSelectedMember}
                  disabled={addBooking.isPending || membersQuery.isLoading || membersQuery.isError}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Choisir un membre" />
                  </SelectTrigger>
                  <SelectContent>
                    {(membersQuery.data ?? []).map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => addBooking.mutate()} disabled={addBooking.isPending || !selectedMember}>
                {addBooking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Ajouter
              </Button>
            </div>
          </div>
          {membersQuery.isError ? (
            <p className="text-sm text-destructive">Impossible de charger les membres.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {membersQuery.isLoading ? 'Chargement des membres...' : `${membersQuery.data?.length ?? 0} membres disponibles`}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-muted-foreground">
                <TableHead>Membre</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Ajoute le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-semibold">
                    {booking.member.firstName} {booking.member.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {booking.member.email || booking.member.phone || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(booking.status)}
                      {booking.status === 'WAITLISTED' && booking.position > 0 ? (
                        <span className="text-xs text-muted-foreground">Position {booking.position}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(booking.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={booking.status === 'CANCELLED' || cancelBooking.isPending}
                      onClick={() => cancelBooking.mutate(booking.id)}
                    >
                      {booking.status === 'CANCELLED' ? 'Annule' : 'Annuler'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {course.bookings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Aucune reservation pour ce cours.</p>
          ) : null}
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>Modifier le cours</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ClassForm
                values={editValues}
                onChange={setEditValues}
                variants={variants}
                isGymAdmin={isGymAdmin}
                lockedVariantId={lockedVariantId}
                defaultVariantId={defaultVariantId}
                disabled={updateClass.isPending}
              />
              <Button onClick={() => updateClass.mutate()} disabled={updateClass.isPending} className="w-full">
                {updateClass.isPending ? 'Mise a jour...' : 'Enregistrer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return renderContent()
}
