import { NextResponse } from "next/server"
import { getSuperAdminOverview } from "@/lib/super-admin"
import { Permissions } from "@/lib/rbac/permissions"
import { hasPermission } from "@/lib/rbac/policies"
import { requirePermission, requireSession } from "@/lib/auth/guards"

export async function GET() {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsRead)
  if (!permission.ok) return permission.response

  try {
    const stats = await getSuperAdminOverview()
    const canViewFinancials = hasPermission(
      sessionResult.user.role ?? null,
      Permissions.PlatformAnalyticsRevenue,
    )

    if (!canViewFinancials) {
      return NextResponse.json({
        ...stats,
        monthlyRevenue: null,
        revenueTrend: [],
      })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[super-admin][stats]", error)
    return NextResponse.json(
      { code: "STATS_LOAD_FAILED", message: "Unable to load stats" },
      { status: 500 },
    )
  }
}
