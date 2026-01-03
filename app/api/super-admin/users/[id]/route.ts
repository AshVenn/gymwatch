import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { Prisma, UserRole, UserStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const updateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).nullable().optional(),
  lastName: z.string().min(1).nullable().optional(),
  role: z.enum(["SUPER_ADMIN", "SUPER_MANAGER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
})

const PLATFORM_ROLES = [UserRole.SUPER_ADMIN, UserRole.SUPER_MANAGER]

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformUsersWrite)
  if (!permission.ok) return permission.response

  try {
    const payload = updateSchema.parse(await request.json())
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, status: true, email: true },
    })

    if (!target || !PLATFORM_ROLES.includes(target.role)) {
      return NextResponse.json({ code: "NOT_FOUND", message: "User not found" }, { status: 404 })
    }

    const isSelf = sessionResult.user.id === target.id
    const roleChange = payload.role && payload.role !== target.role
    const statusChange = payload.status && payload.status !== target.status

    if (isSelf && roleChange && target.role === UserRole.SUPER_ADMIN && payload.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { code: "ROLE_SELF_BLOCKED", message: "Vous ne pouvez pas retirer votre role SUPER_ADMIN." },
        { status: 409 },
      )
    }

    if (roleChange && target.role === UserRole.SUPER_ADMIN && payload.role !== UserRole.SUPER_ADMIN) {
      const activeAdmins = await prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE },
      })
      if (activeAdmins <= 1 && target.status === UserStatus.ACTIVE) {
        return NextResponse.json(
          { code: "LAST_SUPER_ADMIN", message: "Dernier SUPER_ADMIN actif." },
          { status: 409 },
        )
      }
    }

    if (statusChange && payload.status === "SUSPENDED" && target.role === UserRole.SUPER_ADMIN) {
      const activeAdmins = await prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE },
      })
      if (activeAdmins <= 1 && target.status === UserStatus.ACTIVE) {
        return NextResponse.json(
          { code: "LAST_SUPER_ADMIN", message: "Dernier SUPER_ADMIN actif." },
          { status: 409 },
        )
      }
    }

    const data: Prisma.UserUpdateInput = {
      email: payload.email ?? undefined,
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
      role: payload.role ? (payload.role as UserRole) : undefined,
      status: payload.status ? (payload.status as UserStatus) : undefined,
      gymId: payload.role ? null : undefined,
      gymVariantId: payload.role ? null : undefined,
      ...(roleChange || statusChange ? { sessionVersion: { increment: 1 } } : {}),
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.user.update",
      targetType: "user",
      targetId: updated.id,
      metadata: {
        updatedFields: Object.keys(payload),
        role: updated.role,
        status: updated.status,
      },
      request,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { code: "EMAIL_TAKEN", message: "Email already exists" },
        { status: 409 },
      )
    }
    console.error("[super-admin][users][PATCH]", error)
    return NextResponse.json(
      { code: "USER_UPDATE_FAILED", message: "Unable to update user" },
      { status: 500 },
    )
  }
}
