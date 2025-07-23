"use client"

import type React from "react"

import { useTheme } from "@/lib/theme-context"
import { Button } from "@/components/ui/button"
import { forwardRef } from "react"

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  children: React.ReactNode
}

export const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const { theme } = useTheme()

    const getButtonClasses = () => {
      const baseClasses = "font-medium transition-all duration-200"

      switch (theme) {
        case "original":
          switch (variant) {
            case "outline":
              return `${baseClasses} original-button-outline`
            case "destructive":
              return `${baseClasses} bg-amber-50 hover:bg-amber-100 text-white border-0`
            case "ghost":
              return `${baseClasses} bg-transparent hover:bg-gray-100 text-gray-700`
            default:
              return `${baseClasses} original-button`
          }
        case "light":
          switch (variant) {
            case "outline":
              return `${baseClasses} light-glass-button-outline`
            case "destructive":
              return `${baseClasses} light-glass-button-destructive`
            case "ghost":
              return `${baseClasses} bg-transparent hover:bg-sky-50 text-sky-600`
            default:
              return `${baseClasses} light-glass-button`
          }
        case "dark":
        default:
          switch (variant) {
            case "outline":
              return `${baseClasses} glass-button-outline`
            case "destructive":
              return `${baseClasses} glass-button-destructive`
            case "ghost":
              return `${baseClasses} bg-transparent hover:bg-white/10 text-white`
            default:
              return `${baseClasses} glass-button`
          }
      }
    }

    return (
      <Button ref={ref} className={`${getButtonClasses()} ${className}`} {...props}>
        {children}
      </Button>
    )
  },
)

ThemedButton.displayName = "ThemedButton"
