import { NextResponse } from "next/server"
import { uploadImageFromFile } from "@/lib/cloudinary"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformPartnersManage)
  if (!permission.ok) return permission.response

  try {
    const formData = await req.formData()
    const file = formData.get("file")
    const folder = formData.get("folder")
    const publicId = formData.get("publicId")

    if (!(file instanceof File)) {
      return NextResponse.json({ code: "MISSING_FILE", message: "Missing file" }, { status: 400 })
    }

    const uploaded = await uploadImageFromFile(file, {
      folder: typeof folder === "string" && folder.trim() ? folder : undefined,
      publicId: typeof publicId === "string" && publicId.trim() ? publicId : undefined,
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.partner.upload",
      targetType: "partner-asset",
      targetId: uploaded.publicId,
      metadata: { folder: typeof folder === "string" ? folder : null },
      request: req,
    })

    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "CLOUDINARY_MISCONFIGURED") {
      return NextResponse.json(
        { code: "CLOUDINARY_MISCONFIGURED", message: "Cloudinary configuration missing" },
        { status: 500 },
      )
    }

    console.error("[super-admin][partners][upload]", error)
    return NextResponse.json(
      { code: "PARTNER_UPLOAD_FAILED", message: "Unable to upload image" },
      { status: 500 },
    )
  }
}
