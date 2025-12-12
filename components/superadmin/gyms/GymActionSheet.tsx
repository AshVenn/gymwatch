'use client'

import { useTranslations } from 'next-intl'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useSuperAdminGym } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { GymTeam } from './GymDetailDialog/GymTeam'
import { GymPlans } from './GymDetailDialog/GymPlans'
import { GymSubscriptionSettings } from './GymDetailDialog/GymSubscriptionSettings'

type ActionType = 'team' | 'plans' | 'subscription'

type Props = {
  gymId: string | null
  type: ActionType | null
  onClose: () => void
}

export function GymActionSheet({ gymId, type, onClose }: Props) {
  const t = useTranslations('superAdminActionSheet')
  const open = Boolean(gymId && type)
  const { data: gym, isLoading } = useSuperAdminGym(open ? gymId : null)

  const getTitle = (value: ActionType) => {
    switch (value) {
      case 'team':
        return t('labels.team.title')
      case 'plans':
        return t('labels.plans.title')
      case 'subscription':
        return t('labels.subscription.title')
      default:
        return ''
    }
  }

  const getDescription = (value: ActionType) => {
    switch (value) {
      case 'team':
        return t('labels.team.description')
      case 'plans':
        return t('labels.plans.description')
      case 'subscription':
        return t('labels.subscription.description')
      default:
        return ''
    }
  }

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full space-y-4 overflow-y-auto sm:max-w-xl">
        {type ? (
          <>
            <SheetHeader>
              <SheetTitle>{getTitle(type)}</SheetTitle>
              <SheetDescription>{getDescription(type)}</SheetDescription>
            </SheetHeader>

            {isLoading || !gym ? (
              <div className="py-10 text-center text-muted-foreground">{t('loading')}</div>
            ) : type === 'team' ? (
              <GymTeam gym={gym} />
            ) : type === 'plans' ? (
              <GymPlans gym={gym} />
            ) : (
              <GymSubscriptionSettings gym={gym} />
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
