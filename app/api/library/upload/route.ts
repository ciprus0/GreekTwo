import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { compressImage } from "@/lib/file-storage"

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const displayName = formData.get("displayName") as string
    const description = formData.get("description") as string
    const category = formData.get("category") as string
    const organizationId = formData.get("organizationId") as string
    const userId = formData.get("userId") as string

    // Get metadata fields
    const itemType = formData.get("itemType") as string
    const className = formData.get("className") as string
    const documentType = formData.get("documentType") as string
    const compositeType = formData.get("compositeType") as string
    const compositeYear = formData.get("compositeYear") as string

    console.log("📤 Starting library file upload:", {
      fileName: file?.name,
      displayName,
      category,
      organizationId,
      userId,
      fileSize: file?.size,
      fileType: file?.type,
      itemType,
      className,
      documentType,
      compositeType,
      compositeYear,
    })

    if (!file || !displayName || !category || !organizationId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Process the file
    const processedFile = file
    let fileBuffer = await file.arrayBuffer()

    // Compress images
    if (file.type.startsWith("image/")) {
      console.log("🖼️ Compressing image...")
      try {
        const compressedBuffer = await compressImage(fileBuffer, {
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1920,
        })
        fileBuffer = compressedBuffer
        console.log(`✅ Image compressed: ${file.size} → ${fileBuffer.byteLength} bytes`)
      } catch (compressionError) {
        console.warn("⚠️ Image compression failed, using original:", compressionError)
      }
    }

    // Create a simplified file path: organizationId/timestamp-filename.ext
    // This follows the same pattern as profile pictures with just one level of nesting
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const storagePath = `${organizationId}/${timestamp}-${sanitizedFileName}`

    console.log("📁 Simplified storage path:", storagePath)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("library-uploads")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error("❌ Storage upload failed:", uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    console.log("✅ File uploaded to storage:", uploadData)

    // Get the public URL
    const { data: urlData } = supabaseAdmin.storage.from("library-uploads").getPublicUrl(storagePath)

    if (!urlData?.publicUrl) {
      console.error("❌ Failed to get public URL")
      return NextResponse.json({ error: "Failed to get file URL" }, { status: 500 })
    }

    console.log("🔗 Public URL generated:", urlData.publicUrl)

    // Save to database with all metadata fields
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from("library_files_new")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        file_name: sanitizedFileName,
        storage_path: storagePath, // Store the simplified path
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: fileBuffer.byteLength,
        display_name: displayName,
        description: description || null,
        category: category,
        // Save all metadata fields
        item_type: itemType || null,
        class_name: itemType === "class" ? className : null,
        document_type: itemType === "chapter" ? documentType : null,
        composite_type: documentType === "Composites" ? compositeType : null,
        composite_year: documentType === "Composites" ? compositeYear : null,
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Database insert failed:", dbError)

      // Clean up the uploaded file since database insert failed
      await supabaseAdmin.storage.from("library-uploads").remove([storagePath])

      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    console.log("✅ File record saved to database:", dbData)

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      file: dbData,
    })
  } catch (error: any) {
    console.error("❌ Upload API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
