"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileUploadDialog } from "../file-upload-dialog"
import { BookOpen, Search, X, ChevronLeft, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"

interface ClassData {
  class_name: string
  file_count: number
  latest_file_date: string
}

export default function ClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredClasses, setFilteredClasses] = useState<ClassData[]>([])
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [userData, setUserData] = useState<{ id: string; organizationId: string } | null>(null)
  const { getTextColor, getSecondaryTextColor, getMutedTextColor } = useTextColors()
  const { theme } = useTheme()

  // Get theme-aware card classes
  const getCardClasses = () => {
    switch (theme) {
      case "original":
        return "original-card"
      case "light":
        return "light-glass-card"
      case "dark":
      default:
        return "glass-card border-white/20"
    }
  }

  // Get theme-aware button classes
  const getButtonClasses = (variant: "default" | "outline" | "ghost" | "link") => {
    switch (theme) {
      case "original":
        return variant === "default" ? "original-button" : "original-button-outline"
      case "light":
        return variant === "default" ? "light-glass-button" : "light-glass-button-outline"
      case "dark":
      default:
        return variant === "default" ? "glass-button" : "glass-button-outline"
    }
  }

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

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!userData?.organizationId) return

      setLoading(true)
      setError(null)

      try {
        // Query the library_files_new table to get unique class names with file counts
        const { data, error: dbError } = await supabase
          .from("library_files_new")
          .select("class_name, created_at")
          .eq("organization_id", userData.organizationId)
          .not("class_name", "is", null)
          .order("created_at", { ascending: false })

        if (dbError) {
          console.error("Database error:", dbError)
          setError(`Failed to fetch classes: ${dbError.message}`)
          return
        }

        // Group by class name and count files
        const classMap = new Map<string, { count: number; latestDate: string }>()

        data?.forEach((file) => {
          if (file.class_name) {
            const existing = classMap.get(file.class_name)
            if (existing) {
              existing.count++
              if (new Date(file.created_at) > new Date(existing.latestDate)) {
                existing.latestDate = file.created_at
              }
            } else {
              classMap.set(file.class_name, {
                count: 1,
                latestDate: file.created_at,
              })
            }
          }
        })

        const classesData: ClassData[] = Array.from(classMap.entries()).map(([className, data]) => ({
          class_name: className,
          file_count: data.count,
          latest_file_date: data.latestDate,
        }))

        // Sort by latest file date
        classesData.sort((a, b) => new Date(b.latest_file_date).getTime() - new Date(a.latest_file_date).getTime())

        console.log("Fetched classes:", classesData)
        setClasses(classesData)
        setFilteredClasses(classesData)
      } catch (err: any) {
        console.error("Error fetching classes:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchClasses()
    }
  }, [userData])

  // Filter classes based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClasses(classes)
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase()
      const filtered = classes.filter((classItem) => classItem.class_name.toLowerCase().includes(lowerSearchTerm))
      setFilteredClasses(filtered)
    }
  }, [classes, searchTerm])

  const handleUploadSuccess = () => {
    // Refresh the classes list
    if (userData) {
      const fetchClasses = async () => {
        setLoading(true)
        const { data, error: dbError } = await supabase
          .from("library_files_new")
          .select("class_name, created_at")
          .eq("organization_id", userData.organizationId)
          .not("class_name", "is", null)
          .order("created_at", { ascending: false })

        if (dbError) {
          console.error("Database error:", dbError)
          setError(`Failed to fetch classes: ${dbError.message}`)
          return
        }

        const classMap = new Map<string, { count: number; latestDate: string }>()

        data?.forEach((file) => {
          if (file.class_name) {
            const existing = classMap.get(file.class_name)
            if (existing) {
              existing.count++
              if (new Date(file.created_at) > new Date(existing.latestDate)) {
                existing.latestDate = file.created_at
              }
            } else {
              classMap.set(file.class_name, {
                count: 1,
                latestDate: file.created_at,
              })
            }
          }
        })

        const classesData: ClassData[] = Array.from(classMap.entries()).map(([className, data]) => ({
          class_name: className,
          file_count: data.count,
          latest_file_date: data.latestDate,
        }))

        classesData.sort((a, b) => new Date(b.latest_file_date).getTime() - new Date(a.latest_file_date).getTime())

        setClasses(classesData)
        setFilteredClasses(classesData)
        setLoading(false)
      }
      fetchClasses()
    }
    setIsUploadDialogOpen(false)
  }

  return (
    <ThemeWrapper className="min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => router.push("/dashboard/library")} className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${getTextColor()}`}>Classes</h1>
              <p className={`${getMutedTextColor()} mt-1`}>Browse class materials and resources</p>
            </div>
          </div>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Class Material
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 ${getMutedTextColor()}`} />
            <Input
              type="search"
              placeholder="Search classes..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className={getMutedTextColor()}>Loading classes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className={`mx-auto h-12 w-12 ${getMutedTextColor()} mb-4`} />
            <h3 className={`text-lg font-medium mb-2 ${getTextColor()}`}>No classes found</h3>
            <p className={`${getMutedTextColor()} mb-4`}>
              {searchTerm ? "Try a different search term or" : "Start by"} uploading class materials.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>Upload Class Materials</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((classItem) => (
              <Card
                key={classItem.class_name}
                className={`cursor-pointer hover:shadow-md transition-shadow ${getCardClasses()}`}
                onClick={() => router.push(`/dashboard/library/classes/${encodeURIComponent(classItem.class_name)}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <BookOpen className="h-8 w-8 text-primary" />
                    <span className={`text-sm ${getMutedTextColor()}`}>
                      {classItem.file_count} file{classItem.file_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <CardTitle className={`text-xl ${getTextColor()}`}>{classItem.class_name}</CardTitle>
                  <CardDescription className={getSecondaryTextColor()}>
                    Last updated: {new Date(classItem.latest_file_date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    className={`w-full ${getButtonClasses("outline")}`}
                    size="sm"
                  >
                    Browse Files
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <FileUploadDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          onUploadSuccess={handleUploadSuccess}
          defaultItemType="class"
        />
      </div>
    </ThemeWrapper>
  )
}
