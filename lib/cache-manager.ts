"use client"

// Enhanced cache manager with better performance
interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Start cleanup interval only in browser
    if (typeof window !== "undefined") {
      this.startCleanup()
    }
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)
  }

  private cleanup() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())

    // Remove expired entries
    const expiredKeys = entries.filter(([_, entry]) => now - entry.timestamp > entry.ttl).map(([key]) => key)

    expiredKeys.forEach((key) => this.cache.delete(key))

    // If still over max size, remove least recently used
    if (this.cache.size > this.maxSize) {
      const sortedEntries = Array.from(this.cache.entries()).sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

      const toRemove = sortedEntries.slice(0, this.cache.size - this.maxSize)
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now()

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
    })

    // Immediate cleanup if over size
    if (this.cache.size > this.maxSize) {
      this.cleanup()
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    const now = Date.now()

    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access info
    entry.accessCount++
    entry.lastAccessed = now

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Delete entries matching a pattern
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"))
    const keysToDelete = Array.from(this.cache.keys()).filter((key) => regex.test(key))
    keysToDelete.forEach((key) => this.cache.delete(key))
  }

  getStats() {
    const entries = Array.from(this.cache.values())
    const totalSize = entries.reduce((sum, entry) => {
      return sum + (JSON.stringify(entry.data).length || 0)
    }, 0)

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalSizeBytes: totalSize,
      hitRate: entries.length > 0 ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length : 0,
    }
  }

  getSizeInMB(): string {
    const stats = this.getStats()
    return (stats.totalSizeBytes / (1024 * 1024)).toFixed(2)
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Create singleton instance
export const cacheManager = new CacheManager()

// Utility function to generate cache keys
export function getCacheKey(...parts: (string | number | boolean | null | undefined)[]): string {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .map((part) => String(part))
    .join(":")
}

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    cacheManager.destroy()
  })
}

/* ------------------------------------------------------------------
 * Convenience helpers - keep the external API unchanged
 * -----------------------------------------------------------------*/

/**
 * Get a cached value (or `null` if it doesn’t exist / is expired).
 */
export function getCache<T>(key: string): T | null {
  return cacheManager.get<T>(key)
}

/**
 * Set a cache entry.
 */
export function setCache<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set<T>(key, data, ttl)
}

/**
 * Fetch data and cache it. Returns the cached value if present.
 */
export async function withCache<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
  const cached = cacheManager.get<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  cacheManager.set<T>(key, data, ttl)
  return data
}

/**
 * Delete all cache keys matching a wildcard pattern, e.g. `*:{userId}:*`.
 */
export function invalidateCache(pattern: string): void {
  cacheManager.deletePattern(pattern)
}

/**
 * Invalidate all cache entries related to a specific user.
 */
export function invalidateUserCache(userId: string): void {
  invalidateCache(`*:${userId}:*`)
}

/**
 * Invalidate all cache entries related to a specific organization.
 */
export function invalidateOrganizationCache(organizationId: string): void {
  invalidateCache(`*:${organizationId}:*`)
}
