import type { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type AuditActor = {
  id?: string | null
  role?: UserRole | null
  email?: string | null
  name?: string | null
}

type AuditOptions = {
  actor: AuditActor
  action: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  request?: Request
}

const AUDIT_ROLES = new Set<UserRole>(["SUPER_ADMIN", "SUPER_MANAGER"])

const normalizeHeader = (value: string | null) => value?.trim() || null

export function extractRequestMeta(request?: Request) {
  if (!request) {
    return { ip: null, userAgent: null }
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  const ip = normalizeHeader(forwarded || realIp || null)
  const userAgent = normalizeHeader(request.headers.get("user-agent"))

  return { ip, userAgent }
}

export async function recordAudit(options: AuditOptions) {
  const role = options.actor.role ?? null
  if (!role || !AUDIT_ROLES.has(role)) {
    return null
  }

  const actorEmail = options.actor.email?.trim() || "unknown"
  const actorName = options.actor.name?.trim() || null
  const { ip, userAgent } = extractRequestMeta(options.request)

  try {
    return await prisma.auditLog.create({
      data: {
        actorId: options.actor.id ?? null,
        actorRole: role,
        actorEmail,
        actorName,
        action: options.action,
        targetType: options.targetType ?? null,
        targetId: options.targetId ?? null,
        metadata: options.metadata ?? undefined,
        ip,
        userAgent,
      },
    })
  } catch (error) {
    console.error("[audit][record]", error)
    return null
  }
}
