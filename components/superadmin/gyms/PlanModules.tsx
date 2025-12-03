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
  label: string
  description: string
  icon: LucideIcon
}

const MODULES: ModuleMeta[] = [
  {
    key: 'accessControl',
    label: "Controle d'acces",
    description: 'Scan QR, filtrage des membres et controle des passages.',
    icon: ShieldCheck,
  },
  {
    key: 'presenceTracking',
    label: 'Suivi de presence',
    description: 'Comptage en temps reel, alertes de seuils et absences.',
    icon: Activity,
  },
  {
    key: 'courses',
    label: 'Cours & planning',
    description: 'Gestion des cours, reservations et capacite par variante.',
    icon: CheckCircle2,
  },
  {
    key: 'qrTools',
    label: 'Outils QR',
    description: 'Generation de QR codes et partage avec les membres.',
    icon: QrCode,
  },
  {
    key: 'qrDownloads',
    label: 'Exports QR',
    description: 'Exports rapides des QR codes et impressions.',
    icon: Download,
  },
  {
    key: 'excelReports',
    label: 'Exports Excel',
    description: 'Rapports finances, abonnements et passages en Excel.',
    icon: FileSpreadsheet,
  },
]

function resolveModules(features?: PlanFeatures) {
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
  const enabledModules = resolveModules(features).filter((module) => module.enabled)

  if (!enabledModules.length) {
    return <p className="text-[11px] text-muted-foreground">Aucun module actif sur ce plan.</p>
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
          {module.label}
        </Badge>
      ))}
    </div>
  )
}

type ListProps = {
  features?: PlanFeatures
}

export function PlanModuleList({ features }: ListProps) {
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
              <p className="text-sm font-semibold">{module.label}</p>
              <Badge variant={module.enabled ? 'secondary' : 'outline'} className="text-[11px]">
                {module.enabled ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{module.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
