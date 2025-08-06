"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CustomAvatar } from "@/components/ui/custom-avatar"
import { api, type Member, type Organization } from "@/lib/supabase-api"
import { useToast } from "@/components/ui/use-toast"
import {
  Search,
  Check,
  X,
  Users,
  MoreVertical,
  Plus,
  UserCheck,
  UserX,
  Trash2,
  Crown,
  Shield,
  User,
  Clock,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  Award,
} from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { QRCodeSVG } from 'qrcode.react'

interface ExtendedMember extends Member {
  roles?: string[]
  total_hours?: number
  study_hours?: number
  service_hours?: number
  chapter_hours?: number
}

interface OrganizationRole {
  id: string
  name: string
  isDefault: boolean
  color: string
  isAdmin: boolean
}

const DEFAULT_ROLES = [
  { id: "group_owner", name: "Group Owner", color: "#7c3aed", isDefault: true, isAdmin: true },
  { id: "president", name: "President", color: "#dc2626", isDefault: true, isAdmin: true },
  { id: "treasurer", name: "Treasurer", color: "#059669", isDefault: true, isAdmin: true },
  { id: "active", name: "Active", color: "#2563eb", isDefault: true, isAdmin: false },
  { id: "new_member", name: "New Member", color: "#f59e0b", isDefault: true, isAdmin: false },
]

