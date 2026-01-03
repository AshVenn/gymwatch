import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

export async function POST(request: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformSettingsManage)
  if (!permission.ok) return permission.response

  try {
    const payload = passwordSchema.parse(await request.json())

    const user = await prisma.user.findUnique({ where: { id: sessionResult.user.id } })
    if (!user) {
      return NextResponse.json({ code: "NOT_FOUND", message: "User not found" }, { status: 404 })
    }

    const isValid = await verifyPassword(payload.currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { code: "INVALID_PASSWORD", message: "Mot de passe actuel invalide" },
        { status: 401 },
      )
    }

    const hashed = await hashPassword(payload.newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        sessionVersion: { increment: 1 },
      },
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.account.password.update",
      targetType: "user",
      targetId: user.id,
      request,
    })

    return NextResponse.json({ success: true, sessionRevoked: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    return NextResponse.json(
      { code: "PASSWORD_UPDATE_FAILED", message: "Unable to update password" },
      { status: 500 },
    )
  }
}
