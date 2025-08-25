"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { FileUploadDialog } from "./file-upload-dialog"
import { Button } from "@/components/ui/button"
import { FileText, BookOpen, ChevronRight, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"
import { ThemedCard } from "@/components/themed-card"

// Define the structure of a library file record
interface LibraryFile {
  id: string
  user_id: string
  organization_id: string
  file_name: string
  storage_path: string
  file_url: string
  file_type: string
  file_size: number
  display_name: string
  description: string | null
  category: string
  created_at: string
}

export default function LibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [userData, setUserData] = useState<{ id: string; organizationId: string } | null>(null)
  const router = useRouter()

  const { theme } = useTheme()
  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()

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

  const fetchFiles = async () => {
    if (!userData?.organizationId) return

    setLoading(true)
    setError(null)

    try {
      console.log("Fetching files for organization:", userData.organizationId)

      // Query the library_files_new table for files matching the organization_id
      const { data, error: dbError } = await supabase
        .from("library_files_new")
        .select("*")
        .eq("organization_id", userData.organizationId)
        .order("created_at", { ascending: false })

      if (dbError) {
        console.error("Database error:", dbError)
        setError(`Failed to fetch files: ${dbError.message}`)
        return
      }

      console.log("Fetched files:", data)
      setFiles(data || [])
    } catch (err: any) {
      console.error("Error fetching files:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userData) {
      fetchFiles()
    }
  }, [userData])

  const handleUploadSuccess = () => {
    fetchFiles()
    setIsUploadDialogOpen(false)
  }

  // Get theme-aware button classes
  const getButtonClasses = () => {
    switch (theme) {
      case "original":
        return "bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
      case "light":
        return "bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm"
      case "dark":
      default:
        return "bg-rose-600 hover:bg-rose-700 text-white border-0"
    }
  }

  // Get theme-aware icon color
  const getIconColor = () => {
    switch (theme) {
      case "original":
        return "text-red-500"
      case "light":
        return "text-blue-500"
      case "dark":
      default:
        return "text-rose-400"
    }
  }

  // Get theme-aware description color
  const getDescriptionColor = () => {
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

  // Get theme-aware hover button classes
  const getHoverButtonClasses = () => {
    switch (theme) {
      case "original":
        return "text-gray-700 hover:bg-gray-100"
      case "light":
        return "text-gray-700 hover:bg-blue-50"
      case "dark":
      default:
        return "text-white hover:bg-slate-700/50"
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <h1 className={`text-3xl font-bold tracking-tight ${getTextColor()}`}>Library</h1>
          <Button className={getButtonClasses()} onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ThemedCard className="hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="p-6" onClick={() => router.push("/dashboard/library/classes")}>
              <div className="pb-2">
                <h2 className={`text-2xl flex items-center ${getTextColor()} font-semibold`}>
                  <BookOpen className={`mr-2 h-6 w-6 ${getIconColor()}`} />
                  Classes
                </h2>
                <p className={`${getDescriptionColor()} mt-2`}>Access course materials, syllabi, and class resources</p>
              </div>
              <div className="pb-2">
                <p className={getDescriptionColor()}>
                  Browse files organized by class. Find lecture notes, assignments, and study materials.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="ghost" className={`ml-auto group ${getHoverButtonClasses()}`}>
                  Browse Classes{" "}
                  <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </div>
          </ThemedCard>

          <ThemedCard className="hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="p-6" onClick={() => router.push("/dashboard/library/chapter")}>
              <div className="pb-2">
                <h2 className={`text-2xl flex items-center ${getTextColor()} font-semibold`}>
                  <FileText className={`mr-2 h-6 w-6 ${getIconColor()}`} />
                  Chapter Files
                </h2>
                <p className={`${getDescriptionColor()} mt-2`}>Access chapter documents, minutes, and resources</p>
              </div>
              <div className="pb-2">
                <p className={getDescriptionColor()}>
                  Browse chapter-related files organized by category. Find meeting minutes, reports, templates, and
                  guides.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="ghost" className={`ml-auto group ${getHoverButtonClasses()}`}>
                  Browse Chapter Files{" "}
                  <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </div>
          </ThemedCard>
        </div>

        <FileUploadDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
    </ThemeWrapper>
  )
}
