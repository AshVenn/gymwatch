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
  showPageNumbers?: boolean
  maxPageButtons?: number
}

export function PaginationControls({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize = 10,
  className,
  showPageNumbers = false,
  maxPageButtons = 5,
}: PaginationControlsProps) {
  const locale = useLocale()
  const t = useTranslations('pagination')
  const isRTL = locale === 'ar'

  if (pageCount <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems ?? Infinity)
  const safeMaxButtons = Math.max(5, maxPageButtons)
  const siblings = Math.max(1, Math.floor((safeMaxButtons - 3) / 2))

  const pageItems = useMemo(() => {
    if (!showPageNumbers) return []
    if (pageCount <= safeMaxButtons) {
      return Array.from({ length: pageCount }, (_, idx) => idx + 1)
    }

    const items: Array<number | 'ellipsis'> = []
    const startPage = Math.max(2, page - siblings)
    const endPage = Math.min(pageCount - 1, page + siblings)

    items.push(1)

    if (startPage > 2) items.push('ellipsis')
    for (let current = startPage; current <= endPage; current += 1) {
      items.push(current)
    }
    if (endPage < pageCount - 1) items.push('ellipsis')

    items.push(pageCount)
    return items
  }, [page, pageCount, safeMaxButtons, showPageNumbers, siblings])

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

        {showPageNumbers ? (
          <div className="flex items-center gap-1">
            {pageItems.map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === page ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-8 w-8 px-0"
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              ),
            )}
          </div>
        ) : null}

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
