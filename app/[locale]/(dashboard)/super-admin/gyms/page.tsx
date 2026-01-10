"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import type { GymPlanTier, GymSubscriptionStatus } from "../hooks"

import { useSuperAdminGyms } from "../hooks"
import { GymSummaryCards } from "@/components/superadmin/gyms/GymSummaryCards"
import { GymFilters } from "@/components/superadmin/gyms/GymFilters"
import { GymsTable, type GymAction } from "@/components/superadmin/gyms/GymsTable"
import { GymDetailDialog } from "@/components/superadmin/gyms/GymDetailDialog/GymDetailDialog"
import { CreateGymDialog } from "@/components/superadmin/gyms/CreateGymDialog"
import { GymMembersSheet } from "@/components/superadmin/gyms/GymMembersSheet"
import { GymActionSheet } from "@/components/superadmin/gyms/GymActionSheet"
import { EditGymDialog } from "@/components/superadmin/gyms/EditGymDialog"
import { DeleteGymDialog } from "@/components/superadmin/gyms/DeleteGymDialog"
import { usePagination } from "@/components/dashboard/pagination-controls"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function SuperAdminGymsPage() {
  const t = useTranslations("superAdminGyms")

  const { data: gyms = [], isLoading } = useSuperAdminGyms()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | GymSubscriptionStatus>("ALL")
  const [planFilter, setPlanFilter] = useState<"ALL" | GymPlanTier>("ALL")
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
        (gym.email ?? "").toLowerCase().includes(query) ||
        gym.owner?.email?.toLowerCase().includes(query)

      const matchesStatus = statusFilter === "ALL" ? true : gym.subscriptionStatus === statusFilter
      const matchesPlan = planFilter === "ALL" ? true : gym.subscriptionPlan === planFilter

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">{t("header.subtitle")}</p>
        </div>
        <CreateGymDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 animate-in fade-in duration-300">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="border-border/60 bg-card/90 shadow-md backdrop-blur-sm rounded-3xl">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="mt-3 h-4 w-36 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <GymSummaryCards gyms={gyms} />
      )}

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

      <GymDetailDialog gymId={currentAction.type === "overview" ? currentAction.gymId : null} onClose={closeAction} />

      <GymActionSheet
        gymId={
          currentAction.type && ["team", "plans", "subscription"].includes(currentAction.type)
            ? currentAction.gymId
            : null
        }
        type={
          currentAction.type && ["team", "plans", "subscription"].includes(currentAction.type)
            ? (currentAction.type as "team" | "plans" | "subscription")
            : null
        }
        onClose={closeAction}
      />

      <EditGymDialog gymId={currentAction.type === "edit" ? currentAction.gymId : null} onClose={closeAction} />

      <DeleteGymDialog gym={currentAction.type === "delete" ? selectedGym : null} onClose={closeAction} />

      <GymMembersSheet
        gymId={currentAction.type === "members" ? currentAction.gymId : null}
        gymName={selectedGym?.name}
        open={currentAction.type === "members" && Boolean(currentAction.gymId)}
        onClose={closeAction}
      />
    </div>
  )
}
