import { AccessEventStatus, AccessRuleSeverity, AccessRuleType } from "@prisma/client"
import { prisma } from "./prisma"

type RuleContext = {
  gymId: string
  gymVariantId?: string | null
  memberId?: string | null
  visitId?: string | null
}

const ENTRY_BURST_THRESHOLD = 12
const BURST_WINDOW_MINUTES = 5
const STALE_VISIT_THRESHOLD_HOURS = 4
const CAPACITY_WARNING_RATIO = 0.85
const CAPACITY_BLOCK_RATIO = 0.95

async function recordRuleEvent(
  type: AccessRuleType,
  severity: AccessRuleSeverity,
  context: RuleContext,
  note?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.accessRuleEvent.create({
      data: {
        type,
        severity,
        gymId: context.gymId,
        gymVariantId: context.gymVariantId ?? null,
        memberId: context.memberId ?? null,
        visitId: context.visitId ?? null,
        note: note ?? null,
        metadata: metadata ?? undefined,
      },
    })
  } catch (error) {
    console.error("[rules-engine][recordRuleEvent]", error)
  }
}

export async function recordOverstayRule(context: RuleContext & { durationMinutes?: number; limitMinutes?: number }) {
  await recordRuleEvent(
    AccessRuleType.OVERSTAY,
    AccessRuleSeverity.WARNING,
    context,
    "Visit exceeded max duration",
    {
      durationMinutes: context.durationMinutes ?? null,
      limitMinutes: context.limitMinutes ?? null,
    },
  )
}

export async function evaluateCheckInRules(context: RuleContext) {
  const now = new Date()
  const [gym, variant] = await Promise.all([
    prisma.gym.findUnique({
      where: { id: context.gymId },
      select: { capacity: true, name: true },
    }),
    context.gymVariantId
      ? prisma.gymVariant.findUnique({
          where: { id: context.gymVariantId },
          select: { capacity: true, name: true },
        })
      : null,
  ])

  const openVisits = await prisma.visit.count({
    where: {
      gymId: context.gymId,
      ...(context.gymVariantId ? { gymVariantId: context.gymVariantId } : {}),
      checkOut: null,
    },
  })

  const capacityLimit =
    (context.gymVariantId ? variant?.capacity : null) ??
    (context.gymVariantId ? null : gym?.capacity) ??
    0

  const capacityRatio =
    capacityLimit && capacityLimit > 0 ? Math.min(openVisits / capacityLimit, Number.MAX_SAFE_INTEGER) : null

  if (capacityRatio !== null && capacityLimit && capacityLimit > 0) {
    const severity =
      capacityRatio >= 1 ? AccessRuleSeverity.CRITICAL : capacityRatio >= CAPACITY_BLOCK_RATIO ? AccessRuleSeverity.WARNING : AccessRuleSeverity.INFO
    if (capacityRatio >= CAPACITY_WARNING_RATIO) {
      await recordRuleEvent(
        AccessRuleType.CAPACITY_RISK,
        severity,
        context,
        severity === AccessRuleSeverity.CRITICAL ? "Capacity exceeded" : "Capacity near limit",
        {
          current: openVisits,
          limit: capacityLimit,
          ratio: capacityRatio,
          scope: context.gymVariantId ? "VARIANT" : "GYM",
          variantName: variant?.name ?? null,
          gymName: gym?.name ?? null,
        },
      )
    }
  }

  const burstWindow = new Date(now.getTime() - BURST_WINDOW_MINUTES * 60_000)
  const entryBurstCount = await prisma.accessEvent.count({
    where: {
      createdAt: { gte: burstWindow, lte: now },
      status: AccessEventStatus.GRANTED,
      member: { gymId: context.gymId },
    },
  })

  if (entryBurstCount >= ENTRY_BURST_THRESHOLD) {
    await recordRuleEvent(
      AccessRuleType.ENTRY_BURST,
      AccessRuleSeverity.WARNING,
      context,
      "High burst of entries detected",
      {
        windowMinutes: BURST_WINDOW_MINUTES,
        count: entryBurstCount,
      },
    )
  }

  const staleCutoff = new Date(now.getTime() - STALE_VISIT_THRESHOLD_HOURS * 60 * 60 * 1000)
  const staleVisits = await prisma.visit.count({
    where: {
      gymId: context.gymId,
      ...(context.gymVariantId ? { gymVariantId: context.gymVariantId } : {}),
      checkOut: null,
      checkIn: { lt: staleCutoff },
    },
  })

  if (staleVisits > 0) {
    await recordRuleEvent(
      AccessRuleType.STALE_OPEN_VISIT,
      AccessRuleSeverity.INFO,
      context,
      "Open visits older than threshold",
      {
        count: staleVisits,
        thresholdHours: STALE_VISIT_THRESHOLD_HOURS,
      },
    )
  }

  return {
    openVisits,
    capacityLimit,
    capacityRatio,
    shouldThrottle:
      capacityLimit && capacityLimit > 0 && capacityRatio !== null ? capacityRatio >= CAPACITY_BLOCK_RATIO : false,
  }
}
