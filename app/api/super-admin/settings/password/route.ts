import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/lib/auth"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = passwordSchema.parse(await request.json())

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isValid = await verifyPassword(payload.currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: "Mot de passe actuel invalide" }, { status: 401 })
    }

    const hashed = await hashPassword(payload.newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        sessionVersion: { increment: 1 },
      },
    })

    return NextResponse.json({ success: true, sessionRevoked: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    return NextResponse.json({ error: "Unable to update password" }, { status: 500 })
  }
}
