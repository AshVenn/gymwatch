import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { createGymAdminAccount } from "@/lib/super-admin"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const adminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  gymVariantId: z.string().optional(),
})

export async function POST(
  req: Request,
  { params }: any,
) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsWrite)
  if (!permission.ok) return permission.response

  try {
    const body = adminSchema.parse(await req.json())
    const admin = await createGymAdminAccount(params.gymId, body)

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.gym.admin.create",
      targetType: "gym",
      targetId: params.gymId,
      metadata: {
        adminId: admin.id,
        email: admin.email,
        variantId: body.gymVariantId ?? null,
      },
      request: req,
    })

    return NextResponse.json(admin, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    if (error instanceof Error && error.message === "MAX_ADMINS_REACHED") {
      return NextResponse.json(
        { code: "MAX_ADMINS_REACHED", message: "Admin limit reached" },
        { status: 409 },
      )
    }

    console.error("[super-admin][gyms][admins][POST]", error)
    return NextResponse.json(
      { code: "ADMIN_CREATE_FAILED", message: "Unable to create admin" },
      { status: 500 },
    )
  }
}
