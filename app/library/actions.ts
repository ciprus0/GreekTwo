"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { LibraryFile } from "@/types/library"

export interface UploadFileState {
  success: boolean
  message: string
  errors?: {
    file?: string[]
    displayName?: string[]
    category?: string[]
    description?: string[]
    general?: string[]
  }
  fileUrl?: string
}

export async function uploadFileAction(prevState: UploadFileState, formData: FormData): Promise<UploadFileState> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "Authentication required." }
  }

  // Attempt to get organization_id from the members table
  // This assumes a 'members' table linking users to organizations
  // and that the user is a member of exactly one organization for simplicity.
  // Adjust this logic if your user-organization mapping is different.
  let organizationId: string | null = null
  try {
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("organization_id")
      .eq("id", user.id) // Assuming members.id is the user's auth.uid
      .single()

    if (memberError || !memberData) {
      console.error("Error fetching member organization:", memberError)
      return {
        success: false,
        message: "Could not determine user organization. Please ensure you are part of an organization.",
        errors: { general: ["Could not determine user organization."] },
      }
    }
    organizationId = memberData.organization_id
  } catch (e) {
    console.error("Exception fetching member organization:", e)
    return {
      success: false,
      message: "Error determining user organization.",
      errors: { general: ["Error determining user organization."] },
    }
  }

  if (!organizationId) {
    return {
      success: false,
      message: "Organization ID not found for user.",
      errors: { general: ["Organization ID not found for user."] },
    }
  }

  const file = formData.get("file") as File
  const displayName = formData.get("displayName") as string
  const category = formData.get("category") as string
  const description = formData.get("description") as string

  const errors: UploadFileState["errors"] = {}

  if (!file || file.size === 0) {
    errors.file = ["File is required."]
  } else {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      errors.file = ["Invalid file type. Only PDF, JPG, PNG are allowed."]
    }
    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      errors.file = ["File size exceeds 50MB limit."]
    }
  }
  if (!displayName || displayName.trim().length === 0) {
    errors.displayName = ["Display name is required."]
  }
  if (!category || category.trim().length === 0) {
    errors.category = ["Category is required."]
  }
  // Description is optional, so no validation unless you want min/max length

  if (Object.keys(errors).length > 0) {
    return { success: false, message: "Validation failed.", errors }
  }

  const fileName = file.name
  const fileExtension = fileName.split(".").pop()
  const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`
  // Store files in a path like: library-uploads/{organization_id}/{user_id}/{uniqueFileName}
  const filePath = `${organizationId}/${user.id}/${uniqueFileName}`
  const bucketName = "library-uploads" // Make sure this bucket exists in your Supabase Storage

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file)

    if (uploadError) {
      console.error("Supabase Storage Error:", uploadError)
      return {
        success: false,
        message: `Storage error: ${uploadError.message}`,
        errors: { general: [`Storage error: ${uploadError.message}`] },
      }
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return {
        success: false,
        message: "Could not get public URL for the file.",
        errors: { general: ["Could not get public URL."] },
      }
    }

    const newLibraryFile: Omit<LibraryFile, "id" | "created_at"> = {
      user_id: user.id,
      organization_id: organizationId,
      file_name: fileName,
      storage_path: filePath, // Store the path within the bucket
      file_url: publicUrlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      display_name: displayName,
      description: description || null,
      category: category,
    }

    const { error: insertError } = await supabase.from("library_files").insert(newLibraryFile)

    if (insertError) {
      console.error("Supabase Insert Error:", insertError)
      // Attempt to delete the uploaded file if DB insert fails
      await supabase.storage.from(bucketName).remove([filePath])
      return {
        success: false,
        message: `Database error: ${insertError.message}`,
        errors: { general: [`Database error: ${insertError.message}`] },
      }
    }

    revalidatePath("/library")
    return { success: true, message: "File uploaded successfully!", fileUrl: publicUrlData.publicUrl }
  } catch (error: any) {
    console.error("Upload Action Error:", error)
    return {
      success: false,
      message: `An unexpected error occurred: ${error.message}`,
      errors: { general: [`An unexpected error occurred: ${error.message}`] },
    }
  }
}
