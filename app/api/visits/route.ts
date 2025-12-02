import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { markVisitForMember } from "@/lib/visits"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const gymVariantId = (session?.user as any)?.gymVariantId as string | undefined

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { memberId, markVisit = true } = await request.json()

  if (!memberId || typeof memberId !== "string") {
    return NextResponse.json({ error: "memberId requis" }, { status: 400 })
  }

  try {
    const result = await markVisitForMember({
      gymId,
      memberId,
      markVisit,
      allowedVariantId: role === "GYM_ADMIN" ? gymVariantId : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark visit"
    const status = message === "Member not found" ? 404 : message === "FORBIDDEN_VARIANT" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
