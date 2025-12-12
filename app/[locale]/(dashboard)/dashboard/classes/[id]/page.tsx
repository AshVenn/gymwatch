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
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

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

export default function ClassDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { hasCourses } = usePlanFeatures()
  const { variants, isGymAdmin, lockedVariantId, defaultVariantId } = useVariantOptions()
  const t = useTranslations('dashboard.classesDetail')
  const tNav = useTranslations('dashboard.nav')
  const locale = useLocale()

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
      const response = await fetch(`/api/gym-team/classes/${params.id}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.loadClass'))
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
      const response = await fetch(
        `/api/gym-team/members${paramsQuery.toString() ? `?${paramsQuery.toString()}` : ''}`,
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.loadMembers'))
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
        throw new Error(t('errors.chooseMember'))
      }
      const response = await fetch(`/api/gym-team/classes/${params.id}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMember }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.reservation'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      toast.success(t('toasts.reservationSaved'))
      setSelectedMember('')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('errors.reservation')
      toast.error(message)
    },
  })

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(
        `/api/gym-team/classes/${params.id}/bookings/${bookingId}`,
        { method: 'DELETE' },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.cancel'))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      toast.success(t('toasts.reservationCancelled'))
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('errors.cancel')
      toast.error(message)
    },
  })

  const updateClass = useMutation({
    mutationFn: async () => {
      const startAt = combineDateTime(editValues.date, editValues.startTime)
      const endAt = combineDateTime(editValues.date, editValues.endTime)
      if (!startAt || !endAt) {
        throw new Error(t('errors.dateTime'))
      }
      const variantId = isGymAdmin
        ? lockedVariantId
        : editValues.gymVariantId || defaultVariantId || detailQuery.data?.gymVariantId
      if (!variantId) {
        throw new Error(t('errors.variantRequired'))
      }
      const response = await fetch(`/api/gym-team/classes/${params.id}`, {
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
        throw new Error(data.error || t('errors.update'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      toast.success(t('toasts.classUpdated'))
      setEditOpen(false)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('errors.update')
      toast.error(message)
    },
  })

  const deleteClass = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/gym-team/classes/${params.id}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.delete'))
      }
    },
    onSuccess: () => {
      toast.success(t('toasts.classDeleted'))
      router.push('/dashboard/classes')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('errors.delete')
      toast.error(message)
    },
  })

  const renderStatusBadge = (status: BookingStatus) => {
    const variant =
      status === 'CONFIRMED'
        ? 'default'
        : status === 'WAITLISTED'
        ? 'secondary'
        : 'outline'

    const labelKey =
      status === 'CONFIRMED'
        ? 'confirmed'
        : status === 'WAITLISTED'
        ? 'waitlisted'
        : 'cancelled'

    return <Badge variant={variant}>{t(`status.${labelKey}`)}</Badge>
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
      return (
        <div className="text-red-500 font-medium">
          {t('page.unauthenticated')}
        </div>
      )
    }

    if (!gymId) {
      return (
        <div className="text-red-500 font-medium">
          {t('page.noGym')}
        </div>
      )
    }

    if (!hasCourses) {
      return (
        <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-500/10 p-4 text-sm text-amber-900">
          {t('page.enterpriseOnly')}
        </div>
      )
    }

    if (detailQuery.isError || !detailQuery.data) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          {t('errors.loadClass')}
        </div>
      )
    }

    const course = detailQuery.data
    const start = new Date(course.startAt)
    const end = new Date(course.endAt)
    const timeRange = `${start.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${end.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`
    const booked = course.confirmedCount ?? 0
    const waitlist = course.waitlistCount ?? 0
    const freeSpots = Math.max(0, course.capacity - booked)
    const dateLabel = start.toLocaleDateString(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const bookings = [...course.bookings].sort((a, b) => {
      const order: Record<BookingStatus, number> = {
        CONFIRMED: 0,
        WAITLISTED: 1,
        CANCELLED: 2,
      }
      const byStatus = order[a.status] - order[b.status]
      if (byStatus !== 0) return byStatus
      return (
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    })

    return (
      <div className="space-y-6">
        {/* Header / summary */}
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/classes">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('header.back')}
                  </Link>
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold">
                    {course.title}
                  </h1>
                  {course.gymVariant?.name ? (
                    <Badge variant="secondary">
                      {course.gymVariant.name}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span className="capitalize">{dateLabel}</span>
                </div>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{timeRange}</span>
                </div>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span>
                    {course.coach || t('header.coachFallback')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {course.room || t('header.roomFallback')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('header.edit')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm(t('header.confirmDelete'))) {
                    deleteClass.mutate()
                  }
                }}
                disabled={deleteClass.isPending}
              >
                {deleteClass.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {t('header.delete')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{t('stats.title')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{booked}</p>
              <span className="text-sm text-muted-foreground">
                {t('stats.capacityLabel', { capacity: course.capacity })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">
                  {t('stats.waitlistLabel')}
                </p>
                <p className="font-semibold">{waitlist}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('stats.freeLabel')}
                </p>
                <p className="font-semibold">{freeSpots}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  {t('stats.listTitle')}
                </p>
                <Badge variant={course.waitlist ? 'secondary' : 'outline'}>
                  {course.waitlist
                    ? t('stats.listEnabled')
                    : t('stats.listDisabled')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t('schedule.title')}</span>
            </div>
            <p className="text-xl font-semibold">{timeRange}</p>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4" />
              <span>{t('coachRoom.title')}</span>
            </div>
            <p className="text-xl font-semibold">
              {course.coach || t('coachRoom.coachFallback')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('coachRoom.roomLabel')}{' '}
              {course.room || t('coachRoom.roomFallback')}
            </p>
          </div>
        </div>

        {/* Add booking */}
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">
                {t('bookingForm.title')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('bookingForm.subtitle', {
                  booked,
                  waitlist,
                  capacity: course.capacity,
                })}
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="grid gap-1">
                <Label htmlFor="member">{t('bookingForm.memberLabel')}</Label>
                <Select
                  value={selectedMember}
                  onValueChange={setSelectedMember}
                  disabled={
                    addBooking.isPending ||
                    membersQuery.isLoading ||
                    membersQuery.isError
                  }
                >
                  <SelectTrigger className="w-60">
                    <SelectValue
                      placeholder={t('bookingForm.memberPlaceholder')}
                    />
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
              <Button
                onClick={() => addBooking.mutate()}
                disabled={addBooking.isPending || !selectedMember}
              >
                {addBooking.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {t('bookingForm.addButton')}
              </Button>
            </div>
          </div>
          {membersQuery.isError ? (
            <p className="text-sm text-destructive">
              {t('bookingForm.membersLoadError')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {membersQuery.isLoading
                ? t('bookingForm.membersLoading')
                : t('bookingForm.membersCount', {
                    count: membersQuery.data?.length ?? 0,
                  })}
            </p>
          )}
        </div>

        {/* Bookings table */}
        <div className="rounded-2xl border border-border/70 bg-card/80">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-muted-foreground">
                <TableHead>{t('table.columns.member')}</TableHead>
                <TableHead>{t('table.columns.contact')}</TableHead>
                <TableHead>{t('table.columns.status')}</TableHead>
                <TableHead>{t('table.columns.createdAt')}</TableHead>
                <TableHead className="text-right">
                  {t('table.columns.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-semibold">
                    {booking.member.firstName} {booking.member.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {booking.member.email || booking.member.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(booking.status)}
                      {booking.status === 'WAITLISTED' &&
                      booking.position > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {t('table.position', {
                            position: booking.position,
                          })}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(booking.createdAt).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        booking.status === 'CANCELLED' ||
                        cancelBooking.isPending
                      }
                      onClick={() => cancelBooking.mutate(booking.id)}
                    >
                      {booking.status === 'CANCELLED'
                        ? t('table.cancelled')
                        : t('table.cancel')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {bookings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t('table.empty')}
            </p>
          ) : null}
        </div>

        {/* Edit dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[95vw] max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('dialog.editTitle')}</DialogTitle>
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
              <Button
                onClick={() => updateClass.mutate()}
                disabled={updateClass.isPending}
                className="w-full"
              >
                {updateClass.isPending
                  ? t('dialog.submitPending')
                  : t('dialog.submit')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return renderContent()
}
