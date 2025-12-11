import { GymPlanTier } from "@prisma/client"
import { prisma } from "./prisma"
import { isMultiLocationPlan } from "./subscription-plans"

type VariantAccessErrorCode = "MULTI_VARIANT_FORBIDDEN" | "VARIANT_REQUIRED" | "VARIANT_INVALID"

type VariantAccessResult =
  | {
      ok: true
      variantId?: string
      variantMode: "SINGLE" | "MULTI"
      defaultVariantId: string | null
      multiLocationAllowed: boolean
    }
  | {
      ok: false
      status: number
      message: string
      code: VariantAccessErrorCode
      variantMode: "SINGLE" | "MULTI"
      defaultVariantId: string | null
      multiLocationAllowed: boolean
    }

export async function resolveVariantAccess(options: {
  gymId: string
  tier: GymPlanTier | null | undefined
  role?: string
  requestedVariantId?: string | null
  sessionVariantId?: string | null
}): Promise<VariantAccessResult> {
  const { gymId, tier, role, requestedVariantId, sessionVariantId } = options
  const variants = await prisma.gymVariant.findMany({
    where: { gymId },
    select: { id: true, isDefault: true },
  })

  const defaultVariantId = variants.find((variant) => variant.isDefault)?.id ?? variants[0]?.id ?? null
  const variantMode = variants.length > 1 ? "MULTI" : "SINGLE"
  const multiLocationAllowed = isMultiLocationPlan(tier) || variantMode === "SINGLE"

  if (role === "GYM_ADMIN") {
    if (!sessionVariantId) {
      return {
        ok: false,
        status: 403,
        message: "Variant manquant",
        code: "VARIANT_REQUIRED",
        variantMode,
        defaultVariantId,
        multiLocationAllowed,
      }
    }

    const exists = variants.some((variant) => variant.id === sessionVariantId)
    if (!exists) {
      return {
        ok: false,
        status: 403,
        message: "Variant invalide",
        code: "VARIANT_INVALID",
        variantMode,
        defaultVariantId,
        multiLocationAllowed,
      }
    }

    return {
      ok: true,
      variantId: sessionVariantId,
      variantMode,
      defaultVariantId,
      multiLocationAllowed,
    }
  }

  if (requestedVariantId && requestedVariantId !== "all") {
    const exists = variants.some((variant) => variant.id === requestedVariantId)
    if (!exists) {
      return {
        ok: false,
        status: 400,
        message: "Variant invalide",
        code: "VARIANT_INVALID",
        variantMode,
        defaultVariantId,
        multiLocationAllowed,
      }
    }

    return {
      ok: true,
      variantId: requestedVariantId,
      variantMode,
      defaultVariantId,
      multiLocationAllowed,
    }
  }

  const wantsAggregatedView = !requestedVariantId || requestedVariantId === "all"
  if (wantsAggregatedView && !multiLocationAllowed) {
    return {
      ok: false,
      status: 403,
      message: "Vue multi-salles reservee au plan Enterprise",
      code: "MULTI_VARIANT_FORBIDDEN",
      variantMode,
      defaultVariantId,
      multiLocationAllowed,
    }
  }

  return {
    ok: true,
    variantId: undefined,
    variantMode,
    defaultVariantId,
    multiLocationAllowed,
  }
}
