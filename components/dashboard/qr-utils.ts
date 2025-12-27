'use client'

type QrLabelOptions = {
  fontFamily?: string
  fontColor?: string
  background?: string
  maxLines?: number
  fontSize?: number
  padding?: number
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) => {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []

  const lines: string[] = []
  let current = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const testLine = `${current} ${word}`
    if (ctx.measureText(testLine).width <= maxWidth) {
      current = testLine
      continue
    }

    lines.push(current)
    current = word
    if (lines.length === maxLines - 1) break
  }

  if (lines.length < maxLines) {
    lines.push(current)
  }

  if (lines.length === maxLines && words.length > 0) {
    const lastIndex = lines.length - 1
    let last = lines[lastIndex]
    while (ctx.measureText(`${last}...`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1)
    }
    lines[lastIndex] = `${last}...`
  }

  return lines
}

export async function buildLabeledQrDataUrl(
  qrDataUrl: string,
  label: string,
  options: QrLabelOptions = {},
): Promise<string> {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) return qrDataUrl

  const img = await loadImage(qrDataUrl)
  const fontFamily = options.fontFamily ?? "system-ui, -apple-system, Segoe UI, sans-serif"
  const fontSize = options.fontSize ?? Math.max(14, Math.round(img.width * 0.08))
  const padding = options.padding ?? Math.round(fontSize * 0.6)
  const maxLines = options.maxLines ?? 2

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return qrDataUrl

  ctx.font = `600 ${fontSize}px ${fontFamily}`
  const maxWidth = img.width - padding * 2
  const lines = wrapText(ctx, trimmedLabel, maxWidth, maxLines)
  const lineHeight = Math.round(fontSize * 1.2)
  const textHeight = lines.length * lineHeight
  const totalHeight = img.height + textHeight + padding * 2

  canvas.width = img.width
  canvas.height = totalHeight

  ctx.fillStyle = options.background ?? "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)

  ctx.font = `600 ${fontSize}px ${fontFamily}`
  ctx.fillStyle = options.fontColor ?? "#111827"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"

  const startY = img.height + padding
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight)
  })

  return canvas.toDataURL("image/png")
}
