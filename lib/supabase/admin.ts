// lib/supabase/admin.ts
// This client uses the SERVICE_ROLE_KEY for admin-level access.
// IMPORTANT: Never expose the service role key on the client-side.
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check for missing environment variables at the module level
// to catch this early.
if (!supabaseUrl) {
  console.error("FATAL: Missing env.NEXT_PUBLIC_SUPABASE_URL for Supabase admin client.")
  // Optionally, throw an error to prevent the app from starting/misbehaving silently
  // throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseServiceRoleKey) {
  console.error("FATAL: Missing env.SUPABASE_SERVICE_ROLE_KEY for Supabase admin client.")
  // Optionally, throw an error
  // throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

let supabaseAdminClient: SupabaseClient | null = null

export const getSupabaseAdminClient = (): SupabaseClient => {
  // Ensure URL and Key are present before attempting to create client
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // This case should ideally be caught by the module-level checks,
    // but as a safeguard:
    throw new Error("Supabase URL or Service Role Key is missing. Cannot create admin client.")
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return supabaseAdminClient
}
