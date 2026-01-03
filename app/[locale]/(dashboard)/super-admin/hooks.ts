import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FeatureOverrideMap, PlanFeatures, PlanLimitsTable, PlanPricingTable } from '@/lib/subscription-plans'
import type { AppLocale } from '@/i18n/routing'

export type GymPlanTier = 'BASIC' | 'PRO' | 'ENTERPRISE'
export type GymSubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED'
export type GymBillingInterval = 'MONTHLY' | 'ANNUAL'
export type GymFreezeStatusValue = 'ACTIVE' | 'LIFTED'
export type DemoRequestStatus = 'PENDING' | 'RESOLVED' | 'REFUSED'
export interface PlanSettingsResponse {
  settings: {
    basicMonthlyPrice: number
    proMonthlyPrice: number
    enterpriseMonthlyPrice: number
    annualDiscountPercent: number
    basicPlanLimitPerVariant: number
    basicPlanLimitPerNetwork: number
    proPlanLimitPerVariant: number
    proPlanLimitPerNetwork: number
    enterprisePlanLimitPerVariant: number
    enterprisePlanLimitPerNetwork: number
    updatedAt?: string
  }
  pricing: PlanPricingTable
  limits?: PlanLimitsTable
}
export type PlanSettingsInput = Omit<PlanSettingsResponse['settings'], 'updatedAt'>

export interface SuperAdminStats {
  totalGyms: number
  activeGyms: number
  suspendedGyms: number
  totalMembers: number
  totalSubscribers: number
  monthlyRevenue: number | null
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
  subscriptionPrice: number | null
  subscriptionStatus: GymSubscriptionStatus
  subscriptionExpiresAt: string | null
  isDemo?: boolean
  demoEndsAt?: string | null
  subscriptionGracePeriodDays: number
  analyticsSnapshot?: unknown
  daysRemaining: number | null
  memberCount: number
  activeSubscriptions: number
  updatedAt: string
  capacity?: number | null
  maxMembers?: number | null
  maxVariants?: number | null
  freezeStatus?: GymFreezeStatusValue | null
  freezeReason?: string | null
  freezeUntil?: string | null
  planLimitPerVariant?: number | null
  planLimitPerNetwork?: number | null
  planLimits?: {
    perVariant: number | null
    perNetwork: number | null
    unlimitedPerVariant: boolean
    unlimitedPerNetwork: boolean
    sources: { perVariant: "PLAN_DEFAULT" | "GYM_OVERRIDE"; perNetwork: "PLAN_DEFAULT" | "GYM_OVERRIDE" }
  }
  featureOverrides?: FeatureOverrideMap
  owner: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  } | null
  adminCount: number
  maxAdminAccounts: number
  variants?: {
    id: string
    name: string
    slug: string
    isDefault: boolean
    capacity?: number | null
  }[]
  variantCount?: number
  variantMode?: 'SINGLE' | 'MULTI'
  planFeatures?: PlanFeatures
}

export interface SuperAdminGymDetail extends SuperAdminGym {
  paymentsLast30Days: number | null
  paymentsCurrentMonth?: number | null
  paymentsTotal?: number | null
  variantCount?: number
  planLimitPerVariant?: number | null
  planLimitPerNetwork?: number | null
  planLimits?: SuperAdminGym['planLimits']
  featureOverrides?: FeatureOverrideMap
  admins: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    gymVariantId?: string | null
    gymVariant?: { id: string; name: string; slug: string; isDefault: boolean } | null
  }[]
  membershipPlans: {
    id: string
    name: string
    durationDays: number
    price: number | null
    isActive: boolean
    visitsPerDay?: number
    maxSessionMinutes?: number | null
    gymVariantId?: string
    gymVariant?: {
      id: string
      name: string
      slug: string
      isDefault: boolean
    } | null
  }[]
  freezeStatus?: GymFreezeStatusValue | null
  freezeReason?: string | null
  freezeUntil?: string | null
  memberPreview?: GymMemberSummary[]
  capacity?: number | null
  maxMembers?: number | null
  maxVariants?: number | null
  subscriptions: {
    id: string
    status: string
    endDate: string
  }[]
  variants?: {
    id: string
    name: string
    slug: string
    isDefault: boolean
    capacity?: number | null
  }[]
}

export type GymMemberSummary = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  createdAt?: string
  gymVariant?: { id: string; name: string; slug: string } | null
}

