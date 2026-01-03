import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string }> },
) {
  const { gymId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsRead)
  if (!permission.ok) return permission.response

  const url = new URL(request.url)
  const page = Math.max(parseInt(url.searchParams.get("page") ?? "1", 10), 1)
  const rawPageSize = parseInt(url.searchParams.get("pageSize") ?? "8", 10)
  const pageSize = Math.min(Math.max(rawPageSize || 8, 5), 50)
  const skip = (page - 1) * pageSize

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where: { gymId },
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
    prisma.member.count({ where: { gymId } }),
  ])

  return NextResponse.json({ members, total, page, pageSize })
}
