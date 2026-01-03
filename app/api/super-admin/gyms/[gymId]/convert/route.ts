import { NextRequest, NextResponse } from "next/server"
import { convertDemoGym } from "@/lib/super-admin"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ gymId: string }> },
) {
  const { gymId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsWrite)
  if (!permission.ok) return permission.response

  try {
    const updated = await convertDemoGym(gymId)
    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.gym.convert-demo",
      targetType: "gym",
      targetId: gymId,
      request: _req,
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ code: "NOT_FOUND", message: "Not found" }, { status: 404 })
      }
      if (error.message === "NOT_DEMO") {
        return NextResponse.json(
          { code: "NOT_DEMO", message: "Not a demo gym" },
          { status: 400 },
        )
      }
    }
    return NextResponse.json(
      { code: "GYM_CONVERT_FAILED", message: "Unable to convert gym" },
      { status: 500 },
    )
  }
}
