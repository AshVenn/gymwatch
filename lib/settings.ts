import { prisma } from "./prisma"
import type { SystemSettings } from "@prisma/client"

type CachedSettings = {
  value: SystemSettings
  fetchedAt: number
}

const SETTINGS_CACHE_TTL_MS = 30_000
let cache: CachedSettings | null = null

const defaultSettings: Omit<SystemSettings, "createdAt" | "updatedAt"> = {
  id: 1,
  supportEmail: "support@gymwatch.ma",
  supportPhone: "+212600000000",
  brandColor: "#5b4bff",
  expiryReminder: true,
  weeklyDigest: true,
  incidentAlerts: true,
  payoutReport: false,
  gymSettingsIntervalMs: 60_000,
  userSettingsIntervalMs: 30_000,
}

async function readSettings(): Promise<SystemSettings> {
  const settings = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: defaultSettings,
  })
  cache = { value: settings, fetchedAt: Date.now() }
  return settings
}

export async function getSystemSettings(forceRefresh = false): Promise<SystemSettings> {
  if (
    !forceRefresh &&
    cache &&
    Date.now() - cache.fetchedAt < SETTINGS_CACHE_TTL_MS
  ) {
    return cache.value
  }
  return readSettings()
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  const updated = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { ...defaultSettings, ...data },
  })
  cache = { value: updated, fetchedAt: Date.now() }
  return updated
}
