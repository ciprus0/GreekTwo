"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { api } from "@/lib/supabase-api"

type Theme = "original" | "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [isLoaded, setIsLoaded] = useState(false)
  const pathname = usePathname()

  // Check if current page is auth page
  const isAuthPage = pathname === "/" || pathname === "/login" || pathname === "/register"

  useEffect(() => {
    // Pre-load theme immediately to prevent flash
    if (isAuthPage) {
      // Force dark theme for auth pages
      setThemeState("dark")
      setIsLoaded(true)
      document.documentElement.className = "theme-dark"
    } else {
      // Load user's preferred theme for dashboard pages
      const loadUserTheme = async () => {
        try {
          const userData = localStorage.getItem("user")
          if (userData) {
            const user = JSON.parse(userData)

            // Try to get fresh theme preference from database
            if (user.organizationId && user.email) {
              try {
                const members = await api.getMembersByOrganization(user.organizationId)
                const freshUserData = members.find((member) => member.email === user.email)
                if (freshUserData && freshUserData.theme_preference) {
                  const dbTheme = freshUserData.theme_preference as Theme
                  setThemeState(dbTheme)
                  document.documentElement.className = `theme-${dbTheme}`

                  // Update localStorage with fresh theme
                  const updatedUser = { ...user, theme_preference: dbTheme }
                  localStorage.setItem("user", JSON.stringify(updatedUser))
                } else if (user.theme_preference) {
                  setThemeState(user.theme_preference as Theme)
                  document.documentElement.className = `theme-${user.theme_preference}`
                } else {
                  // Default to dark theme
                  setThemeState("original")
                  document.documentElement.className = "theme-original"
                }
              } catch (error) {
                console.error("Error loading theme from database:", error)
                // Fallback to localStorage theme
                if (user.theme_preference) {
                  setThemeState(user.theme_preference as Theme)
                  document.documentElement.className = `theme-${user.theme_preference}`
                } else {
                  setThemeState("original")
                  document.documentElement.className = "theme-original"
                }
              }
            } else if (user.theme_preference) {
              setThemeState(user.theme_preference as Theme)
              document.documentElement.className = `theme-${user.theme_preference}`
            } else {
              // Default to dark theme
              setThemeState("dark")
              document.documentElement.className = "theme-original"
            }
          } else {
            // Default to dark theme
            setThemeState("original")
            document.documentElement.className = "theme-original"
          }
        } catch (error) {
          console.error("Error loading theme:", error)
          setThemeState("original")
          document.documentElement.className = "theme-original"
        } finally {
          setIsLoaded(true)
        }
      }

      loadUserTheme()
    }
  }, [pathname, isAuthPage])

  const setTheme = async (newTheme: Theme): Promise<void> => {
    // Don't allow theme changes on auth pages
    if (isAuthPage) return

    try {
      setThemeState(newTheme)
      document.documentElement.className = `theme-${newTheme}`

      // Save to user preferences
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        user.theme_preference = newTheme
        localStorage.setItem("user", JSON.stringify(user))

        // Update in database
        try {
          await api.updateMember(user.id, { theme_preference: newTheme })
        } catch (error) {
          console.error("Failed to save theme preference to database:", error)
        }
      }
    } catch (error) {
      console.error("Error setting theme:", error)
    }
  }

  // Don't render children until theme is loaded to prevent flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-${theme}`}>{children}</div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export type { Theme }
