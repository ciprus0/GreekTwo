import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { invalidateOrganizationCache, cacheManager } from "@/lib/cache-manager"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function DELETE(request: Request) {
  try {
    const { fileId, userId, role } = await request.json()

    console.log("🗄️ Deleting library file from database:", { fileId, userId, role })

    // Validate permissions
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        {
          success: false,
          message: "Permission denied. Only administrators can delete files.",
        },
        { status: 403 },
      )
    }

    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: fileId",
        },
        { status: 400 },
      )
    }

    // Get file info for cache invalidation
    const { data: fileData, error: fetchError } = await supabaseAdmin
      .from("library_files_new")
      .select("organization_id, display_name")
      .eq("id", fileId)
      .single()

    if (fetchError) {
      console.error("��� Error fetching file:", fetchError)
      return NextResponse.json(
        {
          success: false,
          message: `File not found: ${fetchError.message}`,
        },
        { status: 404 },
      )
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin.from("library_files_new").delete().eq("id", fileId)

    if (dbError) {
      console.error("❌ Database deletion failed:", dbError)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to delete file from database: ${dbError.message}`,
        },
        { status: 500 },
      )
    }

    // Clear caches
    try {
      invalidateOrganizationCache(fileData.organization_id)
      cacheManager.deletePattern(`library_files:${fileData.organization_id}:*`)
      cacheManager.deletePattern(`library_classes:${fileData.organization_id}`)
      console.log("✅ Caches cleared")
    } catch (cacheError) {
      console.warn("⚠️ Cache clearing failed:", cacheError)
    }

    console.log("✅ File deleted from database successfully")

    return NextResponse.json({
      success: true,
      message: "File deleted successfully from database",
      fileId,
      fileName: fileData.display_name,
    })
  } catch (error: any) {
    console.error("❌ Database deletion error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
