"use client"

import { useState, useEffect, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Check, Loader2, Palette } from "lucide-react"
import { api } from "@/lib/supabase-api"
import { CustomAvatar } from "@/components/ui/custom-avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ImageCropper from "@/components/image-cropper"
import { useTheme, type Theme } from "@/lib/theme-context"
import { ThemedCard } from "@/components/themed-card"
import { ThemedButton } from "@/components/themed-button"
import { ThemedInput } from "@/components/themed-input"
import { ThemeWrapper } from "@/components/theme-wrapper"

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef(null)

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    chapter: "",
    university: "",
    bio: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [croppedImage, setCroppedImage] = useState(null)

  const themes = [
    {
      id: "original" as Theme,
      name: "Original",
      description: "Clean white and garnet design",
      preview: "bg-white border-2 border-red-600",
      colors: ["#ffffff", "#991b1b", "#f3f4f6"],
    },
    {
      id: "dark" as Theme,
      name: "Dark",
      description: "Dark glass morphism with garnet accents",
      preview: "bg-gradient-to-br from-slate-900 to-red-900 border-2 border-white/20",
      colors: ["#0f172a", "#7f1d1d", "#ef4444"],
    },
    {
      id: "light" as Theme,
      name: "Light",
      description: "Light glass morphism with blue accents",
      preview: "bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200",
      colors: ["#f8fafc", "#2563eb", "#dbeafe"],
    },
  ]

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user data
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)

          // Load organization data if user has an organizationId
          if (parsedUser.organizationId) {
            try {
              const orgsData = await api.getOrganizationById(parsedUser.organizationId)
              if (orgsData) {
                setOrganization(orgsData)
              }
            } catch (error) {
              console.error("Error loading organization:", error)
            }
          }

          // Initialize profile form
          setProfileData({
            name: parsedUser.name || "",
            email: parsedUser.email || "",
            chapter: parsedUser.chapter || "",
            university: parsedUser.university || "",
            bio: parsedUser.bio || "",
          })

          setLoading(false)
        }
      } catch (error) {
        console.error("Error loading settings data:", error)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const copyGroupId = async () => {
    if (organization?.group_id) {
      try {
        await navigator.clipboard.writeText(organization.group_id)
        setCopied(true)
        toast({
          title: "Group ID copied!",
          description: "The Group ID has been copied to your clipboard.",
        })
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Could not copy Group ID to clipboard.",
          variant: "destructive",
        })
      }
    }
  }

  const handleThemeChange = async (newTheme: Theme) => {
    try {
      await setTheme(newTheme)
      toast({
        title: "Theme Updated",
        description: `Switched to ${themes.find((t) => t.id === newTheme)?.name} theme.`,
      })
    } catch (error) {
      console.error("Error updating theme:", error)
      toast({
        title: "Error",
        description: "Failed to update theme. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const validateProfileForm = () => {
    let valid = true
    const newErrors = { ...errors }

    if (!profileData.name.trim()) {
      newErrors.name = "Name is required"
      valid = false
    }

    if (!profileData.email.trim()) {
      newErrors.email = "Email is required"
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = "Email is invalid"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const validatePasswordForm = () => {
    let valid = true
    const newErrors = { ...errors }

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required"
      valid = false
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required"
      valid = false
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters"
      valid = false
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
      valid = false
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()

    if (!validateProfileForm()) {
      return
    }

    try {
      // Update user data in Supabase
      const updatedMember = await api.updateMember(user.id, {
        name: profileData.name,
        email: profileData.email,
        chapter: profileData.chapter,
        university: profileData.university,
        bio: profileData.bio,
      })

      if (updatedMember) {
        const updatedUser = {
          ...user,
          name: profileData.name,
          email: profileData.email,
          chapter: profileData.chapter,
          university: profileData.university,
          bio: profileData.bio,
        }

        localStorage.setItem("user", JSON.stringify(updatedUser))
        setUser(updatedUser)

        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully.",
        })
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()

    if (!validatePasswordForm()) {
      return
    }

    // In a real app, we would verify the current password and update with the new one
    // For demo purposes, we'll just show a success message

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })

    toast({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    })
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const fileType = file.type.toLowerCase()
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]

    if (!validTypes.includes(fileType)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, GIF, WEBP).",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      })
      return
    }

    // Set the selected image and open crop dialog
    setSelectedImage(file)
    setCropDialogOpen(true)
  }

  const handleCropComplete = async (croppedFile) => {
    setCroppedImage(croppedFile)
    setCropDialogOpen(false)

    // Now upload the cropped image
    setUploading(true)
    toast({
      title: "Uploading...",
      description: "Your profile picture is being uploaded.",
    })

    try {
      // Try to delete old profile picture if it exists and it's not a placeholder
      if (user.profile_picture && !user.profile_picture.includes("placeholder.svg")) {
        try {
          await api.deleteProfilePicture(user.profile_picture)
        } catch (error) {
          console.error("Error deleting old profile picture:", error)
          // Continue anyway
        }
      }

      // Upload new profile picture to Supabase Storage
      const profilePictureUrl = await api.uploadProfilePicture(croppedFile, user.id)

      if (!profilePictureUrl) {
        throw new Error("Failed to upload profile picture - no URL returned")
      }

      console.log("Received profile picture URL:", profilePictureUrl)

      // Update member in database
      const updatedMember = await api.updateMember(user.id, {
        profile_picture: profilePictureUrl,
      })

      if (updatedMember) {
        console.log("Member updated successfully with new profile picture")

        // Update user object in state and localStorage
        const updatedUser = { ...user, profile_picture: profilePictureUrl }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setUser(updatedUser)

        // Dispatch custom event to update profile pictures across the app
        window.dispatchEvent(
          new CustomEvent("profilePictureUpdated", {
            detail: { userId: user.id, profilePicture: profilePictureUrl },
          }),
        )

        // Also dispatch a more general user update event
        window.dispatchEvent(
          new CustomEvent("userDataUpdated", {
            detail: { userId: user.id, userData: updatedUser },
          }),
        )

        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been updated successfully.",
        })
      } else {
        throw new Error("Failed to update member record")
      }
    } catch (error) {
      console.error("Error updating profile picture:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile picture. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setSelectedImage(null)
      setCroppedImage(null)
    }
  }

  const handleCropCancel = () => {
    setCropDialogOpen(false)
    setSelectedImage(null)
    setCroppedImage(null)
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveProfilePicture = async () => {
    if (!user.profile_picture) return

    setUploading(true)

    try {
      // Try to delete profile picture from Supabase storage
      if (!user.profile_picture.includes("placeholder.svg")) {
        await api.deleteProfilePicture(user.profile_picture)
      }

      // Update member in database
      const updatedMember = await api.updateMember(user.id, {
        profile_picture: null,
      })

      if (updatedMember) {
        // Update user object
        const updatedUser = { ...user, profile_picture: null }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setUser(updatedUser)

        // Dispatch custom events
        window.dispatchEvent(
          new CustomEvent("profilePictureUpdated", {
            detail: { userId: user.id, profilePicture: null },
          }),
        )

        window.dispatchEvent(
          new CustomEvent("userDataUpdated", {
            detail: { userId: user.id, userData: updatedUser },
          }),
        )

        toast({
          title: "Profile picture removed",
          description: "Your profile picture has been removed.",
        })
      }
    } catch (error) {
      console.error("Error removing profile picture:", error)
      toast({
        title: "Error",
        description: "Failed to remove profile picture. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const getTextColor = () => {
    switch (theme) {
      case "original":
        return "text-gray-900"
      case "light":
        return "text-gray-900"
      case "dark":
      default:
        return "text-white"
    }
  }

  const getSecondaryTextColor = () => {
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

  const getTabsClasses = () => {
    switch (theme) {
      case "original":
        return "original-tabs"
      case "light":
        return "light-glass-tabs"
      case "dark":
      default:
        return "glass-tabs"
    }
  }

  const getTabClasses = (active = false) => {
    switch (theme) {
      case "original":
        return active ? "original-tab original-tab-active" : "original-tab"
      case "light":
        return active ? "light-glass-tab light-glass-tab-active" : "light-glass-tab"
      case "dark":
      default:
        return active ? "glass-tab glass-tab-active" : "glass-tab"
    }
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      new_member: "New Member",
      active: "Active Member",
      executive: "Executive",
      admin: "Administrator",
    }
    return roleNames[role] || role
  }

  if (loading) {
    return (
      <ThemeWrapper>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className={getTextColor()}>Loading...</div>
        </div>
      </ThemeWrapper>
    )
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Settings</h1>
          <p className={getSecondaryTextColor()}>Manage your account settings and preferences.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className={getTabsClasses()}>
            <TabsTrigger value="profile" className={getTabClasses()}>
              Profile
            </TabsTrigger>
            <TabsTrigger value="password" className={getTabClasses()}>
              Password
            </TabsTrigger>
            <TabsTrigger value="appearance" className={getTabClasses()}>
              Appearance
            </TabsTrigger>
            <TabsTrigger value="organization" className={getTabClasses()}>
              Organization
            </TabsTrigger>
            <TabsTrigger value="notifications" className={getTabClasses()}>
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ThemedCard className="p-6">
              <div className="mb-4">
                <h3 className={`text-xl font-semibold ${getTextColor()} mb-2`}>Profile</h3>
                <p className={getSecondaryTextColor()}>Update your personal information and profile settings.</p>
              </div>
              <div>
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                  <div className="relative">
                    <CustomAvatar
                      src={user?.profile_picture}
                      name={user?.name}
                      className="w-24 h-24 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleProfilePictureChange}
                      disabled={uploading}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <ThemedButton variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Change Avatar"
                      )}
                    </ThemedButton>
                    <ThemedButton
                      variant="destructive"
                      onClick={handleRemoveProfilePicture}
                      disabled={uploading || !user?.profile_picture}
                    >
                      Remove
                    </ThemedButton>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className={`${getTextColor()} font-medium`}>
                        Full Name
                      </Label>
                      <ThemedInput
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileChange}
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email" className={`${getTextColor()} font-medium`}>
                        Email
                      </Label>
                      <ThemedInput
                        id="email"
                        name="email"
                        type="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="chapter" className={`${getTextColor()} font-medium`}>
                        Chapter
                      </Label>
                      <ThemedInput
                        id="chapter"
                        name="chapter"
                        value={profileData.chapter}
                        onChange={handleProfileChange}
                        disabled={user?.role !== "admin"}
                      />
                      {user?.role !== "admin" && (
                        <p className={`text-xs ${getSecondaryTextColor()}`}>
                          Only administrators can change chapter information.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="university" className={`${getTextColor()} font-medium`}>
                        University
                      </Label>
                      <ThemedInput
                        id="university"
                        name="university"
                        value={profileData.university}
                        onChange={handleProfileChange}
                        disabled={user?.role !== "admin"}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="bio" className={`${getTextColor()} font-medium`}>
                        Bio
                      </Label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={4}
                        className={`${theme === "original" ? "original-input" : theme === "light" ? "light-glass-input" : "glass-input"} min-h-[100px] resize-none rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                        value={profileData.bio}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <ThemedButton type="submit">Save Changes</ThemedButton>
                  </div>
                </form>
              </div>
            </ThemedCard>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <ThemedCard className="p-6">
              <div className="mb-4">
                <h3 className={`text-xl font-semibold ${getTextColor()} mb-2`}>Password</h3>
                <p className={getSecondaryTextColor()}>Change your password to keep your account secure.</p>
              </div>
              <div>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current-password" className={`${getTextColor()} font-medium`}>
                        Current Password
                      </Label>
                      <ThemedInput
                        id="current-password"
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className={errors.currentPassword ? "border-red-500" : ""}
                      />
                      {errors.currentPassword && <p className="text-sm text-red-500">{errors.currentPassword}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="new-password" className={`${getTextColor()} font-medium`}>
                        New Password
                      </Label>
                      <ThemedInput
                        id="new-password"
                        name="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className={errors.newPassword ? "border-red-500" : ""}
                      />
                      {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password" className={`${getTextColor()} font-medium`}>
                        Confirm Password
                      </Label>
                      <ThemedInput
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className={errors.confirmPassword ? "border-red-500" : ""}
                      />
                      {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <ThemedButton type="submit">Update Password</ThemedButton>
                  </div>
                </form>
              </div>
            </ThemedCard>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <ThemedCard className="p-6">
              <div className="mb-6">
                <h3 className={`text-xl font-semibold ${getTextColor()} mb-2`}>Appearance</h3>
                <p className={getSecondaryTextColor()}>Customize the look and feel of your dashboard.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className={`text-lg font-medium ${getTextColor()} mb-4 flex items-center`}>
                    <Palette className="mr-2 h-5 w-5" />
                    Theme Selection
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {themes.map((themeOption) => (
                      <div
                        key={themeOption.id}
                        className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:scale-105 ${
                          theme === themeOption.id
                            ? theme === "original"
                              ? "border-red-600 bg-red-50"
                              : theme === "light"
                                ? "border-blue-500 bg-blue-50"
                                : "border-white bg-white/10"
                            : theme === "original"
                              ? "border-gray-200 hover:border-gray-300"
                              : theme === "light"
                                ? "border-blue-200 hover:border-blue-300"
                                : "border-white/20 hover:border-white/40"
                        }`}
                        onClick={() => handleThemeChange(themeOption.id)}
                      >
                        {theme === themeOption.id && (
                          <div
                            className={`absolute top-2 right-2 rounded-full p-1 ${
                              theme === "original" ? "bg-red-600" : theme === "light" ? "bg-blue-500" : "bg-white"
                            }`}
                          >
                            <Check className={`h-3 w-3 ${theme === "dark" ? "text-black" : "text-white"}`} />
                          </div>
                        )}

                        <div className={`${themeOption.preview} h-20 w-full rounded-md mb-3`}>
                          <div className="flex h-full items-center justify-center space-x-1">
                            {themeOption.colors.map((color, index) => (
                              <div key={index} className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className={`font-semibold ${getTextColor()}`}>{themeOption.name}</h5>
                          <p className={`text-sm ${getSecondaryTextColor()}`}>{themeOption.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ThemedCard>
          </TabsContent>

          <TabsContent value="organization" className="space-y-4">
            <ThemedCard className="p-6">
              <div className="mb-4">
                <h3 className={`text-xl font-semibold ${getTextColor()} mb-2`}>Organization</h3>
                <p className={getSecondaryTextColor()}>View your organization information and membership details.</p>
              </div>
              <div className="space-y-4">
                {organization ? (
                  <>
                    <div className="grid gap-2">
                      <Label className={`${getTextColor()} font-medium`}>Organization Name</Label>
                      <ThemedInput value={organization.name || ""} disabled className="opacity-60" />
                    </div>

                    <div className="grid gap-2">
                      <Label className={`${getTextColor()} font-medium`}>Group ID</Label>
                      <div className="flex gap-2">
                        <ThemedInput value={organization.group_id || ""} disabled className="opacity-60 flex-1" />
                        <ThemedButton variant="outline" onClick={copyGroupId} className="shrink-0">
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </ThemedButton>
                      </div>
                      <p className={`text-sm ${getSecondaryTextColor()}`}>
                        Share this Group ID with new members to invite them to your organization.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label className={`${getTextColor()} font-medium`}>Your Role</Label>
                      <ThemedInput value={getRoleDisplayName(user?.role) || ""} disabled className="opacity-60" />
                      <p className={`text-sm ${getSecondaryTextColor()}`}>
                        Only administrators can change member roles.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label className={`${getTextColor()} font-medium`}>Member Since</Label>
                      <ThemedInput
                        value={user?.join_date ? new Date(user.join_date).toLocaleDateString() : ""}
                        disabled
                        className="opacity-60"
                      />
                    </div>
                  </>
                ) : (
                  <div className={`text-center py-8 ${getSecondaryTextColor()}`}>
                    <p>No organization information available.</p>
                  </div>
                )}
              </div>
            </ThemedCard>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <ThemedCard className="p-6">
              <div className="mb-4">
                <h3 className={`text-xl font-semibold ${getTextColor()} mb-2`}>Notifications</h3>
                <p className={getSecondaryTextColor()}>Configure how you receive notifications.</p>
              </div>
              <div className={`text-center py-8 ${getSecondaryTextColor()}`}>
                <p>Notification settings will be available in a future update.</p>
              </div>
            </ThemedCard>
          </TabsContent>
        </Tabs>

        {/* Image Cropper Dialog */}
        <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
          <DialogContent
            className={
              theme === "original" ? "original-card" : theme === "light" ? "light-glass-dialog" : "glass-dialog"
            }
          >
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Crop Profile Picture</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <ImageCropper image={selectedImage} onCropComplete={handleCropComplete} onCancel={handleCropCancel} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ThemeWrapper>
  )
}
