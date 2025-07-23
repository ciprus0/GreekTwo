import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { cookies } from "next/headers"

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    const errorMessage =
      "SERVER FATAL ERROR: NEXT_PUBLIC_SUPABASE_URL is not set. This is required for Supabase server client."
    console.error(errorMessage)
    throw new Error(errorMessage)
  }
  if (!supabaseAnonKey) {
    const errorMessage =
      "SERVER FATAL ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. This is required for Supabase server client."
    console.error(errorMessage)
    throw new Error(errorMessage)
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete({ name, ...options })
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
