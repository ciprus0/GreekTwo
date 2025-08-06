"use client"

import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bell, Plus, Search, Filter, MoreVertical, Trash, Edit, Hash, Settings } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/supabase-api"
import { CustomAvatar } from "@/components/ui/custom-avatar"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"
import { AnnouncementChannel } from "@/lib/supabase-api"

export default function AnnouncementsPage() {
  const { toast } = useToast()
  const [user, setUser] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [channels, setChannels] = useState<AnnouncementChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false)
  const [isManageChannelsDialogOpen, setIsManageChannelsDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<AnnouncementChannel | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    channel: "general",
  })
  const [channelFormData, setChannelFormData] = useState({
    name: "",
    description: "",
    color: "#4F8EF7",
  })

  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()
  const { theme } = useTheme()

  // Check if user has admin permissions
  const isAdmin = () => {
    if (!user?.roles) return false
    const roles = Array.isArray(user.roles) ? user.roles : user.roles.split(',').map((r: string) => r.trim())
    return roles.some(role => 
      role.toLowerCase().includes('admin') || 
      role.toLowerCase().includes('president') || 
      role.toLowerCase().includes('owner')
    )
  }

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

  // Get theme-aware input classes
  const getInputClasses = () => {
    switch (theme) {
      case "original":
        return "original-input"
      case "light":
        return "light-glass-input"
      case "dark":
      default:
        return "glass-input"
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

          // Load announcements and channels from Supabase
          if (parsedUser.organizationId) {
            const [announcementsData, channelsData] = await Promise.all([
              api.getAnnouncementsByOrganization(parsedUser.organizationId),
              api.getAnnouncementChannels(parsedUser.organizationId)
            ])
            
            // Fetch author information for each announcement
            const announcementsWithAuthors = await Promise.all(
              announcementsData.map(async (announcement) => {
                try {
                  const author = await api.getMemberById(announcement.author_id)
                  return {
                    ...announcement,
                    author_name: author?.name || announcement.author_name || "Unknown User",
                    author_profile_picture: author?.profile_picture || announcement.author_profile_picture,
                  }
                } catch (error) {
                  console.error(`Error fetching author for announcement ${announcement.id}:`, error)
                  return {
                    ...announcement,
                    author_name: announcement.author_name || "Unknown User",
                    author_profile_picture: announcement.author_profile_picture,
                  }
                }
              })
            )
            
            setAnnouncements(announcementsWithAuthors)
            setChannels(channelsData)
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleChannelInputChange = (e) => {
    const { name, value } = e.target
    setChannelFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const announcementData = {
        title: formData.title,
        content: formData.content,
        category: formData.channel, // Keep for backward compatibility
        channel: formData.channel,
        author_id: user.id,
        author_name: user.name,
        author_profile_picture: user.profile_picture,
        organization_id: user.organizationId,
      }

      const newAnnouncement = await api.createAnnouncement(announcementData)
      setAnnouncements((prev) => [newAnnouncement, ...prev])
      setFormData({ title: "", content: "", channel: "general" })
      setIsCreateDialogOpen(false)
      toast({
        title: "Success",
        description: "Announcement created successfully.",
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

  const handleCreateChannel = async () => {
    if (!channelFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a channel name.",
        variant: "destructive",
      })
      return
    }

    try {
      const newChannel = await api.createAnnouncementChannel(user.organizationId, {
        name: channelFormData.name,
        description: channelFormData.description,
        color: channelFormData.color,
      })
      setChannels((prev) => [...prev, newChannel])
      setChannelFormData({ name: "", description: "", color: "#4F8EF7" })
      setIsChannelDialogOpen(false)
      toast({
        title: "Success",
        description: "Channel created successfully.",
      })
    } catch (error) {
      console.error("Error creating channel:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create channel.",
        variant: "destructive",
      })
    }
  }

  const handleEditChannel = (channel: AnnouncementChannel) => {
    setEditingChannel(channel)
    setChannelFormData({
      name: channel.name,
      description: channel.description,
      color: channel.color,
    })
    setIsChannelDialogOpen(true)
  }

  const handleUpdateChannel = async () => {
    if (!editingChannel || !channelFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a channel name.",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedChannel = await api.updateAnnouncementChannel(
        user.organizationId,
        editingChannel.id,
        {
          name: channelFormData.name,
          description: channelFormData.description,
          color: channelFormData.color,
        }
      )
      
      if (updatedChannel) {
        setChannels((prev) => 
          prev.map(ch => ch.id === editingChannel.id ? updatedChannel : ch)
        )
        setChannelFormData({ name: "", description: "", color: "#4F8EF7" })
        setEditingChannel(null)
        setIsChannelDialogOpen(false)
        toast({
          title: "Success",
          description: "Channel updated successfully.",
        })
      }
    } catch (error) {
      console.error("Error updating channel:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update channel.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await api.deleteAnnouncementChannel(user.organizationId, channelId)
      setChannels((prev) => prev.filter(ch => ch.id !== channelId))
      toast({
        title: "Success",
        description: "Channel deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting channel:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete channel.",
        variant: "destructive",
      })
    }
  }

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      channel: announcement.channel || announcement.category || "general",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const updateData = {
        title: formData.title,
        content: formData.content,
        category: formData.channel, // Keep for backward compatibility
        channel: formData.channel,
      }

      const updatedAnnouncement = await api.updateAnnouncement(editingAnnouncement.id, updateData)
      
      // Update local state
      setAnnouncements((prev) => 
        prev.map((announcement) => 
          announcement.id === editingAnnouncement.id 
            ? { ...announcement, ...updatedAnnouncement }
            : announcement
        )
      )
      
      setFormData({ title: "", content: "", channel: "general" })
      setEditingAnnouncement(null)
      setIsEditDialogOpen(false)
      toast({
        title: "Success",
        description: "Announcement updated successfully.",
      })
    } catch (error) {
      console.error("Error updating announcement:", error)
      toast({
        title: "Error",
        description: "Failed to update announcement.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    try {
      await api.deleteAnnouncement(id)
      setAnnouncements((prev) => prev.filter((announcement) => announcement.id !== id))
      toast({
        title: "Success",
        description: "Announcement deleted successfully.",
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

  // Check if user can edit/delete an announcement
  const canEditAnnouncement = (announcement) => {
    if (!user) return false
    return user.id === announcement.author_id || user.role === "admin" || user.role === "executive"
  }

  const canDeleteAnnouncement = (announcement) => {
    if (!user) return false
    return user.id === announcement.author_id || user.role === "admin" || user.role === "executive"
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    })
  }

  const getChannelColor = (channelId) => {
    const channel = channels.find(ch => ch.id === channelId)
    return channel?.color || "#4F8EF7"
  }

  const getChannelName = (channelId) => {
    const channel = channels.find(ch => ch.id === channelId)
    return channel?.name || channelId
  }

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesChannel = selectedChannel === "all" || announcement.channel === selectedChannel || announcement.category === selectedChannel
    return matchesSearch && matchesChannel
  })

  const selectedChannelData = channels.find(ch => ch.id === selectedChannel)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          <p className={`mt-2 text-sm ${getSecondaryTextColor()}`}>Loading announcements...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeWrapper>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>Announcements</h1>
            <p className={`text-sm ${getSecondaryTextColor()}`}>
              {filteredAnnouncements.length} announcement{filteredAnnouncements.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isAdmin() && (
            <div className="flex gap-2">
              <Button
                onClick={() => setIsManageChannelsDialogOpen(true)}
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${getButtonClasses("outline")}`}
              >
                <Settings className="h-4 w-4" />
                Manage Channels
              </Button>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Announcement
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Channels Sidebar */}
          <div className="lg:col-span-1">
            <Card className={getCardClasses()}>
              <CardHeader>
                <CardTitle className={`text-sm font-semibold uppercase tracking-wide ${getMutedTextColor()}`}>
                  Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {/* All Channel */}
                  <button
                    onClick={() => setSelectedChannel("all")}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                      selectedChannel === "all"
                        ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : `hover:bg-slate-100 dark:hover:bg-slate-700 ${getTextColor()}`
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium"># All</span>
                  </button>

                  {/* Individual Channels */}
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                        selectedChannel === channel.id
                          ? "bg-red-500/20 text-red-600 dark:text-red-400"
                          : `hover:bg-slate-100 dark:hover:bg-slate-700 ${getTextColor()}`
                      }`}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: channel.color }}
                      ></div>
                      <span className="font-medium"># {channel.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-4">
                          <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${getMutedTextColor()}`} />
              <Input
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={handleSearch}
                className={`pl-10 ${getInputClasses()}`}
              />
            </div>
            </div>

            {/* Channel Header */}
            {selectedChannel !== "all" && selectedChannelData && (
              <div className="mb-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: selectedChannelData.color }}
                  ></div>
                  <div>
                    <h2 className={`font-semibold ${getTextColor()}`}>#{selectedChannelData.name}</h2>
                    <p className={`text-sm ${getSecondaryTextColor()}`}>{selectedChannelData.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Announcements List */}
            <div className="space-y-4">
              {filteredAnnouncements.length === 0 ? (
                <Card className={getCardClasses()}>
                  <CardContent className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className={`text-lg font-medium ${getTextColor()}`}>No announcements found</h3>
                    <p className={`text-sm ${getSecondaryTextColor()} mt-1`}>
                      {searchTerm || selectedChannel !== "all" 
                        ? "Try adjusting your search or channel filter."
                        : "Create the first announcement for your organization."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredAnnouncements.map((announcement) => (
                  <Card key={announcement.id} className={getCardClasses()}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <CustomAvatar
                            src={announcement.author_profile_picture}
                            alt={announcement.author_name}
                            fallback={announcement.author_name}
                            className="h-10 w-10"
                          />
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary"
                              style={{ backgroundColor: getChannelColor(announcement.channel || announcement.category) + "20", color: getChannelColor(announcement.channel || announcement.category) }}
                            >
                              {getChannelName(announcement.channel || announcement.category)}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditAnnouncement(announcement) && (
                              <DropdownMenuItem
                                onClick={() => handleEditAnnouncement(announcement)}
                                className="text-blue-600"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDeleteAnnouncement(announcement) && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                                className="text-red-600"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2">
                        <h3 className={`text-lg font-semibold ${getTextColor()}`}>
                          {announcement.title}
                        </h3>
                        <p className={`text-sm ${getSecondaryTextColor()} whitespace-pre-wrap`}>
                          {announcement.content}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className={`text-xs ${getMutedTextColor()}`}>
                          {formatDate(announcement.created_at)} • {announcement.author_name}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Create Announcement Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className={`max-w-2xl ${getCardClasses()}`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Create New Announcement</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                Share important information with your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className={getTextColor()}>
                  Title
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter announcement title"
                  className={`${getInputClasses()}`}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="channel" className={getTextColor()}>
                  Channel
                </Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => handleSelectChange("channel", value)}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: channel.color }}
                          ></div>
                          {channel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content" className={getTextColor()}>
                  Content
                </Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Enter announcement content"
                  className={`${getInputClasses()} min-h-[120px]`}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className={getButtonClasses("outline")}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAnnouncement} className={getButtonClasses("default")}>
                Create Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Channel Dialog */}
        <Dialog open={isChannelDialogOpen} onOpenChange={(open) => {
          setIsChannelDialogOpen(open)
          if (!open) {
            setEditingChannel(null)
            setChannelFormData({ name: "", description: "", color: "#4F8EF7" })
          }
        }}>
          <DialogContent className={`max-w-md ${getCardClasses()}`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>
                {editingChannel ? "Edit Channel" : "Create New Channel"}
              </DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                {editingChannel ? "Update channel details." : "Create a new channel for organizing announcements."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="channel-name" className={getTextColor()}>
                  Channel Name
                </Label>
                <Input
                  id="channel-name"
                  name="name"
                  value={channelFormData.name}
                  onChange={handleChannelInputChange}
                  placeholder="e.g., Events, Important"
                  className="glass-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="channel-description" className={getTextColor()}>
                  Description (Optional)
                </Label>
                <Input
                  id="channel-description"
                  name="description"
                  value={channelFormData.description}
                  onChange={handleChannelInputChange}
                  placeholder="Brief description of the channel"
                  className="glass-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="channel-color" className={getTextColor()}>
                  Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="channel-color"
                    name="color"
                    type="color"
                    value={channelFormData.color}
                    onChange={handleChannelInputChange}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={channelFormData.color}
                    onChange={(e) => setChannelFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#4F8EF7"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsChannelDialogOpen(false)
                  setEditingChannel(null)
                  setChannelFormData({ name: "", description: "", color: "#4F8EF7" })
                }}
                className={getButtonClasses("outline")}
              >
                Cancel
              </Button>
              <Button 
                onClick={editingChannel ? handleUpdateChannel : handleCreateChannel} 
                className={getButtonClasses("default")}
              >
                {editingChannel ? "Update Channel" : "Create Channel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Announcement Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingAnnouncement(null)
            setFormData({ title: "", content: "", channel: "general" })
          }
        }}>
          <DialogContent className={`max-w-2xl ${getCardClasses()}`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Edit Announcement</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                Update the details of your announcement.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title" className={getTextColor()}>
                  Title
                </Label>
                <Input
                  id="edit-title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter announcement title"
                  className={`${getInputClasses()}`}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-channel" className={getTextColor()}>
                  Channel
                </Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => handleSelectChange("channel", value)}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: channel.color }}
                          ></div>
                          {channel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-content" className={getTextColor()}>
                  Content
                </Label>
                <Textarea
                  id="edit-content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Enter announcement content"
                  className={`${getInputClasses()} min-h-[120px]`}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingAnnouncement(null)
                  setFormData({ title: "", content: "", channel: "general" })
                }}
                className={getButtonClasses("outline")}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateAnnouncement} className={getButtonClasses("default")}>
                Update Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Channels Dialog */}
        <Dialog open={isManageChannelsDialogOpen} onOpenChange={setIsManageChannelsDialogOpen}>
          <DialogContent className={`max-w-2xl ${getCardClasses()}`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Manage Channels</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                View, edit, and delete announcement channels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`font-medium ${getTextColor()}`}>Current Channels</h3>
                <Button
                  onClick={() => {
                    setIsManageChannelsDialogOpen(false)
                    setIsChannelDialogOpen(true)
                  }}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Channel
                </Button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: channel.color }}
                      ></div>
                      <div>
                        <h4 className={`font-medium ${getTextColor()}`}>#{channel.name}</h4>
                        <p className={`text-sm ${getSecondaryTextColor()}`}>
                          {channel.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsManageChannelsDialogOpen(false)
                          handleEditChannel(channel)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {channels.length === 0 && (
                  <div className="text-center py-8">
                    <p className={`text-sm ${getSecondaryTextColor()}`}>
                      No channels created yet. Create your first channel to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsManageChannelsDialogOpen(false)}
                className={getButtonClasses("outline")}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeWrapper>
  )
}
