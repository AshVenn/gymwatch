import { NextResponse } from "next/server"
import { z } from "zod"
import { getSystemSettings, updateSystemSettings } from "@/lib/settings"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const settingsSchema = z.object({
  supportEmail: z.string().email(),
  supportPhone: z.string().min(6),
  brandColor: z.string().min(4),
  expiryReminder: z.boolean(),
  weeklyDigest: z.boolean(),
  incidentAlerts: z.boolean(),
  payoutReport: z.boolean(),
  gymSettingsIntervalMs: z.coerce.number().int().min(5_000).max(3_600_000),
  userSettingsIntervalMs: z.coerce.number().int().min(5_000).max(3_600_000),
  accessLogRetentionDays: z.coerce.number().int().min(1).max(3_650),
})

export async function GET() {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformSettingsManage)
  if (!permission.ok) return permission.response

  const settings = await getSystemSettings()
  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformSettingsManage)
  if (!permission.ok) return permission.response

  try {
    const payload = settingsSchema.parse(await request.json())
    const updated = await updateSystemSettings(payload)

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.system-settings.update",
      targetType: "system-settings",
      targetId: "default",
      metadata: { updatedFields: Object.keys(payload) },
      request,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    return NextResponse.json(
      { code: "SETTINGS_UPDATE_FAILED", message: "Unable to update settings" },
      { status: 500 },
    )
  }
}
