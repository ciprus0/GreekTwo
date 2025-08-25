"use client"

import { useEffect, useRef, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { uploadFileAction, type UploadFileState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LibraryFile } from "@/types/library"
import { toast } from "@/components/ui/use-toast"
import { FileText, ImageIcon, Download, ExternalLink, UploadCloud } from "lucide-react"

const initialState: UploadFileState = {
  success: false,
  message: "",
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <UploadCloud className="mr-2 h-4 w-4 animate-pulse" /> Uploading...
        </>
      ) : (
        <>
          <UploadCloud className="mr-2 h-4 w-4" /> Upload File
        </>
      )}
    </Button>
  )
}

interface LibraryClientPageProps {
  initialFiles: LibraryFile[]
  organizationId: string | null // Needed for categories, or pass categories directly
  categories: string[] // Pass distinct categories from server
}

export default function LibraryClientPage({
  initialFiles,
  organizationId,
  categories: initialCategories,
}: LibraryClientPageProps) {
  const [state, formAction] = useFormState(uploadFileAction, initialState)
  const [files, setFiles] = useState<LibraryFile[]>(initialFiles)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? "Success!" : "Error",
        description: state.message,
        variant: state.success ? "default" : "destructive",
      })
      if (state.success) {
        formRef.current?.reset()
        // Optimistically update files list or wait for revalidation
        // For simplicity, we rely on revalidatePath from server action
      }
    }
  }, [state])

  // Update files when initialFiles prop changes (due to revalidation)
  useEffect(() => {
    setFiles(initialFiles)
  }, [initialFiles])

  const filteredFiles = files.filter((file) => selectedCategory === "all" || file.category === selectedCategory)

  const distinctCategories = ["all", ...new Set(initialFiles.map((f) => f.category).filter(Boolean) as string[])]

  if (!organizationId) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be part of an organization to access the library. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-8 overflow-hidden">
      <Card>
        <CardHeader>
          <CardTitle>Upload New File to Library</CardTitle>
          <CardDescription>Share documents, images, and other resources with your organization.</CardDescription>
        </CardHeader>
        <form action={formAction} ref={formRef}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" name="displayName" placeholder="e.g., Chapter Bylaws Q3 2024" required />
              {state.errors?.displayName && (
                <p className="text-sm text-red-500 mt-1">{state.errors.displayName.join(", ")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {/* These should ideally come from a predefined list or existing categories */}
                  <SelectItem value="Documents">Documents</SelectItem>
                  <SelectItem value="Images">Images</SelectItem>
                  <SelectItem value="Templates">Templates</SelectItem>
                  <SelectItem value="Guides">Guides</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {state.errors?.category && (
                <p className="text-sm text-red-500 mt-1">{state.errors.category.join(", ")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" name="description" placeholder="Briefly describe the file content..." />
              {state.errors?.description && (
                <p className="text-sm text-red-500 mt-1">{state.errors.description.join(", ")}</p>
              )}
            </div>

            <div>
              <Label htmlFor="file">File (PDF, JPG, PNG - Max 50MB)</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
              {state.errors?.file && <p className="text-sm text-red-500 mt-1">{state.errors.file.join(", ")}</p>}
            </div>
            {state.errors?.general && <p className="text-sm text-red-500 mt-1">{state.errors.general.join(", ")}</p>}
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Library Files</CardTitle>
          <div className="mt-2">
            <Label htmlFor="filter-category">Filter by Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="filter-category" className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {distinctCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <p className="text-muted-foreground">
              No files found{selectedCategory !== "all" ? ` in category "${selectedCategory}"` : ""}. Upload a file to
              get started!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {file.file_type?.startsWith("image/") ? (
                        <ImageIcon className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                      <CardTitle className="text-lg truncate" title={file.display_name}>
                        {file.display_name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                      {file.category} - Uploaded on {new Date(file.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3" title={file.description || ""}>
                      {file.description || "No description provided."}
                    </p>
                    {file.file_size && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Size: {(file.file_size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.file_url} download={file.file_name} title="Download">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    {/* Add Delete functionality later if needed */}
                    {/* <Button variant="destructive" size="sm" title="Delete (Not Implemented)">
                      <Trash2 className="h-4 w-4" />
                    </Button> */}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
