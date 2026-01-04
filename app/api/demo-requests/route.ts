import { NextRequest, NextResponse } from "next/server"
import { DemoRequestStatus, GymPlanTier } from "@prisma/client"
import { z, ZodError } from "zod"
import { prisma } from "@/lib/prisma"
import { getClientIdentifier, rateLimit } from "@/lib/rate-limit"
import { formatEmailHtml, formatEmailText, sendEmail, type EmailSection } from "@/lib/email"

export const runtime = "nodejs"

const demoRequestSchema = z.object({
  gymName: z.string().min(2),
  gymEmail: z.string().email(),
  adminEmail: z.string().email(),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  phone: z.string().min(6),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  plan: z.nativeEnum(GymPlanTier),
  message: z.string().min(1).max(2000),
  botField: z.string().max(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const identifier = getClientIdentifier(request)
    const limit = rateLimit({
      key: `demo-request:${identifier}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })

    if (!limit.ok) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": `${limit.retryAfter}` } },
      )
    }

    const origin = request.headers.get("origin")
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Payload invalide" }, { status: 400 })
    }

    const body = demoRequestSchema.parse(await request.json())

    if (body.botField) {
      return NextResponse.json({ error: "Payload invalide" }, { status: 400 })
    }

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
        adminFirstName: body.adminFirstName.trim(),
        adminLastName: body.adminLastName.trim(),
        phone: body.phone.trim(),
        address: body.address.trim(),
        city: body.city.trim(),
        country: body.country.trim(),
        plan: body.plan,
        message: body.message.trim(),
        status: DemoRequestStatus.PENDING,
      },
    })

    const sections: EmailSection[] = [
      { label: "Gym name", value: created.gymName },
      { label: "Gym email", value: created.gymEmail },
      { label: "Admin name", value: `${created.adminFirstName} ${created.adminLastName}` },
      { label: "Admin email", value: created.adminEmail },
      { label: "Phone", value: created.phone },
      { label: "Address", value: created.address },
      { label: "City", value: created.city },
      { label: "Country", value: created.country },
      { label: "Plan", value: created.plan },
      { label: "Message", value: created.message },
    ]

    const title = "New demo request"
    try {
      await sendEmail({
        subject: `Demo request: ${created.gymName}`,
        text: formatEmailText(title, sections),
        html: formatEmailHtml(title, sections),
        replyTo: created.adminEmail,
      })
    } catch (error) {
      await prisma.demoRequest.delete({ where: { id: created.id } }).catch(() => undefined)
      throw error
    }

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
