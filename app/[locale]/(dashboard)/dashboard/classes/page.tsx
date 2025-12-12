'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, Clock, Eye, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ClassForm, ClassFormValues } from '@/components/dashboard/classes/class-form'
import { WeekCalendar } from '@/components/dashboard/classes/week-calendar'
import { buildFeatureAccessItems, LockedFeatureState } from '@/components/dashboard/feature-access-grid'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import { VariantSelector } from '@/components/dashboard/variant-selector'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'

type ClassSession = {
  id: string
  title: string
  coach: string | null
  room: string | null
  capacity: number
  startAt: string
  endAt: string
  waitlist: boolean
  gymVariantId: string
  gymVariant?: { id: string; name: string; slug: string }
  confirmedCount?: number
  waitlistCount?: number
}

const startOfWeek = (value: Date) => {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfWeek = (value: Date) => {
  const start = startOfWeek(value)
  start.setDate(start.getDate() + 6)
  start.setHours(23, 59, 59, 999)
  return start
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

export default function ClassesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { tier, hasAccessControl, hasPresence, hasCourses, hasExcelReports } = usePlanFeatures()
  const t = useTranslations('dashboard.classes')
  const tNav = useTranslations('dashboard.nav')
  const tFeatureAccess = useTranslations('dashboard.featureAccess')
  const locale = useLocale()

  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()))
  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart])

  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions()

  const gymId = session?.user?.gymId ?? null
  const variantFilter = selectedVariant === 'all' ? null : selectedVariant

  const planLabelKey =
    tier === 'ENTERPRISE' ? 'enterprise' : tier === 'PRO' ? 'pro' : 'basic'
  const planLabel = t(`planLabel.${planLabelKey}`)

  const featureItems = useMemo(
    () =>
      buildFeatureAccessItems({
        hasAccessControl,
        hasPresence,
        hasCourses,
        hasExcelReports,
        t: tFeatureAccess,
      }),
    [hasAccessControl, hasCourses, hasExcelReports, hasPresence, tFeatureAccess],
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<ClassFormValues>({
    title: '',
    coach: '',
    room: '',
    capacity: '10',
    date: toDateInput(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    waitlist: true,
    gymVariantId: '',
  })

  useEffect(() => {
    if (editingId) return
    if (isGymAdmin && lockedVariantId) {
      setFormValues((prev) => ({ ...prev, gymVariantId: lockedVariantId }))
      return
    }
    if (selectedVariant && selectedVariant !== 'all') {
      setFormValues((prev) => ({ ...prev, gymVariantId: selectedVariant }))
    } else if (defaultVariantId) {
      setFormValues((prev) => ({ ...prev, gymVariantId: defaultVariantId }))
    }
  }, [defaultVariantId, editingId, isGymAdmin, lockedVariantId, selectedVariant])

  const classQueryKey = useMemo(
    () => ['classes', gymId, variantFilter, weekStart.toISOString()] as const,
    [gymId, variantFilter, weekStart],
  )

  const classesQuery = useQuery<ClassSession[]>({
    queryKey: classQueryKey,
    enabled: status === 'authenticated' && Boolean(gymId) && hasCourses,
    queryFn: async () => {
      const params = new URLSearchParams({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      })
      if (variantFilter) {
        params.set('variantId', variantFilter)
      }
      const response = await fetch(`/api/gym-team/classes?${params.toString()}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.load'))
      }
      return Array.isArray(data) ? data : []
    },
  })

  const classes = classesQuery.data ?? []
  const classesPagination = usePagination(classes, 10)

  const saveClass = useMutation({
    mutationFn: async () => {
      const startAt = combineDateTime(formValues.date, formValues.startTime)
      const endAt = combineDateTime(formValues.date, formValues.endTime)
      if (!startAt || !endAt) {
        throw new Error(t('validation.dateTime'))
      }
      const variantId = isGymAdmin
        ? lockedVariantId
        : formValues.gymVariantId ||
          (selectedVariant !== 'all' ? selectedVariant : defaultVariantId) ||
          variants[0]?.id

      if (!variantId) {
        throw new Error(t('validation.variantRequired'))
      }

      const payload = {
        title: formValues.title,
        coach: formValues.coach || null,
        room: formValues.room || null,
        capacity: Number(formValues.capacity),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        gymVariantId: variantId,
        waitlist: formValues.waitlist,
      }

      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/gym-team/classes/${editingId}` : '/api/gym-team/classes'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.save'))
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      setDialogOpen(false)
      setEditingId(null)
      setFormValues((prev) => ({
        ...prev,
        title: '',
        coach: '',
        room: '',
        capacity: '10',
        startTime: '09:00',
        endTime: '10:00',
      }))
      toast.success(t('toasts.saved'))
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('errors.save')
      toast.error(message)
    },
  })

  const deleteClass = useMutation({
    mutationFn: async (classId: string) => {
      const response = await fetch(`/api/gym-team/classes/${classId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('errors.delete'))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classQueryKey })
      toast.success(t('toasts.deleted'))
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('errors.delete')
      toast.error(message)
    },
  })

  const openCreate = () => {
    setEditingId(null)
    setFormValues({
      title: '',
      coach: '',
      room: '',
      capacity: '10',
      date: toDateInput(weekStart),
      startTime: '09:00',
      endTime: '10:00',
      waitlist: true,
      gymVariantId:
        (selectedVariant !== 'all' ? selectedVariant : '') ||
        lockedVariantId ||
        defaultVariantId ||
        variants[0]?.id ||
        '',
    })
    setDialogOpen(true)
  }

  const openEdit = (course: ClassSession) => {
    const start = new Date(course.startAt)
    const end = new Date(course.endAt)
    const toTimeInput = (value: Date) =>
      `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`

    setEditingId(course.id)
    setFormValues({
      title: course.title,
      coach: course.coach ?? '',
      room: course.room ?? '',
      capacity: String(course.capacity),
      date: toDateInput(start),
      startTime: toTimeInput(start),
      endTime: toTimeInput(end),
      waitlist: course.waitlist,
      gymVariantId: course.gymVariantId,
    })
    setDialogOpen(true)
  }

  const weekLabel = useMemo(() => {
    const format = (date: Date) =>
      date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
    return `${format(weekStart)} → ${format(weekEnd)}`
  }, [locale, weekEnd, weekStart])

  const renderContent = () => {
    if (status === 'loading' || variantsLoading) {
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
        <LockedFeatureState
          title={t('locked.title')}
          description={t('locked.description')}
          planLabel={planLabel}
          items={featureItems}
        />
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{tNav('classes')}</h1>
            <p className="text-muted-foreground">
              {t('page.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <VariantSelector
              variants={variants}
              value={selectedVariant}
              onChange={setSelectedVariant}
              isGymAdmin={isGymAdmin}
              lockedVariantId={lockedVariantId}
              loading={variantsLoading}
            />
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2">
              <CalendarRange size={16} />
              <span className="text-sm font-medium">{weekLabel}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setWeekStart(
                      (prev) =>
                        new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000),
                    )
                  }
                >
                  {t('week.prev')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setWeekStart(
                      (prev) =>
                        new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000),
                    )
                  }
                >
                  {t('week.next')}
                </Button>
              </div>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('actions.new')}
            </Button>
          </div>
        </div>

        {classesQuery.isError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            {t('errors.load')}
          </div>
        ) : (
          <>
            <WeekCalendar
              weekStart={weekStart}
              sessions={classes}
              onSelect={(id) => router.push(`/dashboard/classes/${id}`)}
            />

            <div className="rounded-2xl border border-border/70 bg-card/80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-muted-foreground">
                    <TableHead>{t('table.columns.title')}</TableHead>
                    <TableHead>{t('table.columns.coach')}</TableHead>
                    <TableHead>{t('table.columns.room')}</TableHead>
                    <TableHead>{t('table.columns.schedule')}</TableHead>
                    <TableHead>{t('table.columns.variant')}</TableHead>
                    <TableHead>{t('table.columns.capacity')}</TableHead>
                    <TableHead className="text-right">
                      {t('table.columns.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classesPagination.data.map((course) => {
                    const start = new Date(course.startAt)
                    const end = new Date(course.endAt)
                    const timeRange = `${start.toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} - ${end.toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                    const confirmed = course.confirmedCount ?? 0
                    const waitlist = course.waitlistCount ?? 0

                    return (
                      <TableRow key={course.id}>
                        <TableCell className="font-semibold">
                          {course.title}
                        </TableCell>
                        <TableCell>{course.coach || '-'}</TableCell>
                        <TableCell>{course.room || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock size={14} />
                            <span>
                              {start.toLocaleDateString(locale)}
                            </span>
                            <span>{timeRange}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {course.gymVariant?.name ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              confirmed >= course.capacity
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {confirmed}/{course.capacity}
                          </Badge>
                          {waitlist > 0 ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {t('table.waitlist', { count: waitlist })}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/classes/${course.id}`}
                                  className="flex items-center"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t('table.details')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => openEdit(course)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('table.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => {
                                  if (window.confirm(t('table.confirmDelete'))) {
                                    deleteClass.mutate(course.id)
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('table.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {classes.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  {t('table.emptyWeek')}
                </p>
              ) : null}
              <PaginationControls
                page={classesPagination.page}
                pageCount={classesPagination.pageCount}
                onPageChange={classesPagination.setPage}
                pageSize={classesPagination.pageSize}
                totalItems={classes.length}
              />
            </div>
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? t('dialog.editTitle') : t('dialog.addTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ClassForm
                values={formValues}
                onChange={setFormValues}
                variants={variants}
                isGymAdmin={isGymAdmin}
                lockedVariantId={lockedVariantId}
                defaultVariantId={defaultVariantId}
                disabled={saveClass.isPending}
              />
              <Button
                onClick={() => saveClass.mutate()}
                disabled={saveClass.isPending}
                className="w-full"
              >
                {saveClass.isPending
                  ? t('dialog.submitPending')
                  : editingId
                  ? t('dialog.submitUpdate')
                  : t('dialog.submitCreate')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return renderContent()
}
