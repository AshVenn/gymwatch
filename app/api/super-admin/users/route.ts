import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { Prisma, UserRole, UserStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const querySchema = z.object({
  query: z.string().trim().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "SUPER_MANAGER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "SUPER_MANAGER"]),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
})

const PLATFORM_ROLES = [UserRole.SUPER_ADMIN, UserRole.SUPER_MANAGER]

export async function GET(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformUsersRead)
  if (!permission.ok) return permission.response

  const parsed = querySchema.safeParse({
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    role: request.nextUrl.searchParams.get("role") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_QUERY", message: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { query, role, status, page, pageSize } = parsed.data
  const skip = (page - 1) * pageSize

  const where: Prisma.UserWhereInput = {
    role: role ? (role as UserRole) : { in: PLATFORM_ROLES },
    ...(status ? { status: status as UserStatus } : {}),
    ...(query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
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
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
  })
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformUsersWrite)
  if (!permission.ok) return permission.response

  try {
    const payload = createSchema.parse(await request.json())
    const hashed = await hashPassword(payload.password)

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email,
          password: hashed,
          role: payload.role as UserRole,
          status: (payload.status ?? "ACTIVE") as UserStatus,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          gymId: null,
          gymVariantId: null,
        },
      })
      await tx.userPreference.create({ data: { userId: user.id } })
      return user
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.user.create",
      targetType: "user",
      targetId: created.id,
      metadata: {
        role: created.role,
        status: created.status,
        email: created.email,
      },
      request,
    })

    return NextResponse.json(
      {
        id: created.id,
        email: created.email,
        firstName: created.firstName,
        lastName: created.lastName,
        role: created.role,
        status: created.status,
        createdAt: created.createdAt,
        lastLoginAt: created.lastLoginAt,
      },
      { status: 201 },
    )
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
    console.error("[super-admin][users][POST]", error)
    return NextResponse.json(
      { code: "USER_CREATE_FAILED", message: "Unable to create user" },
      { status: 500 },
    )
  }
}
