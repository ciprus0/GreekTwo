"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { api } from "@/lib/supabase-api"
import { Settings, Users, Award, Calendar, BookOpen, MessageSquare, Megaphone, CheckSquare, Library, Dumbbell, Clock, Plus, X, Palette, Crown, AlertTriangle, Mail } from "lucide-react"
import { QRCodeSVG } from 'qrcode.react'

export default function ChapterSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [showDeleteRoleDialog, setShowDeleteRoleDialog] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<any>(null)
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false)
  const [newRole, setNewRole] = useState({ name: "", color: "#3b82f6", isAdmin: false })
  
  // Organization settings
  const [orgSettings, setOrgSettings] = useState({
    roles: [
      { id: "group_owner", name: "Group Owner", color: "#7c3aed", isAdmin: true, isDefault: true },
      { id: "president", name: "President", color: "#dc2626", isAdmin: true, isDefault: true },
      { id: "treasurer", name: "Treasurer", color: "#059669", isAdmin: false, isDefault: true },
      { id: "active", name: "Active", color: "#2563eb", isAdmin: false, isDefault: true },
      { id: "new_member", name: "New Member", color: "#f59e0b", isAdmin: false, isDefault: true }
    ],
    features: {
      gym: true,
      hours: true,
      polls: true,
      study: true,
      tasks: true,
      events: true,
      library: true,
      messages: true,
      pledgeSystem: true,
      announcements: true
    },
    requirements: {
      gym: 0,
      study: 0,
      housePoints: 0
    },
    trackingSystem: "housePoints" as "housePoints" | "hours",
    pledgeExemption: false,
    pledgeExemptions: {
      study: false,
      tasks: false,
      events: false,
      library: false,
      messages: false,
      announcements: false
    }
  })

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses, getInputClasses, getDialogClasses } = useTextColors()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData()
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        window.location.href = '/login'
        return
      }
      
      const user = JSON.parse(userStr)
      console.log('User object:', user) // Debug log
      setUserProfile(user)

      // Get organization ID from user metadata (like mobile app)
      const organizationId = user.user_metadata?.organization_id || user.organizationId || user.organization_id
      
      if (!organizationId) {
        console.error('No organization ID found')
        toast({
          title: "Error",
          description: "No organization found",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Load organization data
      const org = await api.getOrganizationById(organizationId)
      if (org?.features && typeof org.features === 'object') {
        // Parse features from JSONB with fallback (like mobile app)
        if (org.features.roles && org.features.features) {
          // This is the entire customization object
          setOrgSettings({
            roles: org.features.roles,
            features: org.features.features,
            requirements: org.features.requirements,
            trackingSystem: org.features.trackingSystem,
            pledgeExemption: org.features.pledgeExemption,
            pledgeExemptions: org.features.pledgeExemptions
          })
        } else if (org.features.roles && !org.features.features) {
          // This is the old format where roles were stored separately
          setOrgSettings(prev => ({
            ...prev,
            roles: org.features.roles
          }))
        } else {
          // This is just a features object
          setOrgSettings(prev => ({
            ...prev,
            features: { ...prev.features, ...org.features }
          }))
        }
      }
      
      // Load members for role management
      const membersList = await api.getMembersByOrganization(organizationId)
      setMembers(membersList)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load chapter settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = () => {
    if (!userProfile?.roles) return false
    const roles = Array.isArray(userProfile.roles) ? userProfile.roles : userProfile.roles.split(',').map((r: string) => r.trim())
    return roles.some(role => 
      role.toLowerCase().includes('admin') || 
      role.toLowerCase().includes('president') || 
      role.toLowerCase().includes('owner')
    )
  }

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setOrgSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: enabled
      }
    }))
  }

  const handleRequirementChange = (type: string, value: number) => {
    setOrgSettings(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [type]: value
      }
    }))
  }

  const handleTrackingSystemChange = (system: "housePoints" | "hours") => {
    setOrgSettings(prev => ({
      ...prev,
      trackingSystem: system
    }))
  }

  const handlePledgeExemptionToggle = (exemption: string, enabled: boolean) => {
    setOrgSettings(prev => ({
      ...prev,
      pledgeExemptions: {
        ...prev.pledgeExemptions,
        [exemption]: enabled
      }
    }))
  }

  const addRole = () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a role name",
        variant: "destructive",
      })
      return
    }

    const roleId = newRole.name.toLowerCase().replace(/\s+/g, '_')
    const roleExists = orgSettings.roles.some(role => role.id === roleId)
    
    if (roleExists) {
      toast({
        title: "Error",
        description: "A role with this name already exists",
        variant: "destructive",
      })
      return
    }

    setOrgSettings(prev => ({
      ...prev,
      roles: [...prev.roles, {
        id: roleId,
        name: newRole.name,
        color: newRole.color,
        isAdmin: newRole.isAdmin,
        isDefault: false
      }]
    }))

    setNewRole({ name: "", color: "#3b82f6", isAdmin: false })
    setShowAddRoleDialog(false)
    
    toast({
      title: "Success",
      description: "Role added successfully",
    })
  }

  const deleteRole = () => {
    if (!roleToDelete) return

    if (roleToDelete.isDefault) {
      toast({
        title: "Error",
        description: "Cannot delete default roles",
        variant: "destructive",
      })
      return
    }

    setOrgSettings(prev => ({
      ...prev,
      roles: prev.roles.filter(role => role.id !== roleToDelete.id)
    }))

    setRoleToDelete(null)
    setShowDeleteRoleDialog(false)
    
    toast({
      title: "Success",
      description: "Role deleted successfully",
    })
  }

  const saveSettings = async () => {
    try {
      // Get organization ID from user metadata (like mobile app)
      const organizationId = userProfile?.user_metadata?.organization_id || userProfile?.organizationId || userProfile?.organization_id
      
      if (!organizationId) {
        toast({
          title: "Error",
          description: "No organization found",
          variant: "destructive",
        })
        return
      }

      // Save the entire customization object to the features column (like mobile app)
      await api.updateOrganization(organizationId, {
        features: orgSettings // Save the entire customization object
      })
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'} flex items-center justify-center p-4`}>
        <div className={getTextColor()}>Loading chapter settings...</div>
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'} flex items-center justify-center p-4`}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className={`text-xl font-semibold ${getTextColor()}`}>Access Denied</h2>
          <p className="text-gray-500">You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>Chapter Settings</h1>
            <p className={`text-lg ${getTextColor()}`}>Manage your organization's settings and features</p>
            {organization && (
              <div className="mt-2">
                <p className={`text-sm ${getSecondaryTextColor()}`}>
                  <strong>Group ID:</strong> {organization.id}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <InviteMembersButton organization={organization} />
            <Button onClick={saveSettings} className={getButtonClasses()}>
              Save Settings
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Features */}
          <Card className={getCardClasses()}>
            <CardHeader>
              <CardTitle className={getTextColor()}>Features</CardTitle>
              <CardDescription className={getTextColor()}>
                Enable or disable features for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orgSettings.features && Object.entries(orgSettings.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {feature === 'gym' && <Dumbbell className="h-5 w-5" />}
                    {feature === 'hours' && <Clock className="h-5 w-5" />}
                    {feature === 'polls' && <MessageSquare className="h-5 w-5" />}
                    {feature === 'study' && <BookOpen className="h-5 w-5" />}
                    {feature === 'tasks' && <CheckSquare className="h-5 w-5" />}
                    {feature === 'events' && <Calendar className="h-5 w-5" />}
                    {feature === 'library' && <Library className="h-5 w-5" />}
                    {feature === 'messages' && <MessageSquare className="h-5 w-5" />}
                    {feature === 'pledgeSystem' && <Award className="h-5 w-5" />}
                    {feature === 'announcements' && <Megaphone className="h-5 w-5" />}
                    <Label className={getTextColor()}>
                      {feature === 'hours' && orgSettings.trackingSystem === 'housePoints' 
                        ? 'House Points' 
                        : feature.charAt(0).toUpperCase() + feature.slice(1).replace(/([A-Z])/g, ' $1')
                      }
                    </Label>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleFeatureToggle(feature, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tracking System */}
          <Card className={getCardClasses()}>
            <CardHeader>
              <CardTitle className={getTextColor()}>Tracking System</CardTitle>
              <CardDescription className={getTextColor()}>
                Choose between Hours or House Points tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className={getTextColor()}>System Type</Label>
                <Select
                  value={orgSettings.trackingSystem}
                  onValueChange={(value: "housePoints" | "hours") => handleTrackingSystemChange(value)}
                >
                  <SelectTrigger className={getInputClasses()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="housePoints">House Points</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={getTextColor()}>Requirements</Label>
                <div className="space-y-2 mt-2">
                  {orgSettings.trackingSystem === 'housePoints' ? (
                    <div>
                      <Label className="text-sm">House Points Required</Label>
                      <Input
                        type="number"
                        value={orgSettings.requirements.housePoints}
                        onChange={(e) => handleRequirementChange('housePoints', parseInt(e.target.value) || 0)}
                        className={getInputClasses()}
                        min="0"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm">Gym Hours Required</Label>
                        <Input
                          type="number"
                          value={orgSettings.requirements.gym}
                          onChange={(e) => handleRequirementChange('gym', parseInt(e.target.value) || 0)}
                          className={getInputClasses()}
                          min="0"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Study Hours Required</Label>
                        <Input
                          type="number"
                          value={orgSettings.requirements.study}
                          onChange={(e) => handleRequirementChange('study', parseInt(e.target.value) || 0)}
                          className={getInputClasses()}
                          min="0"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles */}
          <Card className={getCardClasses()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={getTextColor()}>Roles</CardTitle>
                  <CardDescription className={getTextColor()}>
                    Manage member roles and permissions
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRoleDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {orgSettings.roles && orgSettings.roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <div>
                      <div className={`font-medium ${getTextColor()}`}>{role.name}</div>
                      <div className="text-sm text-gray-500">
                        {role.isAdmin ? 'Admin' : 'Member'} {role.isDefault && '(Default)'}
                      </div>
                    </div>
                  </div>
                  {!role.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRoleToDelete(role)
                        setShowDeleteRoleDialog(true)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pledge Exemptions */}
          <Card className={getCardClasses()}>
            <CardHeader>
              <CardTitle className={getTextColor()}>Pledge Exemptions</CardTitle>
              <CardDescription className={getTextColor()}>
                Configure pledge exemptions for different activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orgSettings.pledgeExemptions && Object.entries(orgSettings.pledgeExemptions).map(([exemption, enabled]) => (
                <div key={exemption} className="flex items-center justify-between">
                  <Label className={getTextColor()}>
                    {exemption.charAt(0).toUpperCase() + exemption.slice(1).replace(/([A-Z])/g, ' $1')}
                  </Label>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handlePledgeExemptionToggle(exemption, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Add Role Dialog */}
        <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
          <DialogContent className={getDialogClasses()}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Add New Role</DialogTitle>
              <DialogDescription className={getTextColor()}>
                Create a new role for your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName" className={getTextColor()}>Role Name</Label>
                <Input
                  id="roleName"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className={getInputClasses()}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <Label htmlFor="roleColor" className={getTextColor()}>Color</Label>
                <Input
                  id="roleColor"
                  type="color"
                  value={newRole.color}
                  onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                  className="h-10 w-20"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isAdmin"
                  checked={newRole.isAdmin}
                  onCheckedChange={(checked) => setNewRole({ ...newRole, isAdmin: checked })}
                />
                <Label htmlFor="isAdmin" className={getTextColor()}>
                  Admin privileges
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addRole} className={getButtonClasses()}>
                Add Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Role Dialog */}
        <Dialog open={showDeleteRoleDialog} onOpenChange={setShowDeleteRoleDialog}>
          <DialogContent className={getDialogClasses()}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Delete Role</DialogTitle>
              <DialogDescription className={getTextColor()}>
                Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteRoleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={deleteRole} variant="destructive">
                Delete Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// Invite Members Button Component
function InviteMembersButton({ organization }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const { theme } = useTheme()
  const { getTextColor, getSecondaryTextColor, getCardClasses, getButtonClasses } = useTextColors()
  const { toast } = useToast()

  const invitationUrl = organization ? `${window.location.origin}/register?org=${organization.group_id}` : ''
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl)
      toast({
        title: "Link Copied!",
        description: "Invitation link copied to clipboard",
      })
    } catch (err) {
      console.error('Failed to copy: ', err)
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleCloseDialog = () => {
    setShowInviteDialog(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-red-600/80 hover:bg-red-700/80 backdrop-blur-sm border border-red-500/30">
            <Plus className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={`${getCardClasses()} border-slate-700/50`} align="end">
          <DropdownMenuItem
            onClick={() => setShowInviteDialog(true)}
            className={`${getTextColor()} hover:bg-slate-700/30 cursor-pointer`}
          >
            <QRCodeSVG className="h-4 w-4 mr-2" />
            QR Code
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700/50" />
          <div className="px-2 py-1.5">
            <p className={`text-xs ${getTextColor()} font-medium mb-1`}>Group ID</p>
            <p className={`text-xs ${getSecondaryTextColor()} font-mono bg-slate-700/30 px-2 py-1 rounded`}>
              {organization?.group_id || 'N/A'}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-slate-700/50" />
          <div className="px-2 py-1.5">
            <p className={`text-xs ${getTextColor()} font-medium mb-1`}>Invitation Link</p>
            <div className="flex items-center gap-2">
              <Input
                value={invitationUrl}
                readOnly
                className="text-xs bg-slate-700/30 border-slate-600/50 text-white h-8"
              />
              <Button
                size="sm"
                onClick={copyToClipboard}
                className="bg-red-600/80 hover:bg-red-700/80 h-8 px-2"
              >
                Copy
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => setShowInviteDialog(open)}>
        <DialogContent className={`${getCardClasses()} border-slate-700/50 max-w-md`}>
          <DialogHeader>
            <DialogTitle className={getTextColor()}>Invite Members</DialogTitle>
            <DialogDescription className={getTextColor()}>
              Scan this QR code to join {organization?.name || 'the organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={invitationUrl} size={200} />
            </div>
            <div className="text-center">
              <p className={`text-sm ${getTextColor()} mb-2`}>Or share this link:</p>
              <div className="flex items-center gap-2">
                <Input
                  value={invitationUrl}
                  readOnly
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                />
                <Button
                  size="sm"
                  onClick={copyToClipboard}
                  className="bg-red-600/80 hover:bg-red-700/80"
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-600/50"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
