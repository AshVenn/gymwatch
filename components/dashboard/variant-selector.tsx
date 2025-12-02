'use client'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GymVariantOption } from '@/app/hooks/use-variants'
import { cn } from '@/lib/utils'

type Props = {
  variants: GymVariantOption[]
  value: string
  onChange: (value: string) => void
  isGymAdmin?: boolean
  lockedVariantId?: string | null
  className?: string
  loading?: boolean
}

export function VariantSelector({
  variants,
  value,
  onChange,
  isGymAdmin = false,
  lockedVariantId,
  className,
  loading = false,
}: Props) {
  const lockedVariant = variants.find((variant) => variant.id === lockedVariantId)

  if (isGymAdmin) {
    return (
      <div className={cn('space-y-1 rounded-xl border border-border/70 bg-muted/40 p-3 text-sm', className)}>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Variante</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{lockedVariant?.name ?? 'Variante assignée'}</Badge>
          <span className="text-xs text-muted-foreground">Verrouillée pour ce compte admin</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-semibold">Variante</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="w-[220px] md:w-[260px]">
          <SelectValue placeholder="Toutes les variantes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les variantes</SelectItem>
          {variants.map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              {variant.name} {variant.isDefault ? '(par défaut)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
