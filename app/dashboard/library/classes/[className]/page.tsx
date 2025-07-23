"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FileUploadDialog } from "../../file-upload-dialog"
import { toast } from "@/components/ui/use-toast"
import {
  Loader2,
  Search,
  X,
  FileText,
  Download,
  ExternalLink,
  MoreVertical,
  ImageIcon,
  ChevronLeft,
  Plus,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import NextImage from "next/image"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"

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
  class_name: string | null
  created_at: string
}

export default function ClassDetailPage({ params }: { params: { className: string } }) {
  const router = useRouter()
  const className = decodeURIComponent(params.className)
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredFiles, setFilteredFiles] = useState<LibraryFile[]>([])
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [userData, setUserData] = useState<{ id: string; organizationId: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
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
        const userRole = user.role || "member"
        setIsAdmin(userRole === "admin" || userRole === "superadmin")
      } catch (error) {
        console.error("Error parsing user data:", error)
        setError("Failed to load user data")
      }
    } else {
      setError("User not found. Please log in.")
    }
  }, [])

  // Fetch files for this class
  useEffect(() => {
    const fetchFiles = async () => {
      if (!userData?.organizationId) return

      setLoading(true)
      setError(null)

      try {
        // Query the library_files_new table for files matching the class name
        const { data, error: dbError } = await supabase
          .from("library_files_new")
          .select("*")
          .eq("organization_id", userData.organizationId)
          .eq("class_name", className)
          .order("created_at", { ascending: false })

        if (dbError) {
          console.error("Database error:", dbError)
          setError(`Failed to fetch files: ${dbError.message}`)
          return
        }

        console.log("Fetched files for class:", data)
        setFiles(data || [])
        setFilteredFiles(data || [])
      } catch (err: any) {
        console.error("Error fetching files:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchFiles()
    }
  }, [userData, className])

  // Filter files based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredFiles(files)
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase()
      const filtered = files.filter(
        (file) =>
          file.display_name.toLowerCase().includes(lowerSearchTerm) ||
          (file.description && file.description.toLowerCase().includes(lowerSearchTerm)) ||
          file.file_name.toLowerCase().includes(lowerSearchTerm),
      )
      setFilteredFiles(filtered)
    }
  }, [files, searchTerm])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const isImageFile = (fileType: string) => {
    return fileType.startsWith("image/")
  }

  const isPdfFile = (fileType: string) => {
    return fileType === "application/pdf"
  }

  const handleUploadSuccess = () => {
    // Refresh the files list
    if (userData) {
      const fetchFiles = async () => {
        // Similar to the useEffect above
        // This is a simplified version - you'd want to refactor this to avoid duplication
        setLoading(true)
        // ... fetch files again
        const { data, error: dbError } = await supabase
          .from("library_files_new")
          .select("*")
          .eq("organization_id", userData.organizationId)
          .eq("class_name", className)
          .order("created_at", { ascending: false })

        if (dbError) {
          console.error("Database error:", dbError)
          setError(`Failed to fetch files: ${dbError.message}`)
          return
        }

        console.log("Fetched files for class:", data)
        setFiles(data || [])
        setFilteredFiles(data || [])
        setLoading(false)
      }
      fetchFiles()
    }
    setIsUploadDialogOpen(false)
  }

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can delete files.",
        variant: "destructive",
      })
      return
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage.from("library-uploads").remove([storagePath])

      if (storageError) {
        console.error("Error deleting from storage:", storageError)
        toast({
          title: "Error",
          description: `Failed to delete file from storage: ${storageError.message}`,
          variant: "destructive",
        })
        return
      }

      // Delete from database
      const { error: dbError } = await supabase.from("library_files_new").delete().eq("id", fileId)

      if (dbError) {
        console.error("Error deleting from database:", dbError)
        toast({
          title: "Error",
          description: `Failed to delete file record: ${dbError.message}`,
          variant: "destructive",
        })
        return
      }

      // Update local state
      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId))
      setFilteredFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId))

      toast({
        title: "Success",
        description: "File deleted successfully",
      })
    } catch (error: any) {
      console.error("Error in delete operation:", error)
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  return (
    <ThemeWrapper className="min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard/library/classes")} className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Classes
          </Button>
          <h1 className={`text-3xl font-bold tracking-tight ${getTextColor()}`}>{className}</h1>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 ${getMutedTextColor()}`} />
            <Input
              type="search"
              placeholder="Search files..."
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
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Upload File
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className={getMutedTextColor()}>Loading files...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className={`mx-auto h-12 w-12 ${getMutedTextColor()} mb-4`} />
            <h3 className={`text-lg font-medium mb-2 ${getTextColor()}`}>No files found</h3>
            <p className={`${getMutedTextColor()} mb-4`}>
              {searchTerm ? "Try a different search term or" : "Start by"} uploading files to this class.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Upload File
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="flex flex-col overflow-hidden group">
                <CardHeader className="p-0 relative">
                  <div className="aspect-[16/10] bg-muted flex items-center justify-center overflow-hidden">
                    {isImageFile(file.file_type) ? (
                      <NextImage
                        src={file.file_url}
                        alt={file.display_name}
                        width={300}
                        height={188}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?width=300&height=188"
                          e.currentTarget.srcset = ""
                        }}
                      />
                    ) : isPdfFile(file.file_type) ? (
                      <FileText className="w-16 h-16 text-red-500" />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <CardTitle
                      className={`text-base font-semibold leading-tight line-clamp-2 ${getTextColor()}`}
                      title={file.display_name}
                    >
                      {file.display_name}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 -mt-1">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" /> View Original
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={file.file_url} download={file.file_name} className="flex items-center">
                            <Download className="mr-2 h-4 w-4" /> Download
                          </a>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem
                            className="text-red-500 focus:text-red-500"
                            onClick={() => handleDeleteFile(file.id, file.storage_path)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-x-1 mb-2 flex flex-wrap gap-y-1">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {file.category}
                    </Badge>
                    {isImageFile(file.file_type) && (
                      <Badge variant="outline" className="text-xs">
                        Image
                      </Badge>
                    )}
                    {isPdfFile(file.file_type) && (
                      <Badge variant="outline" className="text-xs">
                        PDF
                      </Badge>
                    )}
                  </div>
                  {file.description && (
                    <p className={`text-sm ${getSecondaryTextColor()} line-clamp-2`}>{file.description}</p>
                  )}
                </CardContent>
                <CardFooter
                  className={`p-3 bg-muted/50 text-xs ${getMutedTextColor()} flex justify-between items-center`}
                >
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>{new Date(file.created_at).toLocaleDateString()}</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <FileUploadDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          onUploadSuccess={handleUploadSuccess}
          defaultFileType="class"
          defaultClassName={className}
        />
      </div>
    </ThemeWrapper>
  )
}
