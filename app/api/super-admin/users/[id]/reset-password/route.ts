import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const PLATFORM_ROLES = new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.SUPER_MANAGER])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformUsersWrite)
  if (!permission.ok) return permission.response

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })

  if (!target || !PLATFORM_ROLES.has(target.role)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "User not found" }, { status: 404 })
  }

  const tempPassword = randomBytes(9).toString("base64url")
  const hashed = await hashPassword(tempPassword)

  await prisma.user.update({
    where: { id: target.id },
    data: {
      password: hashed,
      sessionVersion: { increment: 1 },
    },
  })

  await recordAudit({
    actor: sessionResult.session.user,
    action: "platform.user.reset-password",
    targetType: "user",
    targetId: target.id,
    metadata: { role: target.role },
    request,
  })

  return NextResponse.json({ temporaryPassword: tempPassword })
}
