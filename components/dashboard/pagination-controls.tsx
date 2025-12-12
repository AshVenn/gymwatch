'use client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function usePagination<T>(items: readonly T[], pageSize = 10) {
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil((items?.length ?? 0) / pageSize))

  useEffect(() => {
    setPage(1)
  }, [pageSize, items])

  const data = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(next, 1), pageCount))
  }

  return { page, pageCount, pageSize, data, setPage: goToPage }
}

interface PaginationControlsProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  pageSize?: number
  totalItems?: number
  className?: string
}

export function PaginationControls({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize = 10,
  className,
}: PaginationControlsProps) {
  const locale = useLocale()
  const t = useTranslations('pagination')
  const isRTL = locale === 'ar'

  if (pageCount <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems ?? Infinity)

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        'mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 text-sm',
        className
      )}
    >
      <p className="text-muted-foreground">
        {t('pageXofY', { x: page, y: pageCount })}
        {typeof totalItems === 'number' ? (
          <> · {t('rangeOfTotal', { start, end, total: totalItems })}</>
        ) : null}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          {t('prev')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          {t('next')}
        </Button>
      </div>
    </div>
  )
}
