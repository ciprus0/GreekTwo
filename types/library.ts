// This file should already exist from the previous response.
// No changes needed if it's already in your project.
export interface LibraryFile {
  id: string
  created_at: string
  user_id: string | null
  organization_id: string | null
  file_name: string
  storage_path: string
  file_url: string
  file_type: string | null
  file_size: number | null
  display_name: string
  description: string | null
  category: string | null
  uploader_name?: string
}
