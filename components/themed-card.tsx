"use client"

import type React from "react"

import { useTheme } from "@/lib/theme-context"
import { Card } from "@/components/ui/card"

interface ThemedCardProps {
  children: React.ReactNode
  className?: string
}

export function ThemedCard({ children, className = "" }: ThemedCardProps) {
  const { theme } = useTheme()

  const getCardClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border border-gray-200 shadow-sm rounded-lg"
      case "light":
        return "bg-white/90 backdrop-blur-sm border border-blue-200/60 shadow-sm rounded-lg"
      case "dark":
      default:
        return "glass-card border-white/20"
    }
  }

  return <Card className={`${getCardClasses()} ${className}`}>{children}</Card>
}
