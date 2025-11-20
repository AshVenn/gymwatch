import { NextRequest, NextResponse } from "next/server"
import { DemoRequestStatus, GymPlanTier } from "@prisma/client"
import { z, ZodError } from "zod"
import { prisma } from "@/lib/prisma"

const demoRequestSchema = z.object({
  gymName: z.string().min(2),
  gymEmail: z.string().email(),
  adminEmail: z.string().email(),
  adminFirstName: z.string().optional(),
  adminLastName: z.string().optional(),
  phone: z.string().min(6).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  plan: z.nativeEnum(GymPlanTier),
  message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = demoRequestSchema.parse(await request.json())

    const existing = await prisma.demoRequest.findFirst({
      where: { gymEmail: body.gymEmail, status: DemoRequestStatus.PENDING },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Une demande est deja en cours pour cet email de salle." },
        { status: 409 },
      )
    }

    const created = await prisma.demoRequest.create({
      data: {
        gymName: body.gymName.trim(),
        gymEmail: body.gymEmail.trim().toLowerCase(),
        adminEmail: body.adminEmail.trim().toLowerCase(),
        adminFirstName: body.adminFirstName?.trim() || null,
        adminLastName: body.adminLastName?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        country: body.country?.trim() || null,
        plan: body.plan,
        message: body.message?.trim() || null,
        status: DemoRequestStatus.PENDING,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("[demo-request][POST]", error)
    return NextResponse.json(
      { error: "Impossible denvoyer la demande" },
      { status: 500 },
    )
  }
}
