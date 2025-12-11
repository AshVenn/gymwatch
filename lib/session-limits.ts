import { prisma } from "./prisma"

const normalizeLimit = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  return rounded > 0 ? rounded : null
}

export type SessionLimitResolver = {
  resolve: (memberId?: string | null, variantId?: string | null) => number | null
  variantLimit: (variantId?: string | null) => number | null
  defaultLimit: number | null
}

export async function buildSessionLimitResolver({
  gymId,
  memberIds,
}: {
  gymId: string
  memberIds?: string[]
}): Promise<SessionLimitResolver> {
  const uniqueMembers = Array.from(new Set((memberIds ?? []).filter(Boolean)))

  const [gym, variants, subscriptions] = await Promise.all([
    prisma.gym.findUnique({
      where: { id: gymId },
      select: { maxSessionMinutes: true },
    }),
    prisma.gymVariant.findMany({
      where: { gymId },
      select: { id: true, maxSessionMinutes: true },
    }),
    uniqueMembers.length
      ? prisma.subscription.findMany({
          where: { gymId, memberId: { in: uniqueMembers } },
          orderBy: [{ endDate: "desc" }],
          include: {
            plan: {
              select: { id: true, maxSessionMinutes: true, gymVariantId: true },
            },
          },
        })
      : [],
  ])

  const defaultLimit = normalizeLimit(gym?.maxSessionMinutes)

  const variantLimitMap = new Map<string, number>()
  variants.forEach((variant) => {
    const limit = normalizeLimit(variant.maxSessionMinutes)
    if (limit !== null) {
      variantLimitMap.set(variant.id, limit)
    }
  })

  const planLimitByMember = new Map<string, number>()
  const subscriptionVariantByMember = new Map<string, string | null>()
  for (const subscription of subscriptions) {
    if (planLimitByMember.has(subscription.memberId)) continue
    const planLimit = normalizeLimit(subscription.plan?.maxSessionMinutes)
    if (planLimit !== null) {
      planLimitByMember.set(subscription.memberId, planLimit)
    }
    subscriptionVariantByMember.set(subscription.memberId, subscription.plan?.gymVariantId ?? subscription.gymVariantId)
  }

  const resolve = (memberId?: string | null, variantId?: string | null): number | null => {
    if (!memberId && !variantId) return defaultLimit
    const targetVariantId = variantId ?? subscriptionVariantByMember.get(memberId ?? "") ?? null
    const variantLimit = targetVariantId ? variantLimitMap.get(targetVariantId) ?? null : null
    if (variantLimit !== null) {
      return variantLimit
    }
    const planLimit = memberId ? planLimitByMember.get(memberId) ?? null : null
    if (planLimit !== null) {
      return planLimit
    }
    return defaultLimit
  }

  const variantLimit = (variantId?: string | null) =>
    variantId ? variantLimitMap.get(variantId) ?? null : null

  return {
    resolve,
    variantLimit,
    defaultLimit,
  }
}
