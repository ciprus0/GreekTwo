"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Upload, X, CheckCircle, Loader2 } from "lucide-react"

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadSuccess: () => void
  defaultItemType?: "class" | "chapter"
  defaultClassName?: string
  defaultDocumentType?: string
}

interface UserData {
  id: string
  organizationId: string
  email?: string
  role?: string
}

export function FileUploadDialog({
  open,
  onOpenChange,
  onUploadSuccess,
  defaultItemType = "class",
  defaultClassName = "",
  defaultDocumentType = "",
}: FileUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [description, setDescription] = useState("")
  const [itemType, setItemType] = useState<"class" | "chapter">(defaultItemType)
  const [className, setClassName] = useState(defaultClassName)
  const [documentType, setDocumentType] = useState(defaultDocumentType)
  const [compositeType, setCompositeType] = useState("")
  const [compositeYear, setCompositeYear] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserData({
          id: user.id,
          organizationId: user.organizationId || user.organization_id,
          email: user.email,
          role: user.role,
        })
        console.log("Loaded user data:", user)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }
  }, [])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setItemType(defaultItemType)
      setClassName(defaultClassName)
      setDocumentType(defaultDocumentType)
      setUploadSuccess(false)
    } else {
      // Reset form when dialog closes
      setFile(null)
      setDisplayName("")
      setDescription("")
      setClassName("")
      setDocumentType("")
      setCompositeType("")
      setCompositeYear("")
      setUploadSuccess(false)
    }
  }, [open, defaultItemType, defaultClassName, defaultDocumentType])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      handleFileSelect(droppedFile)
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    console.log("File selected:", selectedFile)

    // Validate file size (50MB limit)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive",
      })
      return
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF, image, or document file.",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)

    // Auto-generate display name from file name if not set
    if (!displayName) {
      const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "")
      setDisplayName(nameWithoutExtension)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const validateForm = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return false
    }

    if (!displayName.trim()) {
      toast({
        title: "Display name required",
        description: "Please enter a display name for the file.",
        variant: "destructive",
      })
      return false
    }

    if (itemType === "class" && !className.trim()) {
      toast({
        title: "Class name required",
        description: "Please enter a class name.",
        variant: "destructive",
      })
      return false
    }

    if (itemType === "chapter" && !documentType.trim()) {
      toast({
        title: "Document type required",
        description: "Please select a document type.",
        variant: "destructive",
      })
      return false
    }

    if (!userData?.organizationId) {
      toast({
        title: "User data missing",
        description: "Please log in again.",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted")

    if (!validateForm()) {
      return
    }

    setUploading(true)
    console.log("Starting upload process...")

    try {
      const formData = new FormData()
      formData.append("file", file!)
      formData.append("displayName", displayName.trim())
      formData.append("description", description.trim())
      formData.append("itemType", itemType)
      formData.append("organizationId", userData!.organizationId)
      formData.append("userId", userData!.id)

      if (itemType === "class") {
        formData.append("className", className.trim())
        formData.append("category", "class")
      } else {
        formData.append("documentType", documentType)
        formData.append("category", "chapter")

        if (documentType === "Composites") {
          formData.append("compositeType", compositeType)
          formData.append("compositeYear", compositeYear)
        }
      }

      console.log("FormData prepared:", {
        displayName,
        description,
        itemType,
        className,
        documentType,
        compositeType,
        compositeYear,
        organizationId: userData!.organizationId,
        userId: userData!.id,
      })

      const response = await fetch("/api/library/upload", {
        method: "POST",
        body: formData,
      })

      console.log("Upload response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Upload error:", errorData)
        throw new Error(errorData.message || "Upload failed")
      }

      const result = await response.json()
      console.log("Upload successful:", result)

      setUploadSuccess(true)

      toast({
        title: "Success!",
        description: "File uploaded successfully.",
      })

      // Wait a moment to show success state, then close and refresh
      setTimeout(() => {
        onUploadSuccess()
        onOpenChange(false)
      }, 1500)
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the file.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const documentTypes = ["Documents", "Meeting Minutes", "Reports", "Templates", "Guides", "Composites"]

  const compositeTypes = ["Full Composite", "Individual Pictures"]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload New File</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Share documents, images, and other resources with your organization. Max file size: 50MB.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Chapter Bylaws Q3 2024"
              className="w-full"
              required
            />
          </div>

          {/* File Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">File Type</Label>
            <RadioGroup value={itemType} onValueChange={(value: "class" | "chapter") => setItemType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="class" id="class" />
                <Label htmlFor="class" className="text-sm">
                  Class Material
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="chapter" id="chapter" />
                <Label htmlFor="chapter" className="text-sm">
                  Chapter File
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Class Name (for class materials) */}
          {itemType === "class" && (
            <div className="space-y-2">
              <Label htmlFor="className" className="text-sm font-medium">
                Class Name
              </Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g., IT 333"
                className="w-full"
                required
              />
            </div>
          )}

          {/* Document Type (for chapter files) */}
          {itemType === "chapter" && (
            <div className="space-y-2">
              <Label htmlFor="documentType" className="text-sm font-medium">
                Document Type
              </Label>
              <Select value={documentType} onValueChange={setDocumentType} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Composite-specific fields */}
          {itemType === "chapter" && documentType === "Composites" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="compositeType" className="text-sm font-medium">
                  Composite Type
                </Label>
                <Select value={compositeType} onValueChange={setCompositeType} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select composite type" />
                  </SelectTrigger>
                  <SelectContent>
                    {compositeTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="compositeYear" className="text-sm font-medium">
                  Year
                </Label>
                <Select value={compositeYear} onValueChange={setCompositeYear} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the file content..."
              className="w-full min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">File (PDF, JPG, PNG)</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : uploadSuccess
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                onChange={handleFileInputChange}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading || uploadSuccess}
              />

              {uploadSuccess ? (
                <div className="flex flex-col items-center space-y-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Upload Successful!</p>
                  <p className="text-xs text-green-600 dark:text-green-500">{file?.name}</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setDisplayName("")
                      }}
                      className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF, JPG, PNG (MAX. 50MB)</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || uploading || uploadSuccess} className="min-w-[120px]">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : uploadSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Success!
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
