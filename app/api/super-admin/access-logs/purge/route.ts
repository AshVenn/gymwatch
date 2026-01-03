import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSystemSettings, updateSystemSettings } from "@/lib/settings"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

async function purgeFromDatabase(cutoff: Date) {
  const [{ exists }] = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'AccessEvent'
    ) AS "exists"
  `

  if (!exists) {
    return { deleted: 0, tableMissing: true }
  }

  const deletedRaw = await prisma.$executeRaw`DELETE FROM "AccessEvent" WHERE "createdAt" < ${cutoff}`
  const deleted =
    typeof deletedRaw === "bigint" ? Number(deletedRaw) : Number(deletedRaw ?? 0)

  return { deleted, tableMissing: false }
}

export async function POST() {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformSettingsManage)
  if (!permission.ok) return permission.response

  try {
    const settings = await getSystemSettings()
    const retentionDays = Math.max(settings.accessLogRetentionDays ?? 1, 1)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    const { deleted, tableMissing } = await purgeFromDatabase(cutoff)
    const updatedSettings = await updateSystemSettings({ lastPurgeAt: new Date() })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.access-logs.purge",
      targetType: "access-log",
      targetId: "access-event",
      metadata: { deleted, retentionDays },
    })

    return NextResponse.json({
      deleted,
      lastPurgeAt: updatedSettings.lastPurgeAt,
      retentionDays,
      message: tableMissing ? "Aucune table AccessEvent trouvee, aucune donnee a purger." : undefined,
    })
  } catch (error) {
    console.error("[access-logs][purge]", error)
    return NextResponse.json(
      { code: "ACCESS_LOG_PURGE_FAILED", message: "Unable to purge access logs" },
      { status: 500 },
    )
  }
}
