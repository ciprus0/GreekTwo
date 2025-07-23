import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

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

export async function POST(request: Request) {
  try {
    console.log("🔍 Storage delete API called")

    const body = await request.json()
    console.log("📦 Request body:", body)

    const { url, bucketName, storagePath } = body

    // If storagePath is provided directly, use it (preferred method)
    if (storagePath && bucketName) {
      console.log(`🗂️ Using provided storage path: "${storagePath}" in bucket "${bucketName}"`)

      const { data, error } = await supabaseAdmin.storage.from(bucketName).remove([storagePath])

      if (error) {
        console.error("❌ Storage deletion error:", error)
        return NextResponse.json(
          {
            success: false,
            message: `Storage deletion failed: ${error.message}`,
            details: error,
            attemptedPath: storagePath,
            bucketName: bucketName,
          },
          { status: 500 },
        )
      }

      console.log("✅ File deleted successfully from storage using direct path:", data)

      return NextResponse.json({
        success: true,
        message: "File deleted successfully from storage",
        data,
        deletedPath: storagePath,
        bucketName: bucketName,
        deletedFiles: data?.length || 0,
      })
    }

    // Fallback to URL-based path extraction if storagePath is not provided
    if (!url || !bucketName) {
      console.error("❌ Missing required fields:", { url, bucketName, storagePath })
      return NextResponse.json(
        {
          success: false,
          message: "Either storagePath and bucketName OR url and bucketName are required",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Extracting file path from URL:", url)
    console.log("🪣 Bucket name:", bucketName)

    // Extract the file path from the URL
    let filePath: string

    try {
      // Parse the URL
      const urlObj = new URL(url)
      console.log("🔗 URL parts:", {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
      })

      const pathParts = urlObj.pathname.split("/").filter((part) => part !== "")
      console.log("🔗 Path parts (filtered):", pathParts)

      // Look for the standard Supabase storage pattern
      // Expected: /storage/v1/object/public/bucketName/path/to/file.ext
      const storageIndex = pathParts.findIndex((part) => part === "storage")
      const objectIndex = pathParts.findIndex((part) => part === "object")
      const publicIndex = pathParts.findIndex((part) => part === "public")
      const bucketIndex = pathParts.findIndex((part) => part === bucketName)

      console.log("🔍 Pattern indices:", { storageIndex, objectIndex, publicIndex, bucketIndex })

      if (storageIndex !== -1 && objectIndex !== -1 && publicIndex !== -1 && bucketIndex !== -1) {
        // Standard Supabase storage URL pattern
        // Get everything after the bucket name
        filePath = pathParts.slice(bucketIndex + 1).join("/")
        console.log("📁 Extracted file path (standard pattern):", filePath)
      } else {
        // Fallback: try to find bucket name and get everything after it
        const bucketIndex = pathParts.findIndex((part) => part === bucketName)
        if (bucketIndex !== -1) {
          filePath = pathParts.slice(bucketIndex + 1).join("/")
          console.log("📁 Extracted file path (fallback pattern):", filePath)
        } else {
          throw new Error(`Bucket ${bucketName} not found in URL path`)
        }
      }

      if (!filePath) {
        throw new Error("Could not extract file path from URL")
      }

      console.log("📁 Final extracted file path:", filePath)

      // For library-uploads, the path structure is now simplified to:
      // organizationId/timestamp-filename.ext
      if (bucketName === "library-uploads") {
        const pathSegments = filePath.split("/")
        console.log("📚 Library file path segments:", pathSegments)
        console.log("📚 Expected structure: organizationId/timestamp-filename.ext")

        if (pathSegments.length < 2) {
          console.warn("⚠️ Unexpected library file path structure. Expected: organizationId/timestamp-filename.ext")
          console.warn(`⚠️ Got ${pathSegments.length} segments: ${pathSegments.join(" / ")}`)
        } else {
          console.log("📚 Path breakdown:", {
            organizationId: pathSegments[0],
            filename: pathSegments.slice(1).join("/"), // Handle filenames with slashes
          })
        }
      }
    } catch (pathError) {
      console.error("❌ Error extracting file path:", pathError)
      return NextResponse.json({ success: false, message: `Invalid URL format: ${pathError.message}` }, { status: 400 })
    }

    // Delete the file from storage
    console.log(`🗂️ Attempting to delete file from bucket "${bucketName}" with path: "${filePath}"`)

    const { data, error } = await supabaseAdmin.storage.from(bucketName).remove([filePath])

    if (error) {
      console.error("❌ Storage deletion error:", error)

      // Provide more specific error information
      let errorMessage = `Storage deletion failed: ${error.message}`

      if (error.message.includes("not found") || error.message.includes("does not exist")) {
        errorMessage += `\n\nFile path attempted: ${filePath}\nThis might indicate the file path extraction is incorrect.`

        // Try to provide helpful debugging info
        console.log("🔍 Debugging info for file not found:")
        console.log("🔍 Full URL:", url)
        console.log("🔍 Extracted path:", filePath)
        console.log("🔍 Bucket:", bucketName)

        // Break down the path for debugging
        const pathSegments = filePath.split("/")
        console.log("🔍 Path segments breakdown:")
        pathSegments.forEach((segment, index) => {
          console.log(`🔍   [${index}]: "${segment}"`)
        })
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          details: error,
          attemptedPath: filePath,
          bucketName: bucketName,
          fullUrl: url,
        },
        { status: 500 },
      )
    }

    console.log("✅ File deleted successfully from storage:", data)

    // Check if any files were actually deleted
    if (data && data.length === 0) {
      console.warn("⚠️ No files were deleted - file might not exist at the specified path")
      return NextResponse.json(
        {
          success: false,
          message: "File not found at the specified path",
          attemptedPath: filePath,
          bucketName: bucketName,
          fullUrl: url,
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully from storage",
      data,
      deletedPath: filePath,
      bucketName: bucketName,
      deletedFiles: data?.length || 0,
    })
  } catch (error: any) {
    console.error("❌ Storage delete API error:", error)
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 })
  }
}
