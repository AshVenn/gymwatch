'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

export interface GymVariantOption {
  id: string
  name: string
  slug: string
  isDefault: boolean
}

export function useVariantOptions() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const lockedVariantId = (session?.user as any)?.gymVariantId as string | undefined
  const isGymAdmin = role === 'GYM_ADMIN'

  const query = useQuery<GymVariantOption[]>({
    queryKey: ['gym-variants', session?.user?.gymId],
    enabled: Boolean(session?.user?.gymId),
    queryFn: async () => {
      const response = await fetch('/api/variants')
      if (!response.ok) {
        throw new Error('Impossible de charger les variantes')
      }
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const [selectedVariant, setSelectedVariant] = useState<string>(
    isGymAdmin && lockedVariantId ? lockedVariantId : 'all',
  )

  useEffect(() => {
    if (isGymAdmin && lockedVariantId) {
      setSelectedVariant(lockedVariantId)
    }
  }, [isGymAdmin, lockedVariantId])

  const defaultVariantId = useMemo(() => {
    const fallback = query.data?.[0]?.id
    return query.data?.find((variant) => variant.isDefault)?.id ?? fallback ?? null
  }, [query.data])

  return {
    variants: query.data ?? [],
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId: lockedVariantId ?? null,
    role,
    defaultVariantId,
    isLoading: query.isLoading,
  }
}
