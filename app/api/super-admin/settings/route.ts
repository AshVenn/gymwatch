import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import { getSystemSettings, updateSystemSettings } from "@/lib/settings"

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
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function GET() {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const settings = await getSystemSettings()
  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = settingsSchema.parse(await request.json())
    const updated = await updateSystemSettings(payload)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: "Unable to update settings" }, { status: 500 })
  }
}
