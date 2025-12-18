'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationControls } from '@/components/dashboard/pagination-controls'
import { useSuperAdminGymMembers } from '@/app/[locale]/(dashboard)/super-admin/hooks'

type Props = {
  gymId: string | null
  gymName?: string
  open: boolean
  onClose: () => void
}

export function GymMembersSheet({ gymId, gymName, open, onClose }: Props) {
  const t = useTranslations('superAdminGymMembers')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const { data, isLoading } = useSuperAdminGymMembers(open ? gymId : null, page, pageSize)

  useEffect(() => {
    if (open) setPage(1)
  }, [open])

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t('title', { name: gymName ?? '' })}</SheetTitle>
          <SheetDescription>{t('subtitle')}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ) : data?.members?.length ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{t('count', { count: data.total })}</span>
              <span className="text-xs uppercase tracking-[0.28em]">
                {t('page', { page: data.page, pages: Math.ceil(data.total / data.pageSize || 1) })}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t('columns.name')}</TableHead>
                    <TableHead>{t('columns.contact')}</TableHead>
                    <TableHead>{t('columns.variant')}</TableHead>
                    <TableHead>{t('columns.joined')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-semibold">
                        {[member.firstName, member.lastName].filter(Boolean).join(' ') || t('unknown')}
                      </TableCell>
                      <TableCell className="space-y-1 text-sm text-muted-foreground">
                        <div>{member.email ?? t('missing')}</div>
                        <div>{member.phone ?? ''}</div>
                      </TableCell>
                      <TableCell>
                        {member.gymVariant ? (
                          <Badge variant="outline" className="border-border/60">
                            {member.gymVariant.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('missing')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationControls
              page={data.page}
              pageCount={Math.ceil((data.total || 0) / data.pageSize)}
              pageSize={data.pageSize}
              totalItems={data.total}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <p className="pt-6 text-sm text-muted-foreground">{t('empty')}</p>
        )}
      </SheetContent>
    </Sheet>
  )
}
