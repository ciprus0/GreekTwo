"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { FileUploadDialog } from "./file-upload-dialog"
import { LibraryTable, type LibraryFile } from "./library-table"
import { supabase } from "@/lib/supabase-client"

export function LibraryClientPage() {
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [userData, setUserData] = useState<{ userId: string; organizationId: string } | null>(null)

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserData({
          userId: user.id,
          organizationId: user.organization_id,
        })
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }
  }, [])

  const fetchFiles = async () => {
    if (!userData?.organizationId) {
      console.log("No organization ID available, skipping fetch")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      console.log("Fetching files for organization:", userData.organizationId)

      // Query from the new table
      const { data, error } = await supabase
        .from("library_files_new")
        .select("*")
        .eq("organization_id", userData.organizationId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching files:", error)
        return
      }

      console.log("Fetched files:", data)
      setFiles(data as LibraryFile[])
    } catch (error) {
      console.error("Error fetching files:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch files when userData is available
  useEffect(() => {
    if (userData?.organizationId) {
      fetchFiles()
    }
  }, [userData])

  const handleUploadSuccess = () => {
    console.log("Upload successful, refreshing files...")
    fetchFiles()
    setIsDialogOpen(false)
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading user data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Library</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No files uploaded yet.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Your First File
          </Button>
        </div>
      ) : (
        <LibraryTable files={files} />
      )}

      <FileUploadDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onUploadSuccess={handleUploadSuccess} />
    </div>
  )
}

export default LibraryClientPage
