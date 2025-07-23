import { cacheManager, getCacheKey } from "./cache-manager"

// Enhanced compression with multiple quality levels
export async function compressImage(
  file: File,
  options = {
    quality: 0.8,
    maxWidth: 1200,
    maxHeight: 1200,
    format: "jpeg" as "jpeg" | "webp",
  },
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        const { maxWidth, maxHeight } = options

        const aspectRatio = width / height

        if (width > maxWidth || height > maxHeight) {
          if (aspectRatio > 1) {
            // Landscape
            width = Math.min(width, maxWidth)
            height = width / aspectRatio
          } else {
            // Portrait
            height = Math.min(height, maxHeight)
            width = height * aspectRatio
          }
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Enable image smoothing for better quality
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          // Draw image
          ctx.drawImage(img, 0, 0, width, height)
        }

        // Convert to blob with specified format and quality
        const mimeType = options.format === "webp" ? "image/webp" : "image/jpeg"

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas compression failed"))
              return
            }

            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now(),
            })

            const originalSize = formatBytes(file.size)
            const compressedSize = formatBytes(compressedFile.size)
            const compressionRatio = Math.round((1 - compressedFile.size / file.size) * 100)

            console.log(
              `🗜️ Compressed ${file.name}: ${originalSize} → ${compressedSize} (${compressionRatio}% reduction)`,
            )
            resolve(compressedFile)
          },
          mimeType,
          options.quality,
        )
      } catch (error) {
        console.error("Canvas compression error:", error)
        resolve(file) // Return original file if compression fails
      }
    }

    img.onerror = () => {
      console.error("Image load error, returning original file")
      resolve(file) // Return original file if image load fails
    }

    // Set crossOrigin to handle CORS issues
    img.crossOrigin = "anonymous"
    img.src = URL.createObjectURL(file)
  })
}

// Enhanced upload function with caching
export async function uploadToStorage(
  file: File,
  bucketName: string,
  filePath: string,
  userId: string,
  options: {
    cacheControl?: string
    upsert?: boolean
  } = {},
): Promise<string> {
  try {
    const { cacheControl = "public, max-age=31536000", upsert = true } = options

    // Use our API route to upload with service role permissions
    const formData = new FormData()
    formData.append("file", file)
    formData.append("bucketName", bucketName)
    formData.append("filePath", filePath)
    formData.append("userId", userId)
    formData.append("cacheControl", cacheControl)
    formData.append("upsert", upsert.toString())

    const response = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Storage upload failed")
    }

    const { publicUrl } = await response.json()

    // Cache the URL for future use
    const cacheKey = getCacheKey("storage_url", bucketName, filePath)
    cacheManager.set(cacheKey, publicUrl, 60 * 60 * 1000) // Cache for 1 hour

    return publicUrl
  } catch (error) {
    console.error("File upload failed:", error)
    throw error
  }
}

// Get optimized image URL with caching
export function getOptimizedImageUrl(
  originalUrl: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: "auto" | "webp" | "jpeg"
  } = {},
): string {
  const { width, height, quality = 80, format = "auto" } = options

  // For now, return original URL, but this could be enhanced with image transformation service
  // In production, you might use Supabase's image transformations or a CDN like Cloudinary

  const cacheKey = getCacheKey("optimized_url", originalUrl, JSON.stringify(options))
  const cached = cacheManager.get<string>(cacheKey)

  if (cached) {
    return cached
  }

  // For now, just return the original URL
  // In production, you'd add query parameters for image transformation
  const optimizedUrl = originalUrl

  // Cache the result
  cacheManager.set(cacheKey, optimizedUrl, 30 * 60 * 1000) // Cache for 30 minutes

  return optimizedUrl
}

// Helper function to format bytes
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Preload images for better UX
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

// Batch preload multiple images
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map((url) => preloadImage(url).catch(() => {})) // Ignore individual failures
  await Promise.all(promises)
}
