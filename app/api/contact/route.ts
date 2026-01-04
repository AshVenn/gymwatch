import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { formatEmailHtml, formatEmailText, sendEmail, type EmailSection } from "@/lib/email"
import { getClientIdentifier, rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

function buildAllowedOrigins(request: NextRequest) {
  const origins = new Set<string>()
  origins.add(request.nextUrl.origin)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (appUrl) {
    const normalized = normalizeOrigin(appUrl)
    if (normalized) origins.add(normalized)
  }

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    const normalized = normalizeOrigin(vercelUrl)
    if (normalized) origins.add(normalized)
  }

  const extra = process.env.ALLOWED_ORIGINS
  if (extra) {
    for (const entry of extra.split(",")) {
      const normalized = normalizeOrigin(entry)
      if (normalized) origins.add(normalized)
    }
  }

  return origins
}

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
    const allowedOrigins = buildAllowedOrigins(request)
    if (origin && !allowedOrigins.has(origin)) {
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
