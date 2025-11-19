import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z, ZodError } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import { createGymAdminAccount } from "@/lib/super-admin"

const adminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function POST(
  req: Request,
  { params }: any,
) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = adminSchema.parse(await req.json())
    const admin = await createGymAdminAccount(params.gymId, body)
    return NextResponse.json(admin, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    if (error instanceof Error && error.message === "MAX_ADMINS_REACHED") {
      return NextResponse.json({ error: "Admin limit reached" }, { status: 409 })
    }

    console.error("[super-admin][gyms][admins][POST]", error)
    return NextResponse.json({ error: "Unable to create admin" }, { status: 500 })
  }
}
