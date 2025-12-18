import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function GET(request: Request, { params }: { params: { gymId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = Math.max(parseInt(url.searchParams.get("page") ?? "1", 10), 1)
  const rawPageSize = parseInt(url.searchParams.get("pageSize") ?? "8", 10)
  const pageSize = Math.min(Math.max(rawPageSize || 8, 5), 50)
  const skip = (page - 1) * pageSize

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where: { gymId: params.gymId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        gymVariant: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.member.count({ where: { gymId: params.gymId } }),
  ])

  return NextResponse.json({ members, total, page, pageSize })
}
