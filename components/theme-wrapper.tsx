"use client"

import type React from "react"
import { useTheme } from "@/lib/theme-context"

interface ThemeWrapperProps {
  children: React.ReactNode
  className?: string
}

export function ThemeWrapper({ children, className = "" }: ThemeWrapperProps) {
  const { theme } = useTheme()

  const getThemeClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white text-gray-900"
      case "light":
        return "bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900"
      case "dark":
      default:
        return "bg-slate-800 text-white"
    }
  }

  return (
    <div className={`${getThemeClasses()} ${className}`}>
      {/* Remove the radial gradient overlay completely for dark theme */}
      {children}
    </div>
  )
}

// Helper functions for consistent text colors across components
export function useTextColors() {
  const { theme } = useTheme()

  const getTextColor = () => {
    switch (theme) {
      case "original":
        return "text-gray-900"
      case "light":
        return "text-gray-900"
      case "dark":
      default:
        return "text-white"
    }
  }

  const getSecondaryTextColor = () => {
    switch (theme) {
      case "original":
        return "text-gray-600"
      case "light":
        return "text-gray-600"
      case "dark":
      default:
        return "text-slate-300"
    }
  }

  const getMutedTextColor = () => {
    switch (theme) {
      case "original":
        return "text-gray-500"
      case "light":
        return "text-gray-500"
      case "dark":
      default:
        return "text-slate-400"
    }
  }

  const getAccentTextColor = () => {
    switch (theme) {
      case "original":
        return "text-amber-600"
      case "light":
        return "text-sky-600"
      case "dark":
      default:
        return "text-red-400"
    }
  }

  return {
    getTextColor,
    getSecondaryTextColor,
    getMutedTextColor,
    getAccentTextColor,
  }
}
