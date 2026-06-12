import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { helpbotKnowledge } from "@/lib/ai/helpbot-knowledge"

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1200),
})

const requestSchema = z.object({
  locale: z.enum(["en", "fr", "ar"]).optional(),
  messages: z.array(messageSchema).min(1).max(8),
})

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
  error?: {
    message?: string
  }
}

const rateLimitWindowMs = 5 * 60 * 1000
const maxRequestsPerWindow = 12
const requestLog = new Map<string, number[]>()

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip") || "anonymous"
}

function isRateLimited(key: string) {
  const now = Date.now()
  const recent = (requestLog.get(key) ?? []).filter((time) => now - time < rateLimitWindowMs)
  if (recent.length >= maxRequestsPerWindow) {
    requestLog.set(key, recent)
    return true
  }

  recent.push(now)
  requestLog.set(key, recent)
  return false
}

function localeInstruction(locale?: "en" | "fr" | "ar") {
  if (locale === "ar") return "Answer in Arabic unless the user clearly asks for another language."
  if (locale === "en") return "Answer in English unless the user clearly asks for another language."
  return "Answer in French unless the user clearly asks for another language."
}

function toGeminiRole(role: "user" | "assistant") {
  return role === "assistant" ? "model" : "user"
}

function extractText(body: GeminiResponse) {
  return body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const key = getClientKey(request)
    if (isRateLimited(key)) {
      return NextResponse.json(
        { message: "Too many help requests. Please try again in a few minutes." },
        { status: 429 },
      )
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { message: "AI help is not configured yet." },
        { status: 503 },
      )
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite"
    const payload = requestSchema.parse(await request.json())
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                "You are the GymWatch help assistant.",
                localeInstruction(payload.locale),
                helpbotKnowledge,
              ].join("\n\n"),
            },
          ],
        },
        contents: payload.messages.map((message) => ({
          role: toGeminiRole(message.role),
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
    })

    const body = (await response.json().catch(() => ({}))) as GeminiResponse
    if (!response.ok) {
      console.error("[helpbot][gemini]", body.error?.message ?? response.statusText)
      return NextResponse.json(
        { message: "AI help is temporarily unavailable." },
        { status: 502 },
      )
    }

    const answer = extractText(body)
    if (!answer) {
      return NextResponse.json(
        { message: "AI help did not return an answer. Please try again." },
        { status: 502 },
      )
    }

    return NextResponse.json({ answer })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Invalid help request.", details: error.flatten() },
        { status: 422 },
      )
    }

    console.error("[helpbot]", error)
    return NextResponse.json(
      { message: "AI help is temporarily unavailable." },
      { status: 500 },
    )
  }
}
