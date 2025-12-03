import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { getSystemSettings, updateSystemSettings } from "@/lib/settings"

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

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
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const settings = await getSystemSettings()
    const retentionDays = Math.max(settings.accessLogRetentionDays ?? 1, 1)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    const { deleted, tableMissing } = await purgeFromDatabase(cutoff)
    const updatedSettings = await updateSystemSettings({ lastPurgeAt: new Date() })

    return NextResponse.json({
      deleted,
      lastPurgeAt: updatedSettings.lastPurgeAt,
      retentionDays,
      message: tableMissing ? "Aucune table AccessEvent trouvee, aucune donnee a purger." : undefined,
    })
  } catch (error) {
    console.error("[access-logs][purge]", error)
    return NextResponse.json({ error: "Unable to purge access logs" }, { status: 500 })
  }
}
