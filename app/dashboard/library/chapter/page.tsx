"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  FileSpreadsheet,
  FileCheck,
  FileCode,
  FileQuestion,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ImageIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { ThemedCard } from "@/components/themed-card"
import { ThemedButton } from "@/components/themed-button"

interface CategoryData {
  id: string
  name: string
  description: string
  icon: any
  color: string
  file_count: number
}

const categoryConfig = [
  {
    id: "documents",
    name: "Documents",
    description: "General chapter documents and files",
    icon: FileText,
    color: "text-blue-500",
    dbValue: "Documents",
  },
  {
    id: "meeting-minutes",
    name: "Meeting Minutes",
    description: "Records of chapter meetings and discussions",
    icon: FileSpreadsheet,
    color: "text-green-500",
    dbValue: "Meeting Minutes",
  },
  {
    id: "reports",
    name: "Reports",
    description: "Chapter reports and analytics",
    icon: FileCheck,
    color: "text-purple-500",
    dbValue: "Reports",
  },
  {
    id: "templates",
    name: "Templates",
    description: "Reusable templates for chapter activities",
    icon: FileCode,
    color: "text-orange-500",
    dbValue: "Templates",
  },
  {
    id: "guides",
    name: "Guides",
    description: "How-to guides and instructions",
    icon: FileQuestion,
    color: "text-red-500",
    dbValue: "Guides",
  },
  {
    id: "composites",
    name: "Composites",
    description: "Chapter composite photos and individual pictures",
    icon: ImageIcon,
    color: "text-indigo-500",
    dbValue: "Composites",
  },
]

export default function ChapterFilesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<{ id: string; organizationId: string } | null>(null)
  const { getTextColor, getSecondaryTextColor, getMutedTextColor } = useTextColors()

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserData({
          id: user.id,
          organizationId: user.organizationId || user.organization_id,
        })
      } catch (error) {
        console.error("Error parsing user data:", error)
        setError("Failed to load user data")
      }
    } else {
      setError("User not found. Please log in.")
    }
  }, [])

  // Fetch file counts for each category
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      if (!userData?.organizationId) return

      setLoading(true)
      setError(null)

      try {
        console.log("Fetching chapter files for organization:", userData.organizationId)

        // Query the library_files_new table for chapter items
        const { data, error: dbError } = await supabase
          .from("library_files_new")
          .select("document_type")
          .eq("organization_id", userData.organizationId)
          .eq("item_type", "chapter")
          .not("document_type", "is", null)

        if (dbError) {
          console.error("Database error:", dbError)
          setError(`Failed to fetch chapter files: ${dbError.message}`)
          return
        }

        console.log("Raw chapter files data:", data)

        // Count files by document_type
        const countMap = new Map<string, number>()
        data?.forEach((file) => {
          const docType = file.document_type
          countMap.set(docType, (countMap.get(docType) || 0) + 1)
        })

        console.log("File counts by document type:", Object.fromEntries(countMap))

        // Add file counts to category config
        const categoriesWithCounts = categoryConfig.map((category) => ({
          ...category,
          file_count: countMap.get(category.dbValue) || 0,
        }))

        setCategories(categoriesWithCounts)
      } catch (err: any) {
        console.error("Error fetching chapter files:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchCategoryCounts()
    }
  }, [userData])

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/dashboard/library/chapter/${categoryId}`)
  }

  const handleBrowseFilesClick = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation()
    router.push(`/dashboard/library/chapter/${categoryId}`)
  }

  if (loading) {
    return (
      <ThemeWrapper className="min-h-screen">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center mb-6">
            <ThemedButton variant="ghost" onClick={() => router.push("/dashboard/library")} className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </ThemedButton>
            <h1 className={`text-3xl font-bold tracking-tight ${getTextColor()}`}>Chapter Files</h1>
          </div>
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className={getMutedTextColor()}>Loading chapter files...</p>
          </div>
        </div>
      </ThemeWrapper>
    )
  }

  if (error) {
    return (
      <ThemeWrapper className="min-h-screen">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center mb-6">
            <ThemedButton variant="ghost" onClick={() => router.push("/dashboard/library")} className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </ThemedButton>
            <h1 className={`text-3xl font-bold tracking-tight ${getTextColor()}`}>Chapter Files</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <ThemedButton onClick={() => window.location.reload()}>Retry</ThemedButton>
          </div>
        </div>
      </ThemeWrapper>
    )
  }

  return (
    <ThemeWrapper className="min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center mb-6">
          <ThemedButton variant="ghost" onClick={() => router.push("/dashboard/library")} className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </ThemedButton>
          <h1 className={`text-3xl font-bold tracking-tight ${getTextColor()}`}>Chapter Files</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <ThemedCard
              key={category.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleCategoryClick(category.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className={`text-xl flex items-center ${getTextColor()}`}>
                  <category.icon className={`mr-2 h-5 w-5 ${category.color}`} />
                  {category.name}
                </CardTitle>
                <CardDescription className={getSecondaryTextColor()}>
                  {category.description}
                  <br />
                  <span className="text-sm font-medium">
                    {category.file_count} file{category.file_count !== 1 ? "s" : ""}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <ThemedButton
                  variant="ghost"
                  className="ml-auto group"
                  onClick={(e) => handleBrowseFilesClick(e, category.id)}
                >
                  Browse Files{" "}
                  <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </ThemedButton>
              </CardFooter>
            </ThemedCard>
          ))}
        </div>
      </div>
    </ThemeWrapper>
  )
}
