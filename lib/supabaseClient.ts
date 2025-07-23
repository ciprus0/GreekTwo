import { createBrowserClient } from "@supabase/ssr"

// Ensure your Vercel environment variables are set for these:
// NEXT_PUBLIC_SUPABASE_URL
// NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL. Please check your Vercel project settings.")
}

if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY. Please check your Vercel project settings.")
}

// Create and export the Supabase client instance
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
