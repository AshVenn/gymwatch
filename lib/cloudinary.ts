import crypto from "crypto"

type UploadOptions = {
  folder?: string
  publicId?: string
}

export type CloudinaryUploadResult = {
  url: string
  publicId: string
  width?: number
  height?: number
}

function ensureConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error("CLOUDINARY_MISCONFIGURED")
    error.name = "CLOUDINARY_MISCONFIGURED"
    throw error
  }

  return { cloudName, apiKey, apiSecret }
}

export async function uploadImageFromFile(file: File, options: UploadOptions = {}): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = ensureConfig()

  const folder = options.folder || "gymwatch/partners"
  const timestamp = Math.round(Date.now() / 1000)

  const params = [`folder=${folder}`, `timestamp=${timestamp}`]
  if (options.publicId) {
    params.push(`public_id=${options.publicId}`)
  }

  const stringToSign = params.sort().join("&") + apiSecret
  const signature = crypto.createHash("sha1").update(stringToSign).digest("hex")

  const arrayBuffer = await file.arrayBuffer()
  const body = new FormData()
  body.append("file", new Blob([arrayBuffer]))
  body.append("api_key", apiKey)
  body.append("timestamp", String(timestamp))
  body.append("signature", signature)
  body.append("folder", folder)
  if (options.publicId) {
    body.append("public_id", options.publicId)
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  const response = await fetch(uploadUrl, {
    method: "POST",
    body,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload?.error?.message || "UPLOAD_FAILED"
    const error = new Error(detail)
    error.name = "UPLOAD_FAILED"
    throw error
  }

  return {
    url: payload.secure_url || payload.url,
    publicId: payload.public_id,
    width: payload.width,
    height: payload.height,
  }
}
