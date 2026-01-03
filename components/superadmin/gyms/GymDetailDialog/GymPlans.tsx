'use client'

import type { SuperAdminGymDetail } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { useLocale, useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Permissions } from '@/lib/rbac/permissions'
import { hasPermission } from '@/lib/rbac/policies'

type Props = {
  gym: SuperAdminGymDetail
}

export function GymPlans({ gym }: Props) {
  const t = useTranslations('superAdminGymPlans')
  const locale = useLocale()
  const { data: session } = useSession()
  const canViewFinancials = hasPermission(session?.user?.role as any, Permissions.PlatformAnalyticsRevenue)

  const MAD = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-MA' : 'fr-MA',
    {
      style: 'currency',
      currency: 'MAD',
      maximumFractionDigits: 0,
    },
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {gym.membershipPlans?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.name')}</TableHead>
                <TableHead>{t('table.duration')}</TableHead>
                {canViewFinancials ? <TableHead>{t('table.price')}</TableHead> : null}
                <TableHead>{t('table.visitsPerDay')}</TableHead>
                <TableHead>{t('table.maxSession')}</TableHead>
                <TableHead>{t('table.variant')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {gym.membershipPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.name}</TableCell>

                  <TableCell>
                    {t('durationDays', { days: plan.durationDays })}
                  </TableCell>

                  {canViewFinancials ? (
                    <TableCell>{plan.price != null ? MAD.format(plan.price) : t('priceHidden')}</TableCell>
                  ) : null}

                  <TableCell>
                    {plan.visitsPerDay != null && plan.visitsPerDay < 0
                      ? t('unlimited')
                      : plan.visitsPerDay ?? t('defaultVisit')}
                  </TableCell>

                  <TableCell>
                    {plan.maxSessionMinutes
                      ? t('minutes', { minutes: plan.maxSessionMinutes })
                      : t('variantOrGym')}
                  </TableCell>

                  <TableCell>{plan.gymVariant?.name ?? t('none')}</TableCell>

                  <TableCell>
                    <Badge variant={plan.isActive ? 'secondary' : 'outline'}>
                      {plan.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