export default function MembersPage() {
  const [members, setMembers] = useState<ExtendedMember[]>([])
  const [pendingMembers, setPendingMembers] = useState<ExtendedMember[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [user, setUser] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState<ExtendedMember | null>(null)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false)
  const [memberDetailsDialogOpen, setMemberDetailsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<OrganizationRole | null>(null)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleColor, setNewRoleColor] = useState("#64748b")
  const [newRoleIsAdmin, setNewRoleIsAdmin] = useState(false)

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getSecondaryTextColor, getMutedTextColor } = useTextColors()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.organizationId) return

      try {
        setLoading(true)

        // Fetch organization data to get roles
        const orgData = await api.getOrganizationById(user.organizationId)
        setOrganization(orgData)

        // Fetch all members
        const membersList = await api.getMembersByOrganization(user.organizationId)

        // Separate approved and pending members
        const approved = membersList.filter((member) => member.approved)
        const pending = membersList.filter((member) => !member.approved)

        // Assign default "New Member" role to members without roles and fetch hours data
        const membersWithRoles = await Promise.all(
          approved.map(async (member) => {
            try {
              // Fetch hours data for each member
              const hoursData = await api.getMemberHours(member.id)
              const totalHours = hoursData.reduce((sum, hour) => sum + hour.hours, 0)
              const studyHours = hoursData.filter((h) => h.type === "study").reduce((sum, hour) => sum + hour.hours, 0)
              const serviceHours = hoursData
                .filter((h) => h.type === "service")
                .reduce((sum, hour) => sum + hour.hours, 0)
              const chapterHours = hoursData
                .filter((h) => h.type === "chapter")
                .reduce((sum, hour) => sum + hour.hours, 0)

              return {
                ...member,
                roles: member.roles && member.roles.length > 0 ? member.roles : ["New Member"],
                total_hours: totalHours,
                study_hours: studyHours,
                service_hours: serviceHours,
                chapter_hours: chapterHours,
              }
            } catch (error) {
              console.error(`Error fetching hours for member ${member.id}:`, error)
              return {
                ...member,
                roles: member.roles && member.roles.length > 0 ? member.roles : ["New Member"],
                total_hours: 0,
                study_hours: 0,
                service_hours: 0,
                chapter_hours: 0,
              }
            }
          }),
        )

        setMembers(membersWithRoles)
        setPendingMembers(pending)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load members data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user, toast])

  const handleApproveMember = async (memberId: string) => {
    try {
      await api.updateMember(memberId, { approved: true, roles: ["New Member"] })

      // Move member from pending to approved
      const member = pendingMembers.find((m) => m.id === memberId)
      if (member) {
        setPendingMembers((prev) => prev.filter((m) => m.id !== memberId))
        setMembers((prev) => [...prev, { ...member, approved: true, roles: ["New Member"] }])
      }

      toast({
        title: "Success",
        description: "Member approved successfully",
      })
    } catch (error) {
      console.error("Error approving member:", error)
      toast({
        title: "Error",
        description: "Failed to approve member",
        variant: "destructive",
      })
    }
  }

  const handleRejectMember = async (memberId: string) => {
    try {
      await api.deleteMember(memberId)
      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId))

      toast({
        title: "Success",
        description: "Member rejected successfully",
      })
    } catch (error) {
      console.error("Error rejecting member:", error)
      toast({
        title: "Error",
        description: "Failed to reject member",
        variant: "destructive",
      })
    }
  }

  const handleAddRole = async (memberId: string, roleName: string) => {
    try {
      const member = members.find((m) => m.id === memberId)
      if (!member) return

      const currentRoles = member.roles || []
      if (currentRoles.includes(roleName)) return

      const updatedRoles = [...currentRoles, roleName]
      await api.updateMember(memberId, { roles: updatedRoles })

      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, roles: updatedRoles } : m)))

      toast({
        title: "Success",
        description: `Role "${roleName}" added to ${member.name}`,
      })
    } catch (error) {
      console.error("Error adding role:", error)
      toast({
        title: "Error",
        description: "Failed to add role",
        variant: "destructive",
      })
    }
  }

  const handleRemoveRole = async (memberId: string, roleName: string) => {
    try {
      const member = members.find((m) => m.id === memberId)
      if (!member) return

      const currentRoles = member.roles || []

      // Don't allow removing the last role - member must have at least one role
      if (currentRoles.length <= 1) {
        toast({
          title: "Error",
          description: "Members must have at least one role",
          variant: "destructive",
        })
        return
      }

      const updatedRoles = currentRoles.filter((role) => role !== roleName)
      await api.updateMember(memberId, { roles: updatedRoles })

      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, roles: updatedRoles } : m)))

      toast({
        title: "Success",
        description: `Role "${roleName}" removed from ${member.name}`,
      })
    } catch (error) {
      console.error("Error removing role:", error)
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      })
    }
  }

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return

    try {
      const newRole = {
        id: Date.now().toString(),
        name: newRoleName.trim(),
        color: newRoleColor,
        isDefault: false,
        isAdmin: newRoleIsAdmin,
      }

      const updatedRoles = [...(organization?.roles || []), newRole]
      await api.updateOrganization(user.organizationId, { roles: updatedRoles })

      setOrganization((prev) => (prev ? { ...prev, roles: updatedRoles } : null))
      setCreateRoleDialogOpen(false)
      setNewRoleName("")
      setNewRoleColor("#64748b")
      setNewRoleIsAdmin(false)

      toast({
        title: "Success",
        description: `Role "${newRoleName}" created successfully`,
      })
    } catch (error) {
      console.error("Error creating role:", error)
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    // Protect default roles
    if (["Group Owner", "President", "Treasurer", "Active", "New Member"].includes(roleName)) {
      toast({
        title: "Error",
        description: "Cannot delete default roles",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedRoles = organization?.roles?.filter((r) => r.id !== roleId) || []
      await api.updateOrganization(user.organizationId, { roles: updatedRoles })

      // Remove this role from all members who have it
      const updatedMembers = members.map((member) => ({
        ...member,
        roles: member.roles?.filter((role) => role !== roleName) || ["New Member"],
      }))

      setOrganization((prev) => (prev ? { ...prev, roles: updatedRoles } : null))
      setMembers(updatedMembers)

      toast({
        title: "Success",
        description: `Role "${roleName}" deleted successfully`,
      })
    } catch (error) {
      console.error("Error deleting role:", error)
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      })
    }
  }

  const getRoleColor = (roleName: string) => {
    // Check organization roles first
    const orgRole = organization?.roles?.find((r) => r.name === roleName)
    if (orgRole) return orgRole.color

    // Default colors for built-in roles
    const defaultRole = DEFAULT_ROLES.find((r) => r.name === roleName)
    if (defaultRole) return defaultRole.color

    return "#64748b"
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case "Group Owner":
        return <Crown className="h-3 w-3" />
      case "President":
        return <Crown className="h-3 w-3" />
      case "Treasurer":
        return <Shield className="h-3 w-3" />
      case "Active":
        return <User className="h-3 w-3" />
      case "New Member":
        return <Clock className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  const getCardClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border-gray-200"
      case "light":
        return "bg-white/80 backdrop-blur-sm border-blue-200/50"
      case "dark":
      default:
        return "bg-slate-800/90 backdrop-blur-sm border-slate-700/50"
    }
  }

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

  const getTabClasses = () => {
    switch (theme) {
      case "original":
        return "bg-gray-50 border-gray-200"
      case "light":
        return "bg-blue-50/50 border-blue-200/50"
      case "dark":
      default:
        return "bg-slate-800/90 border-slate-700/50"
    }
  }

  // Check if user has admin permissions
  const isAdmin = (user) => {
    if (!user || !user.roles) return false
    return user.roles.some((role) => ["Group Owner", "President", "Treasurer"].includes(role))
  }

  // Check if user is Group Owner
  const isGroupOwner = (user) => {
    if (!user || !user.roles) return false
    return user.roles.includes("Group Owner")
  }

  const canManageMembers = isAdmin(user)

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredPendingMembers = pendingMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate member counts - only show Total, Active, New Members, and Pending (only for admins)
  const totalMembers = members.length
  const activeMembers = members.filter((m) => m.roles?.includes("Active")).length
  const newMembers = members.filter((m) => m.roles?.includes("New Member")).length

  // Get all available roles (default + custom)
  const allRoles = [
    ...DEFAULT_ROLES,
    ...(organization?.roles?.filter((r) => !DEFAULT_ROLES.some((dr) => dr.name === r.name)) || []),
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>Members</h1>
            <p className={`${getSecondaryTextColor()} mt-2`}>Manage your organization members</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className={getCardClasses()}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-300 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-300 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-300 rounded w-1/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${getTextColor()}`}>Members</h1>
          <p className={`${getSecondaryTextColor()} mt-2`}>Manage your organization members</p>
        </div>
        {canManageMembers && (
          <InviteMembersButton organization={organization} />
        )}
      </div>

      {/* Member Stats Banner - Show pending only for admins */}
      <div className={`grid gap-4 ${canManageMembers ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
        <Card className={getCardClasses()}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getTextColor()}`}>{totalMembers}</div>
            <div className={`text-sm ${getMutedTextColor()}`}>Total</div>
          </CardContent>
        </Card>
        <Card className={getCardClasses()}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold text-blue-400`}>{activeMembers}</div>
            <div className={`text-sm ${getMutedTextColor()}`}>Active</div>
          </CardContent>
        </Card>
        <Card className={getCardClasses()}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold text-yellow-400`}>{newMembers}</div>
            <div className={`text-sm ${getMutedTextColor()}`}>New Members</div>
          </CardContent>
        </Card>
        {canManageMembers && (
          <Card className={getCardClasses()}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold text-orange-400`}>{pendingMembers.length}</div>
              <div className={`text-sm ${getMutedTextColor()}`}>Pending</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className={`grid w-full ${canManageMembers ? "grid-cols-3" : "grid-cols-1"} ${getTabClasses()}`}>
          <TabsTrigger
            value="members"
            className={`data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 ${getTextColor()}`}
          >
            Members List ({members.length})
          </TabsTrigger>
          {canManageMembers && (
            <TabsTrigger
              value="roles"
              className={`data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 ${getTextColor()}`}
            >
              Manage Roles
            </TabsTrigger>
          )}
          {canManageMembers && (
            <TabsTrigger
              value="pending"
              className={`data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 ${getTextColor()}`}
            >
              Pending Approval ({pendingMembers.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Members List Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card className={getCardClasses()}>
            <CardContent className="p-4">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${getMutedTextColor()}`} />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${getInputClasses()}`}
                />
              </div>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50">
                  <TableHead className={getTextColor()}>Member</TableHead>
                  <TableHead className={getTextColor()}>Email</TableHead>
                  <TableHead className={getTextColor()}>Role</TableHead>
                  {canManageMembers && <TableHead className={getTextColor()}>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="border-slate-700/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <CustomAvatar src={member.profile_picture} name={member.name} className="h-8 w-8" />
                        <button
                          onClick={() => {
                            setSelectedMember(member)
                            setMemberDetailsDialogOpen(true)
                          }}
                          className={`font-medium ${getTextColor()} hover:text-red-400 transition-colors cursor-pointer`}
                        >
                          {member.name}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className={getSecondaryTextColor()}>{member.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.roles?.map((roleName) => (
                          <Badge
                            key={roleName}
                            className="text-xs border flex items-center gap-1"
                            style={{
                              backgroundColor: `${getRoleColor(roleName)}20`,
                              borderColor: `${getRoleColor(roleName)}50`,
                              color: getRoleColor(roleName),
                            }}
                          >
                            {getRoleIcon(roleName)}
                            {roleName}
                            {canManageMembers && (member.roles?.length || 0) > 1 && (
                              <button
                                onClick={() => handleRemoveRole(member.id, roleName)}
                                className="ml-1 hover:bg-red-500/20 rounded-full p-0.5"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${getTextColor()} hover:bg-slate-600/50`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className={`${getCardClasses()} border-slate-700/50`}
                            align="end"
                            side="bottom"
                            onCloseAutoFocus={(e) => e.preventDefault()}
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMember(member)
                                setRoleDialogOpen(true)
                              }}
                              className={`${getTextColor()} hover:bg-slate-700/30 cursor-pointer`}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700/50" />
                            <DropdownMenuItem
                              className="text-red-400 hover:bg-red-600/20 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Add remove member functionality here if needed
                              }}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {filteredMembers.length === 0 && (
            <Card className={getCardClasses()}>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className={`text-lg font-semibold ${getTextColor()} mb-2`}>No members found</h3>
                <p className={`${getSecondaryTextColor()}`}>
                  {searchTerm ? "Try adjusting your search" : "No approved members yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Manage Roles Tab - Only show for admins */}
        {canManageMembers && (
          <TabsContent value="roles" className="space-y-4">
            <Card className={getCardClasses()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className={getTextColor()}>Organization Roles</CardTitle>
                <Button
                  onClick={() => setCreateRoleDialogOpen(true)}
                  className="bg-red-600/80 hover:bg-red-700/80 backdrop-blur-sm border border-red-500/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Default Roles */}
                <div className="space-y-3">
                  <h4 className={`font-medium ${getTextColor()} mb-3`}>Default Roles</h4>
                  {DEFAULT_ROLES.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-700/50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role.name)}
                          <h4 className={`font-medium ${getTextColor()}`}>{role.name}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-slate-600/50 text-slate-300">
                            Default
                          </Badge>
                          {role.isAdmin && (
                            <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm ${getMutedTextColor()}`}>
                        {members.filter((m) => m.roles?.includes(role.name)).length} members
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Roles */}
                {organization?.roles && organization.roles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className={`font-medium ${getTextColor()} mb-3`}>Custom Roles</h4>
                    {organization.roles
                      .filter((role) => !DEFAULT_ROLES.some((dr) => dr.name === role.name))
                      .map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-slate-700/50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: role.color }} />
                            <div>
                              <h4 className={`font-medium ${getTextColor()}`}>{role.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                {role.isAdmin && (
                                  <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`text-sm ${getMutedTextColor()}`}>
                              {members.filter((m) => m.roles?.includes(role.name)).length} members
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(role.id, role.name)}
                              className="text-red-400 hover:bg-red-600/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Pending Approval Tab - Only show for admins */}
        {canManageMembers && (
          <TabsContent value="pending" className="space-y-4">
            <Card className={getCardClasses()}>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${getMutedTextColor()}`} />
                  <Input
                    placeholder="Search pending members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 ${getInputClasses()}`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={getCardClasses()}>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50">
                    <TableHead className={getTextColor()}>Member</TableHead>
                    <TableHead className={getTextColor()}>Email</TableHead>
                    <TableHead className={getTextColor()}>Join Date</TableHead>
                    <TableHead className={getTextColor()}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingMembers.map((member) => (
                    <TableRow key={member.id} className="border-slate-700/50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <CustomAvatar src={member.profile_picture} name={member.name} className="h-8 w-8" />
                          <span className={`font-medium ${getTextColor()}`}>{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className={getSecondaryTextColor()}>{member.email}</TableCell>
                      <TableCell className={getSecondaryTextColor()}>
                        {new Date(member.join_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveMember(member.id)}
                            className="bg-green-600/80 hover:bg-green-700/80 backdrop-blur-sm border border-green-500/30"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectMember(member.id)}
                            className="border-red-500/30 text-red-300 hover:bg-red-600/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {filteredPendingMembers.length === 0 && (
              <Card className={getCardClasses()}>
                <CardContent className="p-12 text-center">
                  <UserCheck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className={`text-lg font-semibold ${getTextColor()} mb-2`}>No pending approvals</h3>
                  <p className={`${getSecondaryTextColor()}`}>
                    {searchTerm ? "No pending members match your search" : "All members have been approved"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Member Details Dialog */}
      <Dialog open={memberDetailsDialogOpen} onOpenChange={setMemberDetailsDialogOpen}>
        <DialogContent className={`${getCardClasses()} border-slate-700/50 max-w-2xl`}>
          <DialogHeader>
            <DialogTitle className={`${getTextColor()} flex items-center gap-3`}>
              <CustomAvatar
                src={selectedMember?.profile_picture}
                name={selectedMember?.name || ""}
                className="h-12 w-12"
              />
              {selectedMember?.name}
            </DialogTitle>
            <DialogDescription className={getSecondaryTextColor()}>
              Detailed member information and statistics
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className={`font-semibold ${getTextColor()} flex items-center gap-2`}>
                    <User className="h-4 w-4" />
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className={getSecondaryTextColor()}>{selectedMember.email}</span>
                    </div>
                    {selectedMember.phone_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className={getSecondaryTextColor()}>{selectedMember.phone_number}</span>
                      </div>
                    )}
                    {selectedMember.major && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                        <span className={getSecondaryTextColor()}>{selectedMember.major}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className={getSecondaryTextColor()}>
                        Joined {new Date(selectedMember.join_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hours Statistics */}
                <div className="space-y-3">
                  <h4 className={`font-semibold ${getTextColor()} flex items-center gap-2`}>
                    <Award className="h-4 w-4" />
                    Hours Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <div className={`text-2xl font-bold ${getTextColor()}`}>{selectedMember.total_hours || 0}</div>
                      <div className={`text-xs ${getMutedTextColor()}`}>Total Hours</div>
                    </div>
                    <div className="bg-blue-600/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-400">{selectedMember.study_hours || 0}</div>
                      <div className={`text-xs ${getMutedTextColor()}`}>Study Hours</div>
                    </div>
                    <div className="bg-green-600/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{selectedMember.service_hours || 0}</div>
                      <div className={`text-xs ${getMutedTextColor()}`}>Service Hours</div>
                    </div>
                    <div className="bg-purple-600/20 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-400">{selectedMember.chapter_hours || 0}</div>
                      <div className={`text-xs ${getMutedTextColor()}`}>Chapter Hours</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <h4 className={`font-semibold ${getTextColor()}`}>Current Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMember.roles?.map((roleName) => (
                    <Badge
                      key={roleName}
                      className="text-sm border flex items-center gap-2"
                      style={{
                        backgroundColor: `${getRoleColor(roleName)}20`,
                        borderColor: `${getRoleColor(roleName)}50`,
                        color: getRoleColor(roleName),
                      }}
                    >
                      {getRoleIcon(roleName)}
                      {roleName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberDetailsDialogOpen(false)}
              className="bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-600/50"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className={`${getCardClasses()} border-slate-700/50`}>
          <DialogHeader>
            <DialogTitle className={getTextColor()}>Add Role to {selectedMember?.name}</DialogTitle>
            <DialogDescription className={getSecondaryTextColor()}>
              Select a role to add to this member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {allRoles.map((role) => {
              const hasRole = selectedMember?.roles?.includes(role.name)
              return (
                <Button
                  key={role.id}
                  variant="outline"
                  disabled={hasRole}
                  onClick={() => {
                    if (selectedMember) {
                      handleAddRole(selectedMember.id, role.name)
                      setRoleDialogOpen(false)
                    }
                  }}
                  className="w-full justify-start bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-600/50"
                >
                  <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: role.color }} />
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role.name)}
                    {role.name}
                  </div>
                  {hasRole && <Check className="h-4 w-4 ml-auto text-green-400" />}
                </Button>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              className="bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-600/50"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={createRoleDialogOpen} onOpenChange={setCreateRoleDialogOpen}>
        <DialogContent className={`${getCardClasses()} border-slate-700/50`}>
          <DialogHeader>
            <DialogTitle className={getTextColor()}>Create New Role</DialogTitle>
            <DialogDescription className={getSecondaryTextColor()}>
              Create a new role for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName" className={getTextColor()}>
                Role Name
              </Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter role name"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label htmlFor="roleColor" className={getTextColor()}>
                Role Color
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="roleColor"
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="w-16 h-10 bg-slate-700/50 border-slate-600/50"
                />
                <Input
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  placeholder="#64748b"
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={newRoleIsAdmin}
                onChange={(e) => setNewRoleIsAdmin(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-slate-700 border-slate-600 rounded focus:ring-red-500"
              />
              <Label htmlFor="isAdmin" className={getTextColor()}>
                Admin Permissions
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateRoleDialogOpen(false)
                setNewRoleName("")
                setNewRoleColor("#64748b")
                setNewRoleIsAdmin(false)
              }}
              className="bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-600/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim()}
              className="bg-red-600/80 hover:bg-red-700/80 backdrop-blur-sm border border-red-500/30"
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Invite Members Button Component
function InviteMembersButton({ organization }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const { theme } = useTheme()
  const { getTextColor, getSecondaryTextColor, getCardClasses, getButtonClasses } = useTextColors()

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
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
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
              onClick={() => setShowInviteDialog(false)}
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
