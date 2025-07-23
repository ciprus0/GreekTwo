import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get("file") as File
    const bucketName = formData.get("bucketName") as string
    const filePath = formData.get("filePath") as string
    const userId = formData.get("userId") as string
    const cacheControl = (formData.get("cacheControl") as string) || "public, max-age=31536000"
    const upsert = formData.get("upsert") === "true"

    if (!file || !bucketName || !filePath || !userId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    console.log("📤 Uploading file to storage:", {
      fileName: file.name,
      size: file.size,
      type: file.type,
      bucketName,
      filePath,
      userId,
    })

    // Upload file to Supabase Storage using service role
    const { error: uploadError } = await supabaseAdmin.storage.from(bucketName).upload(filePath, file, {
      upsert,
      cacheControl,
      contentType: file.type,
    })

    if (uploadError) {
      console.error("❌ Storage upload error:", uploadError)
      return NextResponse.json({ message: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath)

    if (!publicUrlData?.publicUrl) {
      // Clean up the uploaded file if we can't get the URL
      await supabaseAdmin.storage.from(bucketName).remove([filePath])
      return NextResponse.json({ message: "Failed to get public URL" }, { status: 500 })
    }

    console.log("✅ File uploaded successfully to storage")

    // Return response with caching headers
    const response = NextResponse.json({
      message: "File uploaded successfully",
      publicUrl: publicUrlData.publicUrl,
      filePath,
      bucketName,
    })

    // Add caching headers for the API response
    response.headers.set("Cache-Control", "public, max-age=300") // Cache API response for 5 minutes

    return response
  } catch (error) {
    console.error("❌ Upload API error:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
