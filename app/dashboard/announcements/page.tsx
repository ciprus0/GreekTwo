"use client"

import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bell, Plus, Search, Filter, MoreVertical, Trash, Edit } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/supabase-api"
import { CustomAvatar } from "@/components/ui/custom-avatar"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"

export default function AnnouncementsPage() {
  const { toast } = useToast()
  const [user, setUser] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
  })

  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()
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

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user data from localStorage first
        const userData = localStorage.getItem("user")
        if (userData) {
          let parsedUser = JSON.parse(userData)

          // Get fresh user data from database like members section does
          if (parsedUser.organizationId && parsedUser.email) {
            try {
              const members = await api.getMembersByOrganization(parsedUser.organizationId)
              const freshUserData = members.find((member) => member.email === parsedUser.email)
              if (freshUserData) {
                parsedUser = {
                  ...parsedUser,
                  profile_picture: freshUserData.profile_picture,
                  name: freshUserData.name,
                  id: freshUserData.id,
                }
                localStorage.setItem("user", JSON.stringify(parsedUser))
              }
            } catch (error) {
              console.error("Error fetching fresh user data:", error)
            }
          }

          setUser(parsedUser)

          // Load announcements from Supabase
          if (parsedUser.organizationId) {
            const announcementsData = await api.getAnnouncementsByOrganization(parsedUser.organizationId)
            setAnnouncements(announcementsData)
          }
        }
      } catch (error) {
        console.error("Error loading announcements:", error)
        toast({
          title: "Error",
          description: "Failed to load announcements.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  useEffect(() => {
    let interval
    if (user && user.organizationId) {
      const refreshUserData = async () => {
        try {
          const members = await api.getMembersByOrganization(user.organizationId)
          const freshUserData = members.find((member) => member.email === user.email)
          if (freshUserData && freshUserData.profile_picture !== user.profile_picture) {
            const updatedUser = {
              ...user,
              profile_picture: freshUserData.profile_picture,
              name: freshUserData.name,
            }
            setUser(updatedUser)
            localStorage.setItem("user", JSON.stringify(updatedUser))
          }
        } catch (error) {
          console.error("Error refreshing user data:", error)
        }
      }
      interval = setInterval(refreshUserData, 5000) // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    const handleProfilePictureUpdate = (event) => {
      if (event.detail.userId === user?.id) {
        setUser((prev) => ({
          ...prev,
          profile_picture: event.detail.profilePicture,
        }))
      }
    }
    window.addEventListener("profilePictureUpdated", handleProfilePictureUpdate)
    return () => {
      window.removeEventListener("profilePictureUpdated", handleProfilePictureUpdate)
    }
  }, [user?.id])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryFilter = (value) => {
    setCategoryFilter(value)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCreateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      // Get fresh user data like members section does
      let currentUser = user
      if (user.organizationId && user.email) {
        const members = await api.getMembersByOrganization(user.organizationId)
        const freshUserData = members.find((member) => member.email === user.email)
        if (freshUserData) {
          currentUser = {
            ...user,
            profile_picture: freshUserData.profile_picture,
            name: freshUserData.name,
          }
        }
      }

      const newAnnouncement = await api.createAnnouncement({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        author_id: currentUser.id,
        author_name: currentUser.name,
        author_profile_picture: currentUser.profile_picture,
        organization_id: currentUser.organizationId,
      })

      setAnnouncements([newAnnouncement, ...announcements])

      setFormData({
        title: "",
        content: "",
        category: "general",
      })

      setIsDialogOpen(false)

      toast({
        title: "Announcement created",
        description: "Your announcement has been published successfully.",
      })
    } catch (error) {
      console.error("Error creating announcement:", error)
      toast({
        title: "Error",
        description: "Failed to create announcement.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    try {
      await api.deleteAnnouncement(id)
      const updatedAnnouncements = announcements.filter((announcement) => announcement.id !== id)
      setAnnouncements(updatedAnnouncements)

      toast({
        title: "Announcement deleted",
        description: "The announcement has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast({
        title: "Error",
        description: "Failed to delete announcement.",
        variant: "destructive",
      })
    }
  }

  // Filter announcements based on search and category filter
  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || announcement.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const isAdmin = user?.roles && user.roles.some((role) => ["Group Owner", "President", "Treasurer"].includes(role))

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)]">Loading...</div>
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Announcements</h1>
            <p className={`text-muted-foreground ${getMutedTextColor()}`}>
              Stay updated with the latest chapter announcements.
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="glass-button">
                  <Plus className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-dialog">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>Create a new announcement for your chapter members.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Announcement title"
                      className="glass-input"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <textarea
                      id="content"
                      name="content"
                      rows={5}
                      className="glass-input min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.content}
                      onChange={handleInputChange}
                      placeholder="Write your announcement here..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="glass-button-outline">
                    Cancel
                  </Button>
                  <Button className="glass-button" onClick={handleCreateAnnouncement}>
                    Publish
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {!isAdmin && (
            <div className="text-center py-4">
              <p className={`text-sm ${getMutedTextColor()}`}>Only administrators can create announcements.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Search announcements..."
              className="glass-input pl-8"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <Select defaultValue="all" onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>Filter by category</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <Card className={getCardClasses()}>
              <CardContent className="flex items-center justify-center h-40">
                <p className={`${getMutedTextColor()}`}>No announcements found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className={getCardClasses()}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CustomAvatar
                        src={announcement.author_profile_picture}
                        name={announcement.author_name}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${getTextColor()}`}>{announcement.author_name}</p>
                          <Badge
                            className={`${
                              announcement.category === "important"
                                ? "bg-red-600"
                                : announcement.category === "event"
                                  ? "bg-green-600"
                                  : announcement.category === "reminder"
                                    ? "bg-yellow-600"
                                    : "bg-blue-600"
                            }`}
                          >
                            {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                          </Badge>
                        </div>
                        <p className={`text-xs ${getMutedTextColor()}`}>{formatDate(announcement.created_at)}</p>
                      </div>
                    </div>
                    {(isAdmin || announcement.author_id === user.id) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CardTitle className={`mt-2 ${getTextColor()}`}>{announcement.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`whitespace-pre-line ${getSecondaryTextColor()}`}>{announcement.content}</p>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <div className={`flex items-center gap-2 text-sm ${getMutedTextColor()}`}>
                    <Bell className="h-4 w-4" />
                    <span>Notify all members</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Share
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </ThemeWrapper>
  )
}
