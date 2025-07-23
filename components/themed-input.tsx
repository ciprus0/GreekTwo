"use client"

import type React from "react"

import { useTheme } from "@/lib/theme-context"
import { Input } from "@/components/ui/input"
import { forwardRef } from "react"

interface ThemedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const ThemedInput = forwardRef<HTMLInputElement, ThemedInputProps>(({ className = "", ...props }, ref) => {
  const { theme } = useTheme()

  const getInputClasses = () => {
    switch (theme) {
      case "original":
        return "original-input"
      case "light":
        return "light-glass-input"
      case "dark":
      default:
        return "glass-input"
    }
  }

  return <Input ref={ref} className={`${getInputClasses()} ${className}`} {...props} />
})

ThemedInput.displayName = "ThemedInput"
