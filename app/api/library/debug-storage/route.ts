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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ error: "fileId parameter required" }, { status: 400 })
    }

    // Get file info from database
    const { data: fileData, error: fetchError } = await supabaseAdmin
      .from("library_files_new")
      .select("*")
      .eq("id", fileId)
      .single()

    if (fetchError || !fileData) {
      return NextResponse.json({ error: "File not found in database" }, { status: 404 })
    }

    // List all files in the storage bucket
    const { data: bucketList, error: bucketError } = await supabaseAdmin.storage
      .from("library-uploads")
      .list("", { limit: 1000 })

    // Try to find the file in storage
    const { data: fileExists, error: existsError } = await supabaseAdmin.storage
      .from("library-uploads")
      .download(fileData.storage_path)

    return NextResponse.json({
      fileData,
      bucketContents: bucketList,
      bucketError,
      fileExistsInStorage: !existsError,
      storageError: existsError,
      storagePath: fileData.storage_path,
      fileUrl: fileData.file_url,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
