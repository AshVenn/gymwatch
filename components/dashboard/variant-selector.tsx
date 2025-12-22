'use client'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GymVariantOption } from '@/app/hooks/use-variants'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

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
  lockedMessage,
  helperText,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('variantSelector')
  const isRTL = locale === 'ar'

  const lockedVariant = variants.find((variant) => variant.id === lockedVariantId)
  const showAll = allowAll && variants.length > 0

  const placeholder = allowAll
    ? t('placeholderAll')
    : t('placeholderSingle')

  const effectiveLockedMessage = lockedMessage ?? t('lockedMessage')

  if (isGymAdmin) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className={cn(
          'space-y-1 rounded-xl border border-border/70 bg-muted/40 p-3 text-sm',
          className
        )}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t('label')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {lockedVariant?.name ?? t('assignedVariantFallback')}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t('adminLockedNote')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn('space-y-2', className)}
    >
      <Label className="text-sm font-semibold">
        {t('label')}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
      <SelectTrigger className="w-full sm:w-[220px] md:w-[260px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAll ? (
            <SelectItem value="all">
              {t('allOption')}
            </SelectItem>
          ) : null}
          {variants.map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              {variant.name}{' '}
              {variant.isDefault ? t('defaultSuffix') : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!allowAll && variants.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          {effectiveLockedMessage}
        </p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
