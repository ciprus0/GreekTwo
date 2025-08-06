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

  const getCardClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border border-gray-200 shadow-sm"
      case "light":
        return "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm"
      case "dark":
      default:
        return "bg-slate-700 border border-slate-600 shadow-lg"
    }
  }

  const getButtonClasses = () => {
    switch (theme) {
      case "original":
        return "bg-amber-600 hover:bg-amber-700 text-white"
      case "light":
        return "bg-sky-600 hover:bg-sky-700 text-white"
      case "dark":
      default:
        return "bg-red-600 hover:bg-red-700 text-white"
    }
  }

  const getInputClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border border-gray-300 text-gray-900 placeholder-gray-500"
      case "light":
        return "bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-900 placeholder-gray-500"
      case "dark":
      default:
        return "bg-slate-600 border border-slate-500 text-white placeholder-slate-400"
    }
  }

  const getDialogClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border border-gray-200"
      case "light":
        return "bg-white/95 backdrop-blur-md border border-gray-200"
      case "dark":
      default:
        return "bg-slate-700 border border-slate-600"
    }
  }

  return {
    getTextColor,
    getSecondaryTextColor,
    getMutedTextColor,
    getAccentTextColor,
    getCardClasses,
    getButtonClasses,
    getInputClasses,
    getDialogClasses,
  }
}
