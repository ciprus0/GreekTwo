import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { invalidateOrganizationCache, cacheManager } from "@/lib/cache-manager"

// Create a Supabase client with the service role key for admin operations
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
    const { fileId, storagePath, userId, role } = await request.json()

    console.log("🗑️ Starting library file deletion:", { fileId, storagePath, userId, role })

    // Validate permissions
    if (role !== "admin" && role !== "superadmin") {
      console.log("❌ Permission denied for user:", userId)
      return NextResponse.json(
        {
          success: false,
          message: "Permission denied. Only administrators can delete files.",
        },
        { status: 403 },
      )
    }

    // Validate required fields
    if (!fileId) {
      console.log("❌ Missing fileId")
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: fileId",
        },
        { status: 400 },
      )
    }

    // Get the file info from database to verify it exists and get the file URL
    console.log("📋 Fetching file info from database...")
    const { data: fileData, error: fetchError } = await supabaseAdmin
      .from("library_files_new")
      .select("id, organization_id, file_url, storage_path, display_name, file_type")
      .eq("id", fileId)
      .single()

    if (fetchError) {
      console.error("❌ Error fetching file from database:", fetchError)
      return NextResponse.json(
        {
          success: false,
          message: `File not found in database: ${fetchError.message}`,
        },
        { status: 404 },
      )
    }

    if (!fileData) {
      console.log("❌ File not found in database")
      return NextResponse.json(
        {
          success: false,
          message: "File not found in database",
        },
        { status: 404 },
      )
    }

    console.log("✅ File found in database:", {
      id: fileData.id,
      name: fileData.display_name,
      fileUrl: fileData.file_url,
      storagePath: fileData.storage_path,
    })

    // Step 1: Delete from storage using the same method as profile pictures
    console.log("🗂️ Deleting from storage using profile picture method...")

    // Use our API route to delete the file (same as profile pictures)
    const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/storage/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      },
      body: JSON.stringify({
        url: fileData.file_url,
        bucketName: "library-uploads",
      }),
    })

    // If the direct API approach doesn't work, try the storage API method that works for profile pictures
    let storageDeleteSuccess = false

    try {
      // Method 1: Use the storage delete API directly (same as profile pictures)
      const response = await fetch("/api/storage/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: fileData.file_url,
          bucketName: "library-uploads",
        }),
      })

      if (response.ok) {
        console.log("✅ File deleted from storage using storage API")
        storageDeleteSuccess = true
      } else {
        console.warn("⚠️ Storage API deletion failed, trying direct method...")
      }
    } catch (storageApiError) {
      console.warn("⚠️ Storage API error:", storageApiError)
    }

    // Method 2: If storage API fails, try direct Supabase method
    if (!storageDeleteSuccess) {
      // Extract the file path from the URL (same logic as profile pictures)
      let pathToDelete = fileData.storage_path

      if (!pathToDelete && fileData.file_url) {
        // Extract path from URL if storage_path is not available
        const url = new URL(fileData.file_url)
        const pathParts = url.pathname.split("/")
        const bucketIndex = pathParts.findIndex((part) => part === "library-uploads")
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          pathToDelete = pathParts.slice(bucketIndex + 1).join("/")
        }
      }

      if (pathToDelete) {
        console.log("🔄 Trying direct Supabase storage deletion with path:", pathToDelete)

        const { error: storageError } = await supabaseAdmin.storage.from("library-uploads").remove([pathToDelete])

        if (storageError) {
          console.error("❌ Direct storage deletion failed:", storageError)
          return NextResponse.json(
            {
              success: false,
              message: `Failed to delete file from storage: ${storageError.message}`,
              details: storageError,
            },
            { status: 500 },
          )
        } else {
          console.log("✅ File deleted from storage using direct method")
          storageDeleteSuccess = true
        }
      }
    }

    if (!storageDeleteSuccess) {
      console.error("❌ All storage deletion methods failed")
      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete file from storage using all available methods",
        },
        { status: 500 },
      )
    }

    // Step 2: Delete from Database (only after successful storage deletion)
    console.log("🗄️ Deleting from database...")
    const { error: dbError } = await supabaseAdmin.from("library_files_new").delete().eq("id", fileId)

    if (dbError) {
      console.error("❌ Database deletion failed:", dbError)
      console.error("🚨 CRITICAL: File deleted from storage but database deletion failed!", {
        fileId,
        dbError: dbError.message,
      })

      return NextResponse.json(
        {
          success: false,
          message: `Failed to delete file record from database: ${dbError.message}`,
          details: dbError,
          criticalError: true,
        },
        { status: 500 },
      )
    }

    console.log("✅ File deleted from database")

    // Step 3: Invalidate all related caches
    console.log("🧹 Clearing caches...")
    try {
      invalidateOrganizationCache(fileData.organization_id)
      cacheManager.deletePattern(`library_files:${fileData.organization_id}:*`)
      cacheManager.deletePattern(`library_classes:${fileData.organization_id}`)
      cacheManager.deletePattern(`file_url:*`)
      console.log("✅ Caches cleared successfully")
    } catch (cacheError) {
      console.warn("⚠️ Cache clearing failed (non-critical):", cacheError)
    }

    // Success response
    console.log("🎉 Library file deletion completed successfully")
    const response = NextResponse.json({
      success: true,
      message: "File deleted successfully from both storage and database",
      fileId,
      fileName: fileData.display_name,
      deletedFromStorage: true,
      deletedFromDatabase: true,
    })

    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error: any) {
    console.error("❌ Unexpected error during file deletion:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An unexpected error occurred during file deletion",
        details: error,
      },
      { status: 500 },
    )
  }
}
