import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  console.log("MIDDLEWARE: Running for path:", request.nextUrl.pathname)
  // Log incoming cookies
  // const incomingCookies = Array.from(request.cookies.getAll()).map(c => `$\{c.name\}=\{c.value\}`);
  // console.log("MIDDLEWARE: Incoming cookies:", incomingCookies.join('; ') || 'No incoming cookies');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL_MIDDLEWARE_ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.")
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const cookie = request.cookies.get(name)?.value
        // console.log(`MIDDLEWARE: supabase.cookies.get('${name}'):`, cookie ? 'found' : 'not found');
        return cookie
      },
      set(name: string, value: string, options: CookieOptions) {
        console.log(`MIDDLEWARE: supabase.cookies.set('${name}') called.`)
        request.cookies.set({ name, value, ...options })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        console.log(`MIDDLEWARE: supabase.cookies.remove('${name}') called.`)
        request.cookies.delete(name)
        response.cookies.delete(name, options)
      },
    },
  })

  try {
    console.log("MIDDLEWARE: Attempting supabase.auth.getUser()...")
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      console.log("MIDDLEWARE: supabase.auth.getUser() error:", error.message)
    } else if (user) {
      console.log("MIDDLEWARE: supabase.auth.getUser() success, user ID:", user.id)
    } else {
      console.log(
        "MIDDLEWARE: supabase.auth.getUser() success, but no user object returned (session likely missing/invalid).",
      )
    }
  } catch (e: any) {
    console.error("MIDDLEWARE: Exception during supabase.auth.getUser():", e.message)
  }

  // Log outgoing cookies set by middleware
  // const outgoingCookies = Array.from(response.cookies.getAll()).map(c => `$\{c.name\}=\{c.value\}`);
  // console.log("MIDDLEWARE: Outgoing cookies from response:", outgoingCookies.join('; ') || 'No outgoing cookies set by middleware');

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth|login|register).*)"],
}
