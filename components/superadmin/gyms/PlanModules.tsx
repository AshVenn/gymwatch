'use client'

import { useTranslations } from 'next-intl'
import type { PlanFeatures } from '@/lib/subscription-plans'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Activity,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

type ModuleKey = keyof PlanFeatures

type ModuleMeta = {
  key: ModuleKey
  icon: LucideIcon
}

const MODULES: ModuleMeta[] = [
  { key: 'accessControl', icon: ShieldCheck },
  { key: 'presenceTracking', icon: Activity },
  { key: 'courses', icon: CheckCircle2 },
  { key: 'qrTools', icon: QrCode },
  { key: 'qrDownloads', icon: Download },
  { key: 'excelReports', icon: FileSpreadsheet },
]

function resolveModules(features: PlanFeatures | undefined) {
  return MODULES.map((module) => ({
    ...module,
    enabled: Boolean(features?.[module.key]),
  }))
}

type BadgesProps = {
  features?: PlanFeatures
  className?: string
}

export function PlanModuleBadges({ features, className }: BadgesProps) {
  const t = useTranslations('planModules')
  const enabledModules = resolveModules(features).filter((m) => m.enabled)

  if (!enabledModules.length) {
    return <p className="text-[11px] text-muted-foreground">{t('badges.empty')}</p>
  }

  return (
    <div className={cn('mt-2 flex flex-wrap gap-1.5', className)}>
      {enabledModules.map((module) => (
        <Badge
          key={module.key}
          variant="outline"
          className="flex items-center gap-1 border-border/70 text-[11px] font-medium"
        >
          <module.icon className="h-3 w-3" />
          {t(`modules.${module.key}.label`)}
        </Badge>
      ))}
    </div>
  )
}

type ListProps = {
  features?: PlanFeatures
}

export function PlanModuleList({ features }: ListProps) {
  const t = useTranslations('planModules')
  const modules = resolveModules(features)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {modules.map((module) => (
        <div
          key={module.key}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-3 transition-colors',
            module.enabled ? 'border-primary/40 bg-primary/5' : 'border-dashed border-border/60 bg-muted/20',
          )}
        >
          <module.icon className={cn('mt-0.5 h-4 w-4', module.enabled ? 'text-primary' : 'text-muted-foreground')} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{t(`modules.${module.key}.label`)}</p>
              <Badge variant={module.enabled ? 'secondary' : 'outline'} className="text-[11px]">
                {module.enabled ? t('status.active') : t('status.inactive')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t(`modules.${module.key}.description`)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