export interface DemoRequest {
  id: string
  gymName: string
  gymEmail: string
  adminEmail: string
  adminFirstName?: string | null
  adminLastName?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  plan: GymPlanTier
  message?: string | null
  status: DemoRequestStatus
  resolvedAt?: string | null
  resolutionNote?: string | null
  createdAt: string
  createdGymId?: string | null
}

export type PartnerTranslation = {
  name?: string
  city?: string
  country?: string
  tagline?: string
  description?: string
}

export type MarketingPlanTranslation = {
  name?: string
  description?: string
  highlightLabel?: string
  badges?: string[]
  features?: string[]
}

export interface PartnerClubAdmin {
  id: string
  slug: string
  websiteUrl?: string | null
  logoUrl?: string | null
  logoPublicId?: string | null
  coverUrl?: string | null
  coverPublicId?: string | null
  order: number
  isPublished: boolean
  translations: Partial<Record<AppLocale, PartnerTranslation>>
  createdAt?: string
  updatedAt?: string
}

export type PartnerUploadResult = {
  url: string
  publicId: string
  width?: number
  height?: number
}

export type PartnerClubInput = {
  slug?: string
  websiteUrl?: string | null
  logoUrl?: string | null
  logoPublicId?: string | null
  coverUrl?: string | null
  coverPublicId?: string | null
  order?: number
  isPublished?: boolean
  translations?: Partial<Record<AppLocale, PartnerTranslation>>
}

export interface MarketingPlanAdmin {
  id: string
  tier: GymPlanTier
  order: number
  isPublished: boolean
  highlight: boolean
  translations: Partial<Record<AppLocale, MarketingPlanTranslation>>
  createdAt?: string
  updatedAt?: string
}

export type MarketingPlanInput = {
  tier?: GymPlanTier
  order?: number
  isPublished?: boolean
  highlight?: boolean
  translations?: Partial<Record<AppLocale, MarketingPlanTranslation>>
}

async function fetchJSON<T>(input: string | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    try {
      if (contentType.includes('application/json')) {
        const body = await response.json()
        const detail = (body as any)?.error ?? (body as any)?.message
        throw new Error(detail || JSON.stringify(body) || 'Une erreur est survenue')
      }
      const message = await response.text()
      throw new Error(message || 'Une erreur est survenue')
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error('Une erreur est survenue')
    }
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text() as T
}

export function useSuperAdminStats() {
  return useQuery<SuperAdminStats>({
    queryKey: ['super-admin', 'stats'],
    queryFn: () => fetchJSON('/api/super-admin/stats'),
  })
}

export function usePlanSettings() {
  return useQuery<PlanSettingsResponse>({
    queryKey: ['plan-settings'],
    queryFn: () => fetchJSON('/api/super-admin/plan-settings'),
  })
}

export function useUpdatePlanSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PlanSettingsInput) => {
      return fetchJSON('/api/super-admin/plan-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-settings'] })
      toast.success('Plans mis à jour')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
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

