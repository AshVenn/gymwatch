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
  allowAll?: boolean
  lockedMessage?: string
  helperText?: string
}

export function VariantSelector({
  variants,
  value,
  onChange,
  isGymAdmin = false,
  lockedVariantId,
  className,
  loading = false,
  allowAll = true,
  lockedMessage = 'Vue multi-salles reservee au plan Enterprise',
  helperText,
}: Props) {
  const lockedVariant = variants.find((variant) => variant.id === lockedVariantId)
  const showAll = allowAll && variants.length > 0
  const placeholder = allowAll ? 'Toutes les variantes' : 'Choisir une variante'

  if (isGymAdmin) {
    return (
      <div className={cn('space-y-1 rounded-xl border border-border/70 bg-muted/40 p-3 text-sm', className)}>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Variante</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{lockedVariant?.name ?? 'Variante assignee'}</Badge>
          <span className="text-xs text-muted-foreground">Verrouillee pour ce compte admin</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-semibold">Variante</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="w-[220px] md:w-[260px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAll ? <SelectItem value="all">Toutes les variantes</SelectItem> : null}
          {variants.map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              {variant.name} {variant.isDefault ? '(par defaut)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!allowAll && variants.length > 1 ? (
        <p className="text-xs text-muted-foreground">{lockedMessage}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  )
}
