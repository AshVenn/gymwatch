import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVisitsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = sessionResult.user.role as string | undefined
  const gymVariantId = sessionResult.user.gymVariantId ?? undefined
  const tier = sessionResult.user.subscriptionPlan ?? null

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.accessControl) {
    return jsonError(403, "ACCESS_CONTROL_REQUIRED", "Plan Pro ou Enterprise requis")
  }
  if (role === "GYM_ADMIN" && !gymVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  if (!eventId) {
    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
  }

  const event = await prisma.accessEvent.findUnique({
    where: { id: eventId },
    include: { member: { select: { id: true, gymId: true, gymVariantId: true } } },
  })

  if (!event || !event.member || event.member.gymId !== scope.gymId) {
    return NextResponse.json({ error: "Accès introuvable" }, { status: 404 })
  }

  if (role === "GYM_ADMIN" && gymVariantId && event.member.gymVariantId !== gymVariantId) {
    return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
  }

  await prisma.accessEvent.delete({ where: { id: eventId } })
  return NextResponse.json({ success: true })
}
