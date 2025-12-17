import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth-middleware"
import { uploadImageFromFile } from "@/lib/cloudinary"

export const runtime = "nodejs"

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function POST(req: Request) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file")
    const folder = formData.get("folder")
    const publicId = formData.get("publicId")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const uploaded = await uploadImageFromFile(file, {
      folder: typeof folder === "string" && folder.trim() ? folder : undefined,
      publicId: typeof publicId === "string" && publicId.trim() ? publicId : undefined,
    })

    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "CLOUDINARY_MISCONFIGURED") {
      return NextResponse.json({ error: "Cloudinary configuration missing" }, { status: 500 })
    }

    console.error("[super-admin][partners][upload]", error)
    return NextResponse.json({ error: "Unable to upload image" }, { status: 500 })
  }
}
