import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type GymPlanTier = 'BASIC' | 'PRO'
export type GymSubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
export type GymBillingInterval = 'MONTHLY' | 'ANNUAL'

export interface SuperAdminStats {
  totalGyms: number
  activeGyms: number
  suspendedGyms: number
  totalMembers: number
  totalSubscribers: number
  monthlyRevenue: number
  statusBreakdown: { status: GymSubscriptionStatus; value: number }[]
  revenueTrend: { month: string; revenue: number }[]
  expiringGyms: {
    id: string
    name: string
    status: GymSubscriptionStatus
    plan: GymPlanTier
    billingInterval: GymBillingInterval
    daysRemaining: number
    expiresAt: string
  }[]
}

export interface SuperAdminGym {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city: string | null
  country: string | null
  subscriptionPlan: GymPlanTier
  billingInterval: GymBillingInterval
  subscriptionPrice: number
  subscriptionStatus: GymSubscriptionStatus
  subscriptionExpiresAt: string | null
  subscriptionGracePeriodDays: number
  analyticsSnapshot?: unknown
  daysRemaining: number | null
  memberCount: number
  activeSubscriptions: number
  updatedAt: string
  owner: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
  adminCount: number
  maxAdminAccounts: number
}

export interface SuperAdminGymDetail extends SuperAdminGym {
  paymentsLast30Days: number
  admins: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }[]
  membershipPlans: {
    id: string
    name: string
    durationDays: number
    price: number
    isActive: boolean
  }[]
  subscriptions: {
    id: string
    status: string
    endDate: string
  }[]
}

async function fetchJSON<T>(input: string | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Une erreur est survenue')
  }
  return response.json()
}

export function useSuperAdminStats() {
  return useQuery<SuperAdminStats>({
    queryKey: ['super-admin', 'stats'],
    queryFn: () => fetchJSON('/api/super-admin/stats'),
  })
}

export function useSuperAdminGyms() {
  return useQuery<SuperAdminGym[]>({
    queryKey: ['super-admin', 'gyms'],
    queryFn: () => fetchJSON('/api/super-admin/gyms'),
  })
}

export function useSuperAdminGym(gymId?: string | null) {
  return useQuery<SuperAdminGymDetail>({
    queryKey: ['super-admin', 'gym', gymId],
    enabled: Boolean(gymId),
    queryFn: () => fetchJSON(`/api/super-admin/gyms/${gymId}`),
  })
}

export function useUpdateGym() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      gymId: string
      data: {
        subscriptionStatus: GymSubscriptionStatus
      subscriptionPlan?: GymPlanTier
      billingInterval?: GymBillingInterval
        subscriptionExpiresAt?: string | null
        subscriptionGracePeriodDays?: number
        maxAdminAccounts?: number
      }
    }) => {
      return fetchJSON(`/api/super-admin/gyms/${payload.gymId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gym', variables.gymId] })
      toast.success('Abonnement mis a jour')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useCreateGym() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      name: string
      email: string
      phone?: string
      city?: string
      country?: string
      subscriptionPlan: GymPlanTier
      billingInterval?: GymBillingInterval
      subscriptionStatus?: GymSubscriptionStatus
      subscriptionExpiresAt?: string
      subscriptionGracePeriodDays?: number
      maxAdminAccounts?: number
      owner: {
        email: string
        password: string
        firstName: string
        lastName: string
      }
    }) => {
      return fetchJSON('/api/super-admin/gyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
      toast.success('Salle ajoutee')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteGym() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gymId }: { gymId: string }) => {
      return fetchJSON(`/api/super-admin/gyms/${gymId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
      queryClient.removeQueries({ queryKey: ['super-admin', 'gym', variables.gymId] })
      toast.success('Salle supprimée')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useCreateGymAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      gymId: string
      email: string
      password: string
      firstName: string
      lastName: string
    }) => {
      return fetchJSON(`/api/super-admin/gyms/${payload.gymId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          firstName: payload.firstName,
          lastName: payload.lastName,
        }),
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gym', variables.gymId] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
      toast.success('Administrateur ajoute')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateGymProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      gymId: string
      data: {
        name: string
        email: string
        phone: string
        city: string
        country: string
        address?: string
      }
    }) => {
      return fetchJSON(`/api/super-admin/gyms/${payload.gymId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gym', variables.gymId] })
      toast.success('Salle mise à jour')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
