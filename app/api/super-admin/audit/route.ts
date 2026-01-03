import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { Permissions } from "@/lib/rbac/permissions"
import { jsonError, requirePermission, requireSession } from "@/lib/auth/guards"

const querySchema = z.object({
  query: z.string().trim().min(1).optional(),
  actor: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  target: z.string().trim().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  export: z.string().optional(),
})

const parseDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "INVALID" : parsed
}

const escapeCsv = (value: unknown) => {
  const raw = String(value ?? "")
  return `"${raw.replace(/"/g, '""')}"`
}

const toCsv = (rows: string[][]) => rows.map((row) => row.map(escapeCsv).join(",")).join("\n")

export async function GET(request: NextRequest) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformAuditRead)
  if (!permission.ok) return permission.response

  const parsed = querySchema.safeParse({
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    actor: request.nextUrl.searchParams.get("actor") ?? undefined,
    action: request.nextUrl.searchParams.get("action") ?? undefined,
    target: request.nextUrl.searchParams.get("target") ?? undefined,
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
    export: request.nextUrl.searchParams.get("export") ?? undefined,
  })

  if (!parsed.success) {
    return jsonError(400, "INVALID_QUERY", "Invalid query", parsed.error.flatten())
  }

  const { query, actor, action, target, from, to, page, pageSize, export: exportFormat } = parsed.data

  const createdAt: Prisma.DateTimeFilter = {}
  const fromDate = parseDate(from)
  const toDate = parseDate(to)
  if (fromDate === "INVALID" || toDate === "INVALID") {
    return jsonError(400, "INVALID_DATE", "Invalid date range")
  }
  if (fromDate) createdAt.gte = fromDate
  if (toDate) createdAt.lte = toDate

  const and: Prisma.AuditLogWhereInput[] = []

  if (action) {
    and.push({ action })
  }

  if (actor) {
    and.push({
      OR: [
        { actorEmail: { contains: actor, mode: "insensitive" } },
        { actorName: { contains: actor, mode: "insensitive" } },
        { actorId: { contains: actor, mode: "insensitive" } },
      ],
    })
  }

  if (target) {
    and.push({
      OR: [
        { targetId: { contains: target, mode: "insensitive" } },
        { targetType: { contains: target, mode: "insensitive" } },
      ],
    })
  }

  if (query) {
    and.push({
      OR: [
        { action: { contains: query, mode: "insensitive" } },
        { actorEmail: { contains: query, mode: "insensitive" } },
        { actorName: { contains: query, mode: "insensitive" } },
        { targetType: { contains: query, mode: "insensitive" } },
        { targetId: { contains: query, mode: "insensitive" } },
      ],
    })
  }

  if (fromDate || toDate) {
    and.push({ createdAt })
  }

  const where = and.length ? { AND: and } : {}

  const shouldExport = exportFormat?.toLowerCase() === "csv"

  if (shouldExport) {
    const exportLimit = Math.min(pageSize || 200, 5000)
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: exportLimit,
      select: {
        createdAt: true,
        actorEmail: true,
        actorName: true,
        actorRole: true,
        action: true,
        targetType: true,
        targetId: true,
        ip: true,
        userAgent: true,
        metadata: true,
      },
    })

    const csvRows: string[][] = [
      [
        "createdAt",
        "actorEmail",
        "actorName",
        "actorRole",
        "action",
        "targetType",
        "targetId",
        "ip",
        "userAgent",
        "metadata",
      ],
      ...rows.map((row) => [
        row.createdAt.toISOString(),
        row.actorEmail,
        row.actorName ?? "",
        row.actorRole,
        row.action,
        row.targetType ?? "",
        row.targetId ?? "",
        row.ip ?? "",
        row.userAgent ?? "",
        row.metadata ? JSON.stringify(row.metadata) : "",
      ]),
    ]

    const filename = `audit-logs-${Date.now()}.csv`
    return new NextResponse(toCsv(csvRows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    })
  }

  const skip = (page - 1) * pageSize
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
  })
}