export function useSuperAdminGymMembers(gymId?: string | null, page = 1, pageSize = 8) {
  return useQuery<{ members: GymMemberSummary[]; total: number; page: number; pageSize: number }>({
    queryKey: ['super-admin', 'gym-members', gymId, page, pageSize],
    enabled: Boolean(gymId),
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchJSON(
        `/api/super-admin/gyms/${gymId}/members?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
      ),
  })
}

export function useDemoRequests(status: DemoRequestStatus | 'ALL' = 'ALL') {
  return useQuery<DemoRequest[]>({
    queryKey: ['super-admin', 'demo-requests', status],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status !== 'ALL') {
        params.set('status', status)
      }
      const query = params.toString()
      return fetchJSON(`/api/super-admin/demo-requests${query ? `?${query}` : ''}`)
    },
  })
}

export function useDemoRequest(requestId?: string | null) {
  return useQuery<DemoRequest>({
    queryKey: ['super-admin', 'demo-request', requestId],
    enabled: Boolean(requestId),
    queryFn: () => fetchJSON(`/api/super-admin/demo-requests/${requestId}`),
  })
}

export function usePartnerClubs() {
  return useQuery<PartnerClubAdmin[]>({
    queryKey: ['super-admin', 'partners'],
    queryFn: () => fetchJSON('/api/super-admin/partners'),
  })
}

export function useCreatePartnerClub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PartnerClubInput) =>
      fetchJSON('/api/super-admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'partners'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdatePartnerClub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { partnerId: string; data: PartnerClubInput }) =>
      fetchJSON(`/api/super-admin/partners/${payload.partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'partners'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'partner', variables.partnerId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeletePartnerClub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (partnerId: string) =>
      fetchJSON(`/api/super-admin/partners/${partnerId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'partners'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUploadPartnerAsset() {
  return useMutation({
    mutationFn: async (payload: { file: File; folder?: string; publicId?: string }) => {
      const formData = new FormData()
      formData.append('file', payload.file)
      if (payload.folder) formData.append('folder', payload.folder)
      if (payload.publicId) formData.append('publicId', payload.publicId)

      return fetchJSON<PartnerUploadResult>('/api/super-admin/partners/upload', {
        method: 'POST',
        body: formData,
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useMarketingPlans() {
  return useQuery<MarketingPlanAdmin[]>({
    queryKey: ['super-admin', 'marketing-plans'],
    queryFn: () => fetchJSON('/api/super-admin/marketing-plans'),
  })
}

export function useCreateMarketingPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MarketingPlanInput) =>
      fetchJSON('/api/super-admin/marketing-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'marketing-plans'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateMarketingPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { planId: string; data: MarketingPlanInput }) =>
      fetchJSON(`/api/super-admin/marketing-plans/${payload.planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'marketing-plans'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteMarketingPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) =>
      fetchJSON(`/api/super-admin/marketing-plans/${planId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'marketing-plans'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
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

export function usePurgeAccessLogs() {
  return useMutation({
    mutationFn: async () => {
      return fetchJSON<{ deleted: number; lastPurgeAt?: string | null; retentionDays?: number; message?: string }>(
        '/api/super-admin/access-logs/purge',
        { method: 'POST' },
      )
    },
    onSuccess: (data) => {
      const base =
        data.deleted > 0 ? `${data.deleted} logs supprimes` : 'Aucun log a supprimer'
      const detail = data.retentionDays ? `${base} (retention ${data.retentionDays} jours)` : base
      toast.success('Purge effectuee', {
        description: data.message ?? detail,
      })
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
      address?: string
      city?: string
      country?: string
      subscriptionPlan: GymPlanTier
      billingInterval?: GymBillingInterval
      subscriptionStatus?: GymSubscriptionStatus
      subscriptionExpiresAt?: string
      subscriptionGracePeriodDays?: number
      maxAdminAccounts?: number
      isDemo?: boolean
      demoEndsAt?: string
      admins?: {
        email: string
        password: string
        firstName: string
        lastName: string
        variantSlug?: string
      }[]
      variants?: { name: string; slug?: string; isDefault?: boolean }[]
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

export function useConvertDemoGym() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gymId }: { gymId: string }) => {
      return fetchJSON(`/api/super-admin/gyms/${gymId}/convert`, { method: 'POST' })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gym', variables.gymId] })
      toast.success('Démo convertie en compte actif')
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
      gymVariantId?: string
    }) => {
      return fetchJSON(`/api/super-admin/gyms/${payload.gymId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          firstName: payload.firstName,
          lastName: payload.lastName,
          gymVariantId: payload.gymVariantId,
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

export function useUpdateDemoRequestStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { requestId: string; status: DemoRequestStatus; resolutionNote?: string }) => {
      return fetchJSON(`/api/super-admin/demo-requests/${payload.requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: payload.status, resolutionNote: payload.resolutionNote }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'demo-requests'] })
      toast.success('Demande mise a jour')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useApproveDemoRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      requestId: string
      data: {
        name: string
        email: string
        phone: string
        address?: string
        city?: string
        country?: string
        subscriptionPlan: GymPlanTier
        billingInterval?: GymBillingInterval
        subscriptionStatus?: GymSubscriptionStatus
        subscriptionExpiresAt?: string | null
        subscriptionGracePeriodDays?: number
        maxAdminAccounts?: number
        demoEndsAt?: string | null
        variants?: { name: string; slug?: string; isDefault?: boolean }[]
        resolutionNote?: string
        owner: {
          email: string
          password: string
          firstName: string
          lastName: string
        }
        admins?: {
          email: string
          password: string
          firstName: string
          lastName: string
          variantSlug?: string
        }[]
      }
    }) => {
      return fetchJSON(`/api/super-admin/demo-requests/${payload.requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'demo-requests'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'gyms'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
      toast.success('Compte demo cree et demande resolue')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
