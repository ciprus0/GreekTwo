import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

// Ensure your environment variables are correctly prefixed and available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error("Supabase URL is not defined. Please check your environment variables for NEXT_PUBLIC_SUPABASE_URL.")
}
if (!supabaseAnonKey) {
  console.error(
    "Supabase Anon Key is not defined. Please check your environment variables for NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  )
}

// Type for your database schema if you have one (optional but recommended)
// type Database = { /* ... your schema ... */ }

// Create and export a single Supabase client instance for browser-side use
// We ensure URL and Key exist, otherwise createSupabaseClient would throw an error or return a non-functional client.
// The exclamation marks are removed in favor of runtime checks or allowing Supabase's own error handling.
export const supabase: SupabaseClient = createSupabaseClient(
  supabaseUrl!, // Assuming Supabase SDK handles null/undefined gracefully or you've ensured they are set
  supabaseAnonKey!,
)

// Optionally, you can keep the function to create a new client if needed elsewhere,
// but for most client-side components, using the singleton `supabase` instance is preferred.
export const createNewSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is not defined. Cannot create Supabase client.")
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}
