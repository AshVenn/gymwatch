import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

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
    select: { id: true, name: true, slug: true, isDefault: true, maxSessionMinutes: true },
  })

  return NextResponse.json(variants)
}
