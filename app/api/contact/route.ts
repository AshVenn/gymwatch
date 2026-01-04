import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { formatEmailHtml, formatEmailText, sendEmail, type EmailSection } from "@/lib/email"
import { getClientIdentifier, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const contactSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  company: z.string().trim().optional(),
  sites: z.string().trim().optional(),
  message: z.string().trim().min(1).max(4000),
  botField: z.string().max(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const identifier = getClientIdentifier(request)
    const limit = rateLimit({
      key: `contact:${identifier}`,
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
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const payload = contactSchema.parse(await request.json())
    if (payload.botField) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const sections: EmailSection[] = [
      { label: "Name", value: payload.name },
      { label: "Email", value: payload.email },
      { label: "Company / network", value: payload.company },
      { label: "Number of locations", value: payload.sites },
      { label: "Message", value: payload.message },
    ]

    const title = "New contact form submission"
    await sendEmail({
      subject: `Contact form: ${payload.name}`,
      text: formatEmailText(title, sections),
      html: formatEmailHtml(title, sections),
      replyTo: payload.email,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }
    console.error("[contact][POST]", error)
    return NextResponse.json(
      { error: "Unable to send message right now." },
      { status: 500 },
    )
  }
}
