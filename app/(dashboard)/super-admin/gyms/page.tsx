'use client'

import { useMemo, useState } from 'react'
import type { GymPlanTier, GymSubscriptionStatus } from '../hooks'

import { useSuperAdminGyms } from '../hooks'
import { GymSummaryCards } from '@/components/superadmin/gyms/GymSummaryCards'
import { GymFilters } from '@/components/superadmin/gyms/GymFilters'
import { GymsTable, type GymAction } from '@/components/superadmin/gyms/GymsTable'
import { GymDetailDialog } from '@/components/superadmin/gyms/GymDetailDialog/GymDetailDialog'
import { CreateGymDialog } from '@/components/superadmin/gyms/CreateGymDialog'
import { GymActionSheet } from '@/components/superadmin/gyms/GymActionSheet'
import { EditGymDialog } from '@/components/superadmin/gyms/EditGymDialog'
import { DeleteGymDialog } from '@/components/superadmin/gyms/DeleteGymDialog'
import { usePagination } from '@/components/dashboard/pagination-controls'

export default function SuperAdminGymsPage() {
  const { data: gyms = [], isLoading } = useSuperAdminGyms()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | GymSubscriptionStatus>('ALL')
  const [planFilter, setPlanFilter] = useState<'ALL' | GymPlanTier>('ALL')
  const [currentAction, setCurrentAction] = useState<{ gymId: string | null; type: GymAction | null }>({
    gymId: null,
    type: null,
  })

  const filteredGyms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return gyms.filter((gym) => {
      const matchesSearch =
        !query ||
        gym.name.toLowerCase().includes(query) ||
        gym.email.toLowerCase().includes(query) ||
        gym.owner?.email?.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'ALL' ? true : gym.subscriptionStatus === statusFilter
      const matchesPlan = planFilter === 'ALL' ? true : gym.subscriptionPlan === planFilter
      return matchesSearch && matchesStatus && matchesPlan
    })
  }, [gyms, planFilter, searchTerm, statusFilter])

  const pagination = usePagination(filteredGyms, 8)
  const selectedGym = gyms.find((gym) => gym.id === currentAction.gymId) ?? null

  const handleAction = (gymId: string, type: GymAction) => {
    setCurrentAction({ gymId, type })
  }

  const closeAction = () => {
    setCurrentAction({ gymId: null, type: null })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestion des salles</h1>
          <p className="text-muted-foreground">Supervisez les abonnements, équipes et performances.</p>
        </div>
        <CreateGymDialog />
      </div>

      <GymSummaryCards gyms={gyms} />

      <GymFilters
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        planFilter={planFilter}
        onPlanChange={setPlanFilter}
      />

      <GymsTable
        gyms={pagination.data}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          pageCount: pagination.pageCount,
          pageSize: pagination.pageSize,
          setPage: pagination.setPage,
        }}
        totalItems={filteredGyms.length}
        onAction={handleAction}
      />

      <GymDetailDialog
        gymId={currentAction.type === 'overview' ? currentAction.gymId : null}
        onClose={closeAction}
      />

      <GymActionSheet
        gymId={
          currentAction.type && ['team', 'plans', 'subscription'].includes(currentAction.type)
            ? currentAction.gymId
            : null
        }
        type={
          currentAction.type && ['team', 'plans', 'subscription'].includes(currentAction.type)
            ? (currentAction.type as 'team' | 'plans' | 'subscription')
            : null
        }
        onClose={closeAction}
      />

      <EditGymDialog
        gymId={currentAction.type === 'edit' ? currentAction.gymId : null}
        onClose={closeAction}
      />

      <DeleteGymDialog
        gym={currentAction.type === 'delete' ? selectedGym : null}
        onClose={closeAction}
      />
    </div>
  )
}
