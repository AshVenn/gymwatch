import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"

export async function DELETE(_request: Request, { params }: { params: { eventId?: string } }) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const gymVariantId = (session?.user as any)?.gymVariantId as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasPlanFeature(tier, "accessControl")) {
    return NextResponse.json({ error: "Plan Pro ou Complex requis" }, { status: 403 })
  }
  if (role === "GYM_ADMIN" && !gymVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  const eventId = Array.isArray(params?.eventId) ? params.eventId[0] : params.eventId
  if (!eventId) {
    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
  }

  const event = await prisma.accessEvent.findUnique({
    where: { id: eventId },
    include: { member: { select: { id: true, gymId: true, gymVariantId: true } } },
  })

  if (!event || !event.member || event.member.gymId !== gymId) {
    return NextResponse.json({ error: "Accès introuvable" }, { status: 404 })
  }

  if (role === "GYM_ADMIN" && gymVariantId && event.member.gymVariantId !== gymVariantId) {
    return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
  }

  await prisma.accessEvent.delete({ where: { id: eventId } })
  return NextResponse.json({ success: true })
}
