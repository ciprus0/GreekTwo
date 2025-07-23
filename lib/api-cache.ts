import { NextResponse } from "next/server"

interface CacheOptions {
  maxAge?: number // seconds
  staleWhileRevalidate?: number // seconds
  public?: boolean
  immutable?: boolean
}

export function withApiCache(response: NextResponse, options: CacheOptions = {}): NextResponse {
  const {
    maxAge = 300, // 5 minutes default
    staleWhileRevalidate = 60, // 1 minute default
    public: isPublic = true,
    immutable = false,
  } = options

  let cacheControl = isPublic ? "public" : "private"
  cacheControl += `, max-age=${maxAge}`

  if (staleWhileRevalidate > 0) {
    cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`
  }

  if (immutable) {
    cacheControl += ", immutable"
  }

  response.headers.set("Cache-Control", cacheControl)
  response.headers.set("Vary", "Accept-Encoding")

  return response
}

export function createCachedResponse(data: any, options: CacheOptions = {}): NextResponse {
  const response = NextResponse.json(data)
  return withApiCache(response, options)
}

// Specific cache configurations for different data types
export const CACHE_CONFIGS = {
  // Static data - cache for 1 hour
  static: {
    maxAge: 3600,
    staleWhileRevalidate: 300,
    public: true,
  },

  // User data - cache for 10 minutes
  user: {
    maxAge: 600,
    staleWhileRevalidate: 60,
    public: false,
  },

  // Dynamic content - cache for 2 minutes
  dynamic: {
    maxAge: 120,
    staleWhileRevalidate: 30,
    public: true,
  },

  // Real-time data - cache for 30 seconds
  realtime: {
    maxAge: 30,
    staleWhileRevalidate: 10,
    public: true,
  },

  // Images and assets - cache for 1 year
  assets: {
    maxAge: 31536000,
    public: true,
    immutable: true,
  },
} as const
