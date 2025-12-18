import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role as string | undefined
  const sessionVariantId = (session.user as any).gymVariantId as string | undefined

  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
  }

  const variants = await prisma.gymVariant.findMany({
    where: {
      gymId: session.user.gymId,
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
  const session = await getServerSession(authOptions)

  if (!session?.user?.gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role as string | undefined
  const sessionVariantId = (session.user as any).gymVariantId as string | undefined

  const body = await request.json().catch(() => null)
  const parsed = updateVariantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { variantId, capacity } = parsed.data

  if (role === "GYM_ADMIN") {
    if (!sessionVariantId) {
      return NextResponse.json({ error: "Variant required" }, { status: 403 })
    }
    if (variantId !== sessionVariantId) {
      return NextResponse.json({ error: "Forbidden for this variant" }, { status: 403 })
    }
  }

  const variant = await prisma.gymVariant.findFirst({
    where: { id: variantId, gymId: session.user.gymId },
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
