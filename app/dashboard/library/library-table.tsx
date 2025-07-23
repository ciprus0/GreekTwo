"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download, MoreVertical, Trash2, ImageIcon, AlertTriangle, ExternalLink } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { getOptimizedImageUrl, preloadImage } from "@/lib/file-storage"
import { api } from "@/lib/supabase-api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export interface LibraryFile {
  id: string
  file_name: string
  display_name: string
  description: string | null
  file_url: string
  file_type: string
  file_size: number
  category: string
  created_at: string
  storage_path: string
  organization_id: string
}

interface LibraryTableProps {
  files: LibraryFile[]
  onFileDeleted?: () => void
  userRole?: string
  userId?: string
}

export function LibraryTable({ files, onFileDeleted, userRole, userId }: LibraryTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof LibraryFile>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())

  const sortedFiles = [...files].sort((a, b) => {
    if (sortColumn === "created_at") {
      return sortDirection === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }

    if (sortColumn === "file_size") {
      return sortDirection === "asc" ? a.file_size - b.file_size : b.file_size - a.file_size
    }

    const aValue = a[sortColumn]?.toString() || ""
    const bValue = b[sortColumn]?.toString() || ""

    return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
  })

  const handleSort = (column: keyof LibraryFile) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleDeleteFile = async (file: LibraryFile) => {
    if (userRole !== "admin" && userRole !== "superadmin") {
      toast({
        title: "Permission Denied",
        description: "Only administrators can delete files.",
        variant: "destructive",
      })
      return
    }

    // Add to deleting set to show loading state
    setDeletingFiles((prev) => new Set([...prev, file.id]))

    try {
      console.log("🗑️ Deleting file:", file.display_name)
      console.log("📁 Storage path:", file.storage_path)

      // Step 1: Delete from storage using the same framework as profile pictures
      const storageDeleted = await api.deleteLibraryFileByPath(file.storage_path)

      if (!storageDeleted) {
        throw new Error("Failed to delete file from storage")
      }

      // Step 2: Delete from database using the same framework as profile pictures
      const databaseDeleted = await api.deleteLibraryFileFromDatabase(file.id, file.organization_id)

      if (!databaseDeleted) {
        throw new Error("Failed to delete file from database")
      }

      toast({
        title: "Success",
        description: `File "${file.display_name}" deleted successfully`,
      })

      if (onFileDeleted) {
        onFileDeleted()
      }
    } catch (error: any) {
      console.error("❌ Error deleting file:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      })
    } finally {
      setDeletingFiles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(file.id)
        return newSet
      })
    }
  }

  // Preload images for better UX
  const handleImagePreload = async (file: LibraryFile) => {
    if (file.file_type.startsWith("image/") && !preloadedImages.has(file.id)) {
      try {
        const optimizedUrl = getOptimizedImageUrl(file.file_url, {
          width: 200,
          height: 200,
          quality: 80,
        })
        await preloadImage(optimizedUrl)
        setPreloadedImages((prev) => new Set([...prev, file.id]))
      } catch (error) {
        console.warn("Failed to preload image:", error)
      }
    }
  }

  const isAdmin = userRole === "admin" || userRole === "superadmin"

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("display_name")}>
              Name {sortColumn === "display_name" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
              Category {sortColumn === "category" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("file_type")}>
              Type {sortColumn === "file_type" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("file_size")}>
              Size {sortColumn === "file_size" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
              Date Added {sortColumn === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFiles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No files found. Upload your first file!
              </TableCell>
            </TableRow>
          ) : (
            sortedFiles.map((file) => (
              <TableRow key={file.id} onMouseEnter={() => handleImagePreload(file)}>
                <TableCell>
                  {file.file_type.startsWith("image/") ? (
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <div className="h-4 w-4 bg-gray-300 rounded" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{file.display_name}</TableCell>
                <TableCell>{file.category}</TableCell>
                <TableCell>{file.file_type.split("/")[1]?.toUpperCase() || "FILE"}</TableCell>
                <TableCell>{formatFileSize(file.file_size)}</TableCell>
                <TableCell>{formatDate(file.created_at)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
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
                          download
                        >
                          <Download className="mr-2 h-4 w-4" /> Download
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={`/debug/url-test?url=${encodeURIComponent(file.file_url)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" /> Analyze URL
                        </a>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-500"
                              onSelect={(e) => e.preventDefault()}
                              disabled={deletingFiles.has(file.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {deletingFiles.has(file.id) ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Delete File
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{file.display_name}"?
                                <br />
                                <br />
                                <strong>This action will:</strong>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Permanently delete the file from storage</li>
                                  <li>Remove the file record from the database</li>
                                  <li>Make the file inaccessible to all users</li>
                                </ul>
                                <br />
                                <strong className="text-red-600">This action cannot be undone.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFile(file)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deletingFiles.has(file.id)}
                              >
                                {deletingFiles.has(file.id) ? "Deleting..." : "Delete File"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
