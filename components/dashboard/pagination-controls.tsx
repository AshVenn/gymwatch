'use client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

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

  return { page, pageCount, data, setPage: goToPage }
}

interface PaginationControlsProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  pageSize?: number
  totalItems?: number
}

export function PaginationControls({
  page,
  pageCount,
  onPageChange,
  totalItems,
}: PaginationControlsProps) {
  if (pageCount <= 1) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} / {pageCount}
        {typeof totalItems === 'number' ? ` • ${totalItems} éléments` : null}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
}
