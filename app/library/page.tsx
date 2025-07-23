import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import LibraryClientPage from "./library-client-page"
import type { LibraryFile } from "@/types/library"
import { redirect } from "next/navigation"

export default async function LibraryPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect("/login") // Or your login page
  }
  const user = session.user

  // Fetch organization_id for the current user
  // This logic should match what's in your actions.ts or be centralized
  let organizationId: string | null = null
  try {
    const { data: memberData, error: memberError } = await supabase
      .from("members") // Assuming 'members' table links users to orgs
      .select("organization_id")
      .eq("id", user.id) // Assuming members.id is the user's auth.uid
      .single()

    if (memberError || !memberData) {
      console.warn("User not associated with an organization or error fetching:", memberError?.message)
      // Allow page to load but LibraryClientPage will show an error message if orgId is null
    } else {
      organizationId = memberData.organization_id
    }
  } catch (e: any) {
    console.error("Error fetching organization ID for library page:", e.message)
  }

  let files: LibraryFile[] = []
  let categories: string[] = []

  if (organizationId) {
    const { data, error } = await supabase
      .from("library_files")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching library files:", error)
      // Handle error appropriately, maybe show a message to the user
    } else {
      files = data as LibraryFile[]
      categories = [...new Set(files.map((f) => f.category).filter(Boolean) as string[])]
    }
  }

  return <LibraryClientPage initialFiles={files} organizationId={organizationId} categories={categories} />
}
