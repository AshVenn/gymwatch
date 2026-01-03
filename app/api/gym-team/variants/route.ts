import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

export async function GET() {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVariantsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = (sessionResult.user as any).role as string | undefined
  const sessionVariantId = sessionResult.user.gymVariantId ?? undefined

  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  const variants = await prisma.gymVariant.findMany({
    where: {
      gymId: scope.gymId,
      ...(role === "GYM_ADMIN" && sessionVariantId ? { id: sessionVariantId } : {}),
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, isDefault: true, maxSessionMinutes: true, capacity: true },
  })

  return NextResponse.json(variants)
}

const updateVariantSchema = z.object({
  variantId: z.string(),
  capacity: z.number().int().min(0).max(100000),
})

export async function PATCH(request: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVariantsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = (sessionResult.user as any).role as string | undefined
  const sessionVariantId = sessionResult.user.gymVariantId ?? undefined

  const body = await request.json().catch(() => null)
  const parsed = updateVariantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { variantId, capacity } = parsed.data

  if (role === "GYM_ADMIN") {
    if (!sessionVariantId) {
      return jsonError(403, "MISSING_VARIANT", "Variant required")
    }
    if (variantId !== sessionVariantId) {
      return jsonError(403, "FORBIDDEN_VARIANT", "Forbidden for this variant")
    }
  }

  const variant = await prisma.gymVariant.findFirst({
    where: { id: variantId, gymId: scope.gymId },
    select: { id: true },
  })

  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 })
  }

  const updated = await prisma.gymVariant.update({
    where: { id: variantId },
    data: { capacity },
    select: { id: true, name: true, capacity: true, maxSessionMinutes: true, isDefault: true },
  })

  return NextResponse.json(updated)
}
