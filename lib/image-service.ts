import { cacheManager, getCacheKey } from "./cache-manager"

interface ImageCacheOptions {
  width?: number
  height?: number
  quality?: number
  format?: "auto" | "webp" | "jpeg" | "png"
}

interface CachedImage {
  url: string
  optimizedUrl: string
  metadata: {
    width?: number
    height?: number
    size?: number
    format?: string
  }
  cachedAt: number
}

class ImageService {
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private readonly CDN_CACHE_HEADERS = "public, max-age=31536000, immutable" // 1 year

  // Get optimized image URL with aggressive caching
  getOptimizedImageUrl(originalUrl: string, options: ImageCacheOptions = {}): string {
    if (!originalUrl) return ""

    const { width, height, quality = 85, format = "auto" } = options
    const cacheKey = getCacheKey("optimized_image", originalUrl, JSON.stringify(options))

    // Check cache first
    const cached = cacheManager.get<CachedImage>(cacheKey)
    if (cached) {
      return cached.optimizedUrl
    }

    // For now, return original URL with cache headers
    // In production, you'd integrate with a CDN or image service
    let optimizedUrl = originalUrl

    // Add query parameters for Supabase image transformations if available
    if (width || height) {
      const params = new URLSearchParams()
      if (width) params.set("width", width.toString())
      if (height) params.set("height", height.toString())
      if (quality !== 85) params.set("quality", quality.toString())

      optimizedUrl = `${originalUrl}?${params.toString()}`
    }

    // Cache the result
    const cachedImage: CachedImage = {
      url: originalUrl,
      optimizedUrl,
      metadata: { width, height, format },
      cachedAt: Date.now(),
    }

    cacheManager.set(cacheKey, cachedImage, this.CACHE_DURATION)
    return optimizedUrl
  }

  // Preload multiple images for better UX
  async preloadImages(urls: string[], options: ImageCacheOptions = {}): Promise<void> {
    const preloadPromises = urls.map(async (url) => {
      try {
        const optimizedUrl = this.getOptimizedImageUrl(url, options)

        // Create image element to trigger browser cache
        const img = new Image()
        img.crossOrigin = "anonymous"

        return new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // Don't fail on individual image errors
          img.src = optimizedUrl
        })
      } catch (error) {
        console.warn("Failed to preload image:", url, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  }

  // Get cached image metadata
  getImageMetadata(url: string): CachedImage | null {
    const cacheKey = getCacheKey("optimized_image", url, "{}")
    return cacheManager.get<CachedImage>(cacheKey)
  }

  // Clear image cache for a specific URL
  clearImageCache(url: string): void {
    cacheManager.deletePattern(`optimized_image:${url}:*`)
  }

  // Get cache statistics for images
  getImageCacheStats(): { totalImages: number; cacheSize: string } {
    const stats = cacheManager.getStats()
    // This is a simplified version - in production you'd track image-specific stats
    return {
      totalImages: Math.floor(stats.size * 0.3), // Estimate
      cacheSize: `${cacheManager.getSizeInMB()} MB`,
    }
  }
}

export const imageService = new ImageService()

// Helper functions for common use cases
export function getProfilePictureUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg?height=40&width=40"

  return imageService.getOptimizedImageUrl(url, {
    width: 200,
    height: 200,
    quality: 90,
    format: "webp",
  })
}

export function getLibraryThumbnailUrl(url: string): string {
  return imageService.getOptimizedImageUrl(url, {
    width: 150,
    height: 150,
    quality: 80,
    format: "webp",
  })
}

export function getEventImageUrl(url: string, size: "thumbnail" | "medium" | "large" = "medium"): string {
  const sizes = {
    thumbnail: { width: 200, height: 150 },
    medium: { width: 600, height: 400 },
    large: { width: 1200, height: 800 },
  }

  return imageService.getOptimizedImageUrl(url, {
    ...sizes[size],
    quality: 85,
    format: "webp",
  })
}
