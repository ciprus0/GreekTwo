"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Check, Crown, AlertTriangle } from "lucide-react"
import { api } from "@/lib/supabase-api"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { ThemedInput } from "@/components/themed-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isAdmin, isGroupOwner } from "@/lib/permissions"

export default function ChapterSettingsPage() {
  const { toast } = useToast()
  const [user, setUser] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [transferOwnershipDialogOpen, setTransferOwnershipDialogOpen] = useState(false)
  const [deleteOrganizationDialogOpen, setDeleteOrganizationDialogOpen] = useState(false)
  const [selectedNewOwner, setSelectedNewOwner] = useState("")
  const [confirmDeleteText, setConfirmDeleteText] = useState("")
  const [features, setFeatures] = useState({
    events: true,
    study: true,
    tasks: true,
    library: true,
    messages: true,
    announcements: true,
    pledgeSystem: true,
    gym: true,
  })

  const { getTextColor, getSecondaryTextColor } = useTextColors()

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)

          // Check if user has admin permissions
          if (!isAdmin(parsedUser)) {
            toast({
              title: "Access Denied",
              description: "You do not have permission to view this page.",
              variant: "destructive",
            })
            window.location.href = "/dashboard"
            return
          }

          if (parsedUser.organizationId) {
            const org = await api.getOrganizationById(parsedUser.organizationId)
            if (org) {
              setOrganization(org)
              setFeatures(
                org.features || {
                  events: true,
                  study: true,
                  tasks: true,
                  library: true,
                  messages: true,
                  announcements: true,
                  pledgeSystem: true,
                  gym: true,
                },
              )
            }

            // Load members for transfer ownership
            const membersList = await api.getMembersByOrganization(parsedUser.organizationId)
            setMembers(membersList.filter((member) => member.id !== parsedUser.id && member.approved))
          }
        }
      } catch (error) {
        console.error("Error loading chapter settings:", error)
        toast({
          title: "Error",
          description: "Failed to load chapter settings.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleFeatureToggle = async (feature: string, checked: boolean) => {
    try {
      if (!organization) return

      const updatedFeatures = { ...features, [feature]: checked }
      await api.updateOrganization(organization.id, { features: updatedFeatures })
      setFeatures(updatedFeatures)

      toast({
        title: "Settings Updated",
        description: `${getFeatureDisplayName(feature)} has been ${checked ? "enabled" : "disabled"}.`,
      })

      // Force a page reload to update the sidebar immediately
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Error updating feature:", error)
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getFeatureDisplayName = (feature: string) => {
    const displayNames = {
      events: "Events",
      study: "Study",
      tasks: "Tasks",
      library: "Library",
      messages: "Messages",
      announcements: "Announcements",
      pledgeSystem: "Pledge/New Member System",
      gym: "Gym",
    }
    return displayNames[feature] || feature
  }

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

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner || !organization) return

    try {
      await api.transferOrganizationOwnership(organization.id, selectedNewOwner, user.id)

      toast({
        title: "Ownership Transferred",
        description: "Organization ownership has been successfully transferred.",
      })

      // Update local user data to remove Group Owner role
      const updatedUser = { ...user, roles: user.roles?.filter((role) => role !== "Group Owner") || ["Active"] }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      setUser(updatedUser)

      setTransferOwnershipDialogOpen(false)
      setSelectedNewOwner("")
    } catch (error) {
      console.error("Error transferring ownership:", error)
      toast({
        title: "Error",
        description: "Failed to transfer ownership. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteOrganization = async () => {
    if (confirmDeleteText !== organization?.name || !organization) return

    try {
      await api.deleteOrganization(organization.id, user.id)

      toast({
        title: "Organization Deleted",
        description: "The organization has been permanently deleted.",
      })

      // Clear local storage and redirect
      localStorage.removeItem("isAuthenticated")
      localStorage.removeItem("user")
      window.location.href = "/"
    } catch (error) {
      console.error("Error deleting organization:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization. Please try again.",
        variant: "destructive",
      })
    }
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

  const canAccessSettings = user && isAdmin(user)

  if (!canAccessSettings) {
    return (
      <ThemeWrapper>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className={getTextColor()}>You do not have permission to view this page.</div>
        </div>
      </ThemeWrapper>
    )
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Chapter Settings</h1>
          <p className={getSecondaryTextColor()}>Customize your chapter's features and organization information.</p>
        </div>

        {/* Organization Information */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className={getTextColor()}>Organization Information</CardTitle>
            <CardDescription className={getSecondaryTextColor()}>
              View and manage your organization's basic information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className={`${getTextColor()} font-medium`}>Organization Name</Label>
              <ThemedInput value={organization?.name || ""} disabled className="opacity-60" />
            </div>

            <div className="grid gap-2">
              <Label className={`${getTextColor()} font-medium`}>Group ID</Label>
              <div className="flex gap-2">
                <ThemedInput value={organization?.group_id || ""} disabled className="opacity-60 flex-1" />
                <Button variant="outline" onClick={copyGroupId} className="shrink-0 bg-transparent">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className={`text-sm ${getSecondaryTextColor()}`}>
                Share this Group ID with new members to invite them to your organization.
              </p>
            </div>

            <div className="grid gap-2">
              <Label className={`${getTextColor()} font-medium`}>Organization Type</Label>
              <ThemedInput value={organization?.type || ""} disabled className="opacity-60" />
            </div>

            <div className="grid gap-2">
              <Label className={`${getTextColor()} font-medium`}>University</Label>
              <ThemedInput value={organization?.university || ""} disabled className="opacity-60" />
            </div>

            <div className="grid gap-2">
              <Label className={`${getTextColor()} font-medium`}>Chapter Designation</Label>
              <ThemedInput value={organization?.chapter_designation || ""} disabled className="opacity-60" />
            </div>

            <div className="grid gap-2">
              <Label className={`${getTextColor()} font-medium`}>Founded Year</Label>
              <ThemedInput value={organization?.founded_year || ""} disabled className="opacity-60" />
            </div>

            <div className="grid gap-2">
              <Label className={`${getTextColor()} font-medium`}>Colony Status</Label>
              <ThemedInput
                value={organization?.is_colony ? "Colony" : "Active Chapter"}
                disabled
                className="opacity-60"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className={getTextColor()}>Feature Toggles</CardTitle>
            <CardDescription className={getSecondaryTextColor()}>
              Enable or disable features for your chapter members. Changes will take effect immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="events" className={getTextColor()}>
                  Events
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>Allow members to view and manage chapter events</p>
              </div>
              <Checkbox
                id="events"
                checked={features.events}
                onCheckedChange={(checked) => handleFeatureToggle("events", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="study" className={getTextColor()}>
                  Study
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>
                  Enable study session tracking and location management
                </p>
              </div>
              <Checkbox
                id="study"
                checked={features.study}
                onCheckedChange={(checked) => handleFeatureToggle("study", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="tasks" className={getTextColor()}>
                  Tasks
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>Allow task creation and assignment for members</p>
              </div>
              <Checkbox
                id="tasks"
                checked={features.tasks}
                onCheckedChange={(checked) => handleFeatureToggle("tasks", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="library" className={getTextColor()}>
                  Library
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>Enable document and file sharing library</p>
              </div>
              <Checkbox
                id="library"
                checked={features.library}
                onCheckedChange={(checked) => handleFeatureToggle("library", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="messages" className={getTextColor()}>
                  Messages
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>Allow direct messaging and group chats</p>
              </div>
              <Checkbox
                id="messages"
                checked={features.messages}
                onCheckedChange={(checked) => handleFeatureToggle("messages", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="announcements" className={getTextColor()}>
                  Announcements
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>Enable chapter-wide announcements and news</p>
              </div>
              <Checkbox
                id="announcements"
                checked={features.announcements}
                onCheckedChange={(checked) => handleFeatureToggle("announcements", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pledgeSystem" className={getTextColor()}>
                  Pledge/New Member System
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>
                  Enable restricted access for new members until activated
                </p>
              </div>
              <Checkbox
                id="pledgeSystem"
                checked={features.pledgeSystem}
                onCheckedChange={(checked) => handleFeatureToggle("pledgeSystem", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="gym" className={getTextColor()}>
                  Gym
                </Label>
                <p className={`text-sm ${getSecondaryTextColor()}`}>
                  Enable gym session tracking and fitness monitoring
                </p>
              </div>
              <Checkbox
                id="gym"
                checked={features.gym}
                onCheckedChange={(checked) => handleFeatureToggle("gym", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Group Owner Actions */}
        {isGroupOwner(user) && (
          <Card className="glass-card border-amber-500/30">
            <CardHeader>
              <CardTitle className={`${getTextColor()} flex items-center gap-2`}>
                <Crown className="h-5 w-5 text-amber-400" />
                Group Owner Actions
              </CardTitle>
              <CardDescription className={getSecondaryTextColor()}>
                These actions are only available to the Group Owner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className={getTextColor()}>Transfer Ownership</Label>
                  <p className={`text-sm ${getSecondaryTextColor()}`}>
                    Transfer Group Owner privileges to another member
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setTransferOwnershipDialogOpen(true)}
                  className="bg-amber-600/20 border-amber-500/30 text-amber-300 hover:bg-amber-600/30"
                  disabled={members.length === 0}
                >
                  Transfer
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className={`${getTextColor()} text-red-400`}>Delete Organization</Label>
                  <p className={`text-sm ${getSecondaryTextColor()}`}>
                    Permanently delete this organization and all its data
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOrganizationDialogOpen(true)}
                  className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Ownership Dialog */}
        <Dialog open={transferOwnershipDialogOpen} onOpenChange={setTransferOwnershipDialogOpen}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Transfer Ownership</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                Select a member to transfer Group Owner privileges to. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className={getTextColor()}>Select New Owner</Label>
                <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                  <SelectTrigger className="glass-card-inner">
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTransferOwnershipDialogOpen(false)
                  setSelectedNewOwner("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferOwnership}
                disabled={!selectedNewOwner}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Transfer Ownership
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Organization Dialog */}
        <Dialog open={deleteOrganizationDialogOpen} onOpenChange={setDeleteOrganizationDialogOpen}>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle className={`${getTextColor()} text-red-400`}>Delete Organization</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                This action cannot be undone. This will permanently delete your organization and all associated data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className={getTextColor()}>Type "{organization?.name}" to confirm deletion</Label>
                <ThemedInput
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  placeholder={organization?.name}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteOrganizationDialogOpen(false)
                  setConfirmDeleteText("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteOrganization}
                disabled={confirmDeleteText !== organization?.name}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delete Organization
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeWrapper>
  )
}
