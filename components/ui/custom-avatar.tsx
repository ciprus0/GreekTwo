"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { getProfilePictureUrl, imageService } from "@/lib/image-service"

interface CustomAvatarProps {
  src?: string | null
  name?: string | null
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  onClick?: () => void
  preload?: boolean
}

export function CustomAvatar({ src, name, className = "", size = "md", onClick, preload = false }: CustomAvatarProps) {
  const [error, setError] = useState(false)
  const [imageKey, setImageKey] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setError(false)
    setIsLoaded(false)
    setImageKey((prev) => prev + 1) // Force re-render of image
  }, [src])

  // Preload image if requested
  useEffect(() => {
    if (preload && src && !error) {
      const optimizedUrl = getProfilePictureUrl(src)
      imageService.preloadImages([optimizedUrl]).catch(() => {
        // Ignore preload errors
      })
    }
  }, [src, preload, error])

  // Generate initials from name
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  // Size classes
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
    xl: "h-12 w-12 text-lg",
  }

  // Get optimized image URL
  const optimizedSrc = src && !error ? getProfilePictureUrl(src) : null

  return (
    <Avatar className={cn(sizeClasses[size], className)} onClick={onClick}>
      {optimizedSrc && (
        <AvatarImage
          key={imageKey}
          src={optimizedSrc || "/placeholder.svg"}
          alt={name || "User"}
          onError={() => setError(true)}
          onLoad={() => setIsLoaded(true)}
          className={cn("transition-opacity duration-200", isLoaded ? "opacity-100" : "opacity-0")}
        />
      )}
      <AvatarFallback className="bg-rose-100 text-rose-700">{initials}</AvatarFallback>
    </Avatar>
  )
}
