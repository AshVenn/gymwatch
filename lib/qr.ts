const TOKEN_REGEX = /^[a-f0-9]{16,128}$/i

export function extractQrToken(payload: string | null | undefined): string | null {
  if (!payload || typeof payload !== "string") return null

  const trimmed = payload.trim()
  const candidates: string[] = []

  try {
    const url = new URL(trimmed)
    const queryToken = url.searchParams.get("token")
    if (queryToken) candidates.push(queryToken)

    const segments = url.pathname.split("/").filter(Boolean)
    const qrIndex = segments.findIndex((segment) => segment.toLowerCase() === "qr")
    if (qrIndex >= 0 && segments[qrIndex + 1]) {
      candidates.push(segments[qrIndex + 1])
    }
  } catch {
    // Not a URL — fall back to raw parsing below
  }

  const inlineMatch = trimmed.match(/token=([A-Za-z0-9_-]+)/i)
  if (inlineMatch?.[1]) {
    candidates.push(inlineMatch[1])
  }

  candidates.push(trimmed)

  const token = candidates.find((value) => TOKEN_REGEX.test(value))
  return token ?? null
}

export function buildQrUrl(token: string, locale?: string | null, origin?: string) {
  const safeToken = extractQrToken(token)
  if (!safeToken) {
    throw new Error("Invalid QR token")
  }

  const localePrefix = locale ? `/${locale}` : ""
  const base =
    origin ??
    (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "")
  const normalizedBase = base ? base.replace(/\/$/, "") : ""

  return `${normalizedBase}${localePrefix}/qr/${safeToken}`
}

export function isQrToken(value: string | null | undefined) {
  return Boolean(extractQrToken(value ?? ""))
}
