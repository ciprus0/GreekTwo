"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { BookOpen, Clock, Users, Plus, Trash, ArrowLeft, User, Settings } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/supabase-api"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"
import { useRouter } from "next/navigation"

export default function HoursPage() {
  const { toast } = useToast()
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState([])
  const [studyHours, setStudyHours] = useState(0)
  const [serviceHours, setServiceHours] = useState(0)
  const [chapterHours, setChapterHours] = useState(0)
  const [studyHoursGoal, setStudyHoursGoal] = useState(50)
  const [serviceHoursGoal, setServiceHoursGoal] = useState(40)
  const [chapterHoursGoal, setChapterHoursGoal] = useState(30)
  const [showAddHoursDialog, setShowAddHoursDialog] = useState(false)
  const [formData, setFormData] = useState({
    type: "service",
    date: "",
    hours: "",
    description: "",
  })

  const [pendingHours, setPendingHours] = useState([])
  const [allMemberHours, setAllMemberHours] = useState([])
  const [showAddMemberHoursDialog, setShowAddMemberHoursDialog] = useState(false)
  const [memberHoursForm, setMemberHoursForm] = useState({
    memberId: "",
    type: "service",
    date: "",
    hours: "",
    description: "",
  })
  const [allMembers, setAllMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberHoursSummary, setMemberHoursSummary] = useState([])

  // Requirements management
  const [hourRequirements, setHourRequirements] = useState([])
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false)
  const [showCreateRequirementDialog, setShowCreateRequirementDialog] = useState(false)
  const [newRequirement, setNewRequirement] = useState({
    type: "service",
    hoursRequired: 40,
    targetUsers: [],
    name: "",
    description: "",
  })
  const [selectedMembers, setSelectedMembers] = useState([])
  const [organization, setOrganization] = useState(null)

  const [currentUserStudySessions, setCurrentUserStudySessions] = useState([])
  const [orgStudySessions, setOrgStudySessions] = useState([]) // For admin view
  const [totalStudyHours, setTotalStudyHours] = useState(0)

  const { getTextColor, getSecondaryTextColor, getMutedTextColor } = useTextColors()
  const { theme } = useTheme()
  const router = useRouter()
  const mountedRef = useRef(true)

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
  const getButtonClasses = (variant: "default" | "outline" | "destructive") => {
    switch (theme) {
      case "original":
        switch (variant) {
          case "default":
            return "bg-red-700 hover:bg-red-800 text-white border-red-700"
          case "outline":
            return "border-red-700 text-red-700 hover:bg-red-700 hover:text-white bg-transparent"
          case "destructive":
            return "bg-red-600 hover:bg-red-700 text-white border-red-600"
          default:
            return "bg-red-700 hover:bg-red-800 text-white border-red-700"
        }
      case "light":
        switch (variant) {
          case "default":
            return "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
          case "outline":
            return "border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white bg-transparent"
          case "destructive":
            return "light-glass-button-destructive"
          default:
            return "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        }
      case "dark":
      default:
        switch (variant) {
          case "default":
            return "glass-button"
          case "outline":
            return "glass-button-outline bg-transparent"
          case "destructive":
            return "glass-button-destructive"
          default:
            return "glass-button"
        }
    }
  }

  const checkIsAdmin = (user) => {
    if (!user || !user.roles) return false
    const adminRoles = ["Group Owner", "President", "Treasurer"]
    return user.roles.some((role) => adminRoles.includes(role))
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user data
        const userData = localStorage.getItem("user")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          const adminRoles = ["Group Owner", "President", "Treasurer"]
          setIsAdmin(parsedUser.roles && parsedUser.roles.some((role) => adminRoles.includes(role)))

          if (parsedUser.organizationId) {
            // Load organization data
            const org = await api.getOrganizationById(parsedUser.organizationId)
            if (!mountedRef.current) return
            setOrganization(org)

            // Load hour requirements from organization
            const requirements = org?.hour_requirements || []
            setHourRequirements(requirements)

            // Find requirements for current user
            const userServiceReq = requirements.find(
              (req) =>
                req.type === "service" && (req.targetUsers.includes(parsedUser.id) || req.targetUsers.length === 0),
            )
            const userChapterReq = requirements.find(
              (req) =>
                req.type === "chapter" && (req.targetUsers.includes(parsedUser.id) || req.targetUsers.length === 0),
            )
            const userStudyReq = requirements.find(
              (req) =>
                req.type === "study" && (req.targetUsers.includes(parsedUser.id) || req.targetUsers.length === 0),
            )

            if (userServiceReq) setServiceHoursGoal(userServiceReq.hoursRequired)
            else setServiceHoursGoal(0)
            if (userChapterReq) setChapterHoursGoal(userChapterReq.hoursRequired)
            else setChapterHoursGoal(0)
            if (userStudyReq) setStudyHoursGoal(userStudyReq.hoursRequired)
            else setStudyHoursGoal(0)

            // Load hours data
            const userHours = await api.getHoursByUser(parsedUser.id, parsedUser.organizationId)
            if (!mountedRef.current) return
            setHours(userHours)

            // Load study sessions to calculate weekly study hours
            const userSessions = await api.getStudySessionsByUser(parsedUser.id, parsedUser.organizationId)
            if (!mountedRef.current) return

            // Calculate weekly study hours (current week only)
            const now = new Date()
            const startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay()) // Start of current week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0)

            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 7) // End of current week

            const weeklyStudySessions = userSessions.filter((session) => {
              const sessionDate = new Date(session.start_time)
              return sessionDate >= startOfWeek && sessionDate < endOfWeek && session.duration
            })

            const totalHours = weeklyStudySessions.reduce((total, session) => {
              return total + (session.duration || 0) / 3600
            }, 0)
            setTotalStudyHours(totalHours)

            // Calculate totals by type
            const serviceTotal = userHours
              .filter((h) => h.type === "service" && h.status === "approved")
              .reduce((total, h) => total + h.hours, 0)

            const chapterTotal = userHours
              .filter((h) => h.type === "chapter" && h.status === "approved")
              .reduce((total, h) => total + h.hours, 0)

            const studyTotal = userHours
              .filter((h) => h.type === "study" && h.status === "approved")
              .reduce((total, h) => total + h.hours, 0)

            if (!mountedRef.current) return
            setServiceHours(serviceTotal)
            setChapterHours(chapterTotal)
            setStudyHours(studyTotal)

            // Load pending hours for admin
            if (checkIsAdmin(parsedUser)) {
              const allHours = await api.getHoursByOrganization(parsedUser.organizationId)
              if (!mountedRef.current) return
              setPendingHours(allHours.filter((h) => h.status === "pending"))
              setAllMemberHours(allHours)

              // Load all members for admin view
              const members = await api.getMembersByOrganization(parsedUser.organizationId)
              if (!mountedRef.current) return
              const approvedMembers = members.filter((m) => m.approved)
              setAllMembers(approvedMembers)

              // Load all study sessions for the organization
              const orgSessions = await api.getStudySessionsByOrganization(parsedUser.organizationId)
              if (!mountedRef.current) return
              const completedOrgSessions = orgSessions.filter((s) => s.end_time && s.duration)
              setOrgStudySessions(completedOrgSessions)

              // Calculate member hours summary with correct weekly study hours calculation
              const summary = approvedMembers.map((member) => {
                const memberHours = allHours.filter((h) => h.user_id === member.id && h.status === "approved")

                const serviceHours = memberHours
                  .filter((h) => h.type === "service")
                  .reduce((total, h) => total + h.hours, 0)
                const chapterHours = memberHours
                  .filter((h) => h.type === "chapter")
                  .reduce((total, h) => total + h.hours, 0)

                // Weekly manual study hours
                const now = new Date()
                const startOfWeek = new Date(now)
                startOfWeek.setDate(now.getDate() - now.getDay())
                startOfWeek.setHours(0, 0, 0, 0)
                const endOfWeek = new Date(startOfWeek)
                endOfWeek.setDate(startOfWeek.getDate() + 7)

                const memberManualStudyHours = memberHours
                  .filter((h) => {
                    if (h.type !== "study") return false
                    const hourDate = new Date(h.date)
                    return hourDate >= startOfWeek && hourDate < endOfWeek
                  })
                  .reduce((total, h) => total + h.hours, 0)

                // Weekly session-based study hours
                const memberSessionDataSeconds = completedOrgSessions
                  .filter((s) => {
                    if (s.user_id !== member.id) return false
                    const sessionDate = new Date(s.start_time)
                    return sessionDate >= startOfWeek && sessionDate < endOfWeek
                  })
                  .reduce((total, session) => total + (session.duration || 0), 0)
                const memberSessionDataHours = memberSessionDataSeconds / 3600

                const studyHours = memberManualStudyHours + memberSessionDataHours

                return {
                  ...member,
                  serviceHours,
                  chapterHours,
                  studyHours,
                  totalHours: serviceHours + chapterHours + studyHours,
                }
              })
              if (!mountedRef.current) return
              setMemberHoursSummary(summary)
            }
          }
        } else {
          // Redirect to login if no user
          router.push("/login")
        }
      } catch (error) {
        console.error("Error loading hours data:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: "Failed to load hours data. Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadData()

    // Cleanup function
    return () => {
      mountedRef.current = false
    }
  }, [toast, router])

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

  const handleAddHours = async () => {
    if (!formData.date || !formData.hours || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const newHour = await api.createHour({
        user_id: user.id,
        user_name: user.name,
        type: formData.type,
        date: formData.date,
        hours: Number.parseFloat(formData.hours),
        description: formData.description,
        status: "pending",
        organization_id: user.organizationId,
      })

      // Add to hours
      setHours((prev) => [...prev, newHour])

      // Reset form
      setFormData({
        type: "service",
        date: "",
        hours: "",
        description: "",
      })
      setShowAddHoursDialog(false)

      toast({
        title: "Hours submitted",
        description: "Your hours have been submitted for approval.",
      })
    } catch (error) {
      console.error("Error adding hours:", error)
      toast({
        title: "Error",
        description: "Failed to submit hours. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleApproveHours = async (hourId) => {
    try {
      const updatedHour = await api.updateHour(hourId, { status: "approved" })

      // Update hours state
      setHours((prev) => prev.map((hour) => (hour.id === hourId ? updatedHour : hour)))

      // Update pending hours
      setPendingHours((prev) => prev.filter((h) => h.id !== hourId))

      // Update all member hours
      setAllMemberHours((prev) => prev.map((hour) => (hour.id === hourId ? updatedHour : hour)))

      // Recalculate totals if it's the current user's hour
      if (updatedHour.user_id === user.id) {
        if (updatedHour.type === "service") {
          setServiceHours((prev) => prev + updatedHour.hours)
        } else if (updatedHour.type === "chapter") {
          setChapterHours((prev) => prev + updatedHour.hours)
        }
      }

      toast({
        title: "Hours approved",
        description: "The hours have been approved successfully.",
      })
    } catch (error) {
      console.error("Error approving hours:", error)
      toast({
        title: "Error",
        description: "Failed to approve hours. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRejectHours = async (hourId) => {
    try {
      const updatedHour = await api.updateHour(hourId, { status: "rejected" })

      // Update hours state
      setHours((prev) => prev.map((hour) => (hour.id === hourId ? updatedHour : hour)))

      // Update pending hours
      setPendingHours((prev) => prev.filter((h) => h.id !== hourId))

      // Update all member hours
      setAllMemberHours((prev) => prev.map((hour) => (hour.id === hourId ? updatedHour : hour)))

      toast({
        title: "Hours rejected",
        description: "The hours have been rejected.",
      })
    } catch (error) {
      console.error("Error rejecting hours:", error)
      toast({
        title: "Error",
        description: "Failed to reject hours. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteHours = async (hourId) => {
    try {
      await api.deleteHour(hourId)

      // Update hours state
      setHours((prev) => prev.filter((hour) => hour.id !== hourId))

      // Update all member hours
      setAllMemberHours((prev) => prev.filter((hour) => hour.id !== hourId))

      // Update pending hours
      setPendingHours((prev) => prev.filter((h) => h.id !== hourId))

      toast({
        title: "Hours deleted",
        description: "The hours entry has been deleted.",
      })
    } catch (error) {
      console.error("Error deleting hours:", error)
      toast({
        title: "Error",
        description: "Failed to delete hours. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-500/20 text-green-300 border-green-500/30"
      case "rejected":
        return "bg-red-500/20 text-red-300 border-red-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30"
    }
  }

  const handleAddMemberHours = async () => {
    if (
      !memberHoursForm.memberId ||
      !memberHoursForm.date ||
      !memberHoursForm.hours ||
      !memberHoursForm.description.trim()
    ) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedMemberData = allMembers.find((m) => m.id === memberHoursForm.memberId)

      const newHour = await api.createHour({
        user_id: memberHoursForm.memberId,
        user_name: selectedMemberData?.name || "Unknown",
        type: memberHoursForm.type,
        date: memberHoursForm.date,
        hours: Number.parseFloat(memberHoursForm.hours),
        description: memberHoursForm.description,
        status: "approved", // Admin-added hours are auto-approved
        organization_id: user.organizationId,
        added_by: user.id,
        added_by_admin: true,
      })

      // Update state
      setAllMemberHours((prev) => [...prev, newHour])

      // Reset form
      setMemberHoursForm({
        memberId: "",
        type: "service",
        date: "",
        hours: "",
        description: "",
      })
      setShowAddMemberHoursDialog(false)

      toast({
        title: "Hours added",
        description: `Hours have been added for ${selectedMemberData?.name}.`,
      })

      // Update member hours summary
      const updatedSummary = memberHoursSummary.map((member) => {
        if (member.id === memberHoursForm.memberId) {
          const updatedMember = { ...member }
          const hoursToAdd = Number.parseFloat(memberHoursForm.hours)
          if (memberHoursForm.type === "service") {
            updatedMember.serviceHours += hoursToAdd
          } else if (memberHoursForm.type === "chapter") {
            updatedMember.chapterHours += hoursToAdd
          } else if (memberHoursForm.type === "study") {
            updatedMember.studyHours += hoursToAdd
          }
          updatedMember.totalHours = updatedMember.serviceHours + updatedMember.chapterHours + updatedMember.studyHours
          return updatedMember
        }
        return member
      })
      setMemberHoursSummary(updatedSummary)
    } catch (error) {
      console.error("Error adding member hours:", error)
      toast({
        title: "Error",
        description: "Failed to add hours. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMemberHours = async (hourId) => {
    try {
      await api.deleteHour(hourId)

      // Update state
      setAllMemberHours((prev) => prev.filter((h) => h.id !== hourId))
      setPendingHours((prev) => prev.filter((h) => h.id !== hourId))

      toast({
        title: "Hours removed",
        description: "The hours entry has been removed.",
      })
    } catch (error) {
      console.error("Error deleting member hours:", error)
      toast({
        title: "Error",
        description: "Failed to delete hours. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelectMember = (member) => {
    setSelectedMember(member)
  }

  const getMemberHours = (memberId) => {
    return allMemberHours.filter((h) => h.user_id === memberId).sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const handleCreateRequirement = async () => {
    if (!newRequirement.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a name for the requirement.",
        variant: "destructive",
      })
      return
    }

    try {
      const requirement = {
        id: Date.now().toString(),
        type: newRequirement.type,
        name: newRequirement.name,
        description: newRequirement.description,
        hoursRequired: Number.parseInt(newRequirement.hoursRequired) || 40,
        targetUsers: selectedMembers,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      }

      // Add to requirements
      const updatedRequirements = [...hourRequirements, requirement]
      setHourRequirements(updatedRequirements)

      // Update organization with new requirements
      await api.updateOrganization(organization.id, { hour_requirements: updatedRequirements })

      // Reset form
      setNewRequirement({
        type: "service",
        hoursRequired: 40,
        targetUsers: [],
        name: "",
        description: "",
      })
      setSelectedMembers([])

      toast({
        title: "Requirement Added",
        description: "The hour requirement has been added successfully.",
      })
    } catch (error) {
      console.error("Error creating requirement:", error)
      toast({
        title: "Error",
        description: "Failed to create requirement. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRequirement = async (requirementId) => {
    try {
      // Remove requirement
      const updatedRequirements = hourRequirements.filter((req) => req.id !== requirementId)
      setHourRequirements(updatedRequirements)

      // Update organization with new requirements
      await api.updateOrganization(organization.id, { hour_requirements: updatedRequirements })

      toast({
        title: "Requirement Deleted",
        description: "The hour requirement has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting requirement:", error)
      toast({
        title: "Error",
        description: "Failed to delete requirement. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Hours</h1>
            <p className={getSecondaryTextColor()}>Track and manage your chapter hour requirements.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddHoursDialog} onOpenChange={setShowAddHoursDialog}>
              <DialogTrigger asChild>
                <Button className={`${getButtonClasses("default")}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Hours
                </Button>
              </DialogTrigger>
              <DialogContent className={`${getCardClasses()} max-w-md`}>
                <DialogHeader>
                  <DialogTitle className={getTextColor()}>Log Hours</DialogTitle>
                  <DialogDescription className={getSecondaryTextColor()}>
                    Submit hours for approval by chapter administrators.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type" className={getTextColor()}>
                      Hour Type
                    </Label>
                    <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                      <SelectTrigger id="type" className={`${getCardClasses()} border-white/20`}>
                        <SelectValue placeholder="Select hour type" />
                      </SelectTrigger>
                      <SelectContent className={`${getCardClasses()} border-white/20`}>
                        <SelectItem value="service">Service Hours</SelectItem>
                        <SelectItem value="chapter">Chapter Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date" className={getTextColor()}>
                      Date
                    </Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className={`${getCardClasses()} border-white/20`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hours" className={getTextColor()}>
                      Hours
                    </Label>
                    <Input
                      id="hours"
                      name="hours"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g., 2.5"
                      value={formData.hours}
                      onChange={handleInputChange}
                      className={`${getCardClasses()} border-white/20`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description" className={getTextColor()}>
                      Description
                    </Label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      className={`${getCardClasses()} border-white/20 min-h-[80px] resize-none`}
                      placeholder="Describe the activity..."
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddHoursDialog(false)}
                    className={`${getButtonClasses("outline")}`}
                  >
                    Cancel
                  </Button>
                  <Button className={`${getButtonClasses("default")}`} onClick={handleAddHours}>
                    Submit Hours
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {checkIsAdmin(user) && (
              <Dialog open={showRequirementsDialog} onOpenChange={setShowRequirementsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className={`${getButtonClasses("outline")}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Requirements
                  </Button>
                </DialogTrigger>
                <DialogContent className={`${getCardClasses()} max-w-4xl max-h-[90vh] overflow-y-auto`}>
                  <DialogHeader>
                    <DialogTitle className={getTextColor()}>Hour Requirements</DialogTitle>
                    <DialogDescription className={getSecondaryTextColor()}>
                      Manage hour requirements for your chapter members.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {hourRequirements.length > 0 ? (
                      <div className="grid gap-4">
                        {hourRequirements.map((requirement) => (
                          <div key={requirement.id} className={`${getCardClasses()} p-4`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                                    requirement.type === "service"
                                      ? "bg-green-500/20 text-green-300 border-green-500/30"
                                      : requirement.type === "chapter"
                                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                        : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                  }`}
                                >
                                  {requirement.type.charAt(0).toUpperCase() + requirement.type.slice(1)}
                                </span>
                                <h3 className={`font-medium ${getTextColor()}`}>{requirement.name}</h3>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-sm ${getSecondaryTextColor()}`}>{requirement.hoursRequired} hours</span>
                                {checkIsAdmin(user) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                    onClick={() => handleDeleteRequirement(requirement.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {requirement.description && (
                              <p className={`text-sm ${getSecondaryTextColor()}`}>{requirement.description}</p>
                            )}
                            <div className={`text-xs ${getMutedTextColor()}`}>
                              Applies to: {requirement.targetUsers.length === 0 ? "All Members" : `${requirement.targetUsers.length} specific member(s)`}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${getSecondaryTextColor()}`}>No hour requirements set.</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setShowRequirementsDialog(false)
                        setTimeout(() => setShowCreateRequirementDialog(true), 100)
                      }}
                      className={`${getButtonClasses("default")}`}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Requirement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Hours Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className={`text-lg font-medium ${getTextColor()}`}>Study Hours (This Week)</CardTitle>
                <CardDescription className={getSecondaryTextColor()}>
                  {studyHoursGoal > 0
                    ? `${studyHours.toFixed(1)}/${studyHoursGoal} hours this week`
                    : "No weekly requirements set"}
                </CardDescription>
              </div>
              <BookOpen className="h-5 w-5 text-red-400" />
            </CardHeader>
            <CardContent>
              {studyHoursGoal > 0 ? (
                <>
                  <div className="glass-progress">
                    <div
                      className="glass-progress-fill"
                      style={{ width: `${Math.min(100, (studyHours / studyHoursGoal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {Math.min(100, ((studyHours / studyHoursGoal) * 100).toFixed(0))}% complete
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">Administrator needs to set study hour requirements</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className={`text-lg font-medium ${getTextColor()}`}>Service Hours</CardTitle>
                <CardDescription className={getSecondaryTextColor()}>
                  {serviceHoursGoal > 0
                    ? `${serviceHours.toFixed(1)}/${serviceHoursGoal} hours`
                    : "No requirements set"}
                </CardDescription>
              </div>
              <Users className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent>
              {serviceHoursGoal > 0 ? (
                <>
                  <div className="glass-progress">
                    <div
                      className="glass-progress-fill"
                      style={{ width: `${Math.min(100, (serviceHours / serviceHoursGoal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {Math.min(100, ((serviceHours / serviceHoursGoal) * 100).toFixed(0))}% complete
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">Administrator needs to set service hour requirements</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className={`text-lg font-medium ${getTextColor()}`}>Chapter Hours</CardTitle>
                <CardDescription className={getSecondaryTextColor()}>
                  {chapterHoursGoal > 0
                    ? `${chapterHours.toFixed(1)}/${chapterHoursGoal} hours`
                    : "No requirements set"}
                </CardDescription>
              </div>
              <Clock className="h-5 w-5 text-purple-400" />
            </CardHeader>
            <CardContent>
              {chapterHoursGoal > 0 ? (
                <>
                  <div className="glass-progress">
                    <div
                      className="glass-progress-fill"
                      style={{ width: `${Math.min(100, (chapterHours / chapterHoursGoal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {Math.min(100, ((chapterHours / chapterHoursGoal) * 100).toFixed(0))}% complete
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">Administrator needs to set chapter hour requirements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hours Table */}
        <Card className={getCardClasses()}>
          <CardHeader>
            <CardTitle className={getTextColor()}>Hours Log</CardTitle>
            <CardDescription className={getSecondaryTextColor()}>View and manage your submitted hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="my-hours">
              <TabsList className="glass-tabs mb-4">
                <TabsTrigger value="my-hours" className="glass-tab">
                  My Hours
                </TabsTrigger>
                {checkIsAdmin(user) && (
                  <TabsTrigger value="pending-approval" className="glass-tab">
                    Pending Approval ({pendingHours.length})
                  </TabsTrigger>
                )}
                {checkIsAdmin(user) && (
                  <TabsTrigger value="manage-hours" className="glass-tab">
                    Manage Hours
                  </TabsTrigger>
                )}
                {checkIsAdmin(user) && (
                  <TabsTrigger value="chapter-stats" className="glass-tab">
                    Chapter Stats
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="my-hours">
                <div className="glass-table-container">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className={getMutedTextColor()}>Date</TableHead>
                        <TableHead className={getMutedTextColor()}>Type</TableHead>
                        <TableHead className={getMutedTextColor()}>Hours</TableHead>
                        <TableHead className={getMutedTextColor()}>Description</TableHead>
                        <TableHead className={getMutedTextColor()}>Status</TableHead>
                        <TableHead className={`text-right ${getMutedTextColor()}`}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hours.length === 0 ? (
                        <TableRow className="border-white/10">
                          <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                            No hours logged yet. Click "Log Hours" to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        hours
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((hour) => (
                            <TableRow key={hour.id} className="border-white/10">
                              <TableCell className={getTextColor()}>{formatDate(hour.date)}</TableCell>
                              <TableCell className={`capitalize ${getTextColor()}`}>{hour.type}</TableCell>
                              <TableCell className={getTextColor()}>{hour.hours}</TableCell>
                              <TableCell className={`max-w-[200px] truncate ${getSecondaryTextColor()}`}>
                                {hour.description}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                                    hour.status === "approved"
                                      ? "bg-green-500/20 text-green-300 border-green-500/30"
                                      : hour.status === "pending"
                                        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                        : "bg-red-500/20 text-red-300 border-red-500/30"
                                  }`}
                                >
                                  {hour.status.charAt(0).toUpperCase() + hour.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {hour.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                    onClick={() => handleDeleteHours(hour.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {checkIsAdmin(user) && (
                <TabsContent value="pending-approval">
                  <div className="glass-table-container">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className={getMutedTextColor()}>Member</TableHead>
                          <TableHead className={getMutedTextColor()}>Date</TableHead>
                          <TableHead className={getMutedTextColor()}>Type</TableHead>
                          <TableHead className={getMutedTextColor()}>Hours</TableHead>
                          <TableHead className={getMutedTextColor()}>Description</TableHead>
                          <TableHead className={`text-right ${getMutedTextColor()}`}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingHours.length === 0 ? (
                          <TableRow className="border-white/10">
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                              No hours pending approval.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingHours.map((hour) => {
                            return (
                              <TableRow key={hour.id} className="border-white/10">
                                <TableCell className={getTextColor()}>{hour.user_name || "Unknown"}</TableCell>
                                <TableCell className={getTextColor()}>{formatDate(hour.date)}</TableCell>
                                <TableCell className={`capitalize ${getTextColor()}`}>{hour.type}</TableCell>
                                <TableCell className={getTextColor()}>{hour.hours}</TableCell>
                                <TableCell className={`max-w-[200px] truncate ${getSecondaryTextColor()}`}>
                                  {hour.description}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/30"
                                      onClick={() => handleApproveHours(hour.id)}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30"
                                      onClick={() => handleRejectHours(hour.id)}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              )}

              {checkIsAdmin(user) && (
                <TabsContent value="manage-hours">
                  <div className="space-y-4">
                    {!selectedMember ? (
                      // Member List View
                      <>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className={`text-lg font-medium ${getTextColor()}`}>Member Hours Overview</h3>
                            <p className={getSecondaryTextColor()}>Click on a member to view and manage their hours.</p>
                          </div>
                          <Dialog open={showAddMemberHoursDialog} onOpenChange={setShowAddMemberHoursDialog}>
                            <DialogTrigger asChild>
                              <Button className="glass-button">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Member Hours
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-dialog border-white/20">
                              <DialogHeader>
                                <DialogTitle className={getTextColor()}>Add Hours for Member</DialogTitle>
                                <DialogDescription className={getSecondaryTextColor()}>
                                  Add hours directly to a member's record.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="member" className={getTextColor()}>
                                    Member
                                  </Label>
                                  <Select
                                    value={memberHoursForm.memberId}
                                    onValueChange={(value) =>
                                      setMemberHoursForm({ ...memberHoursForm, memberId: value })
                                    }
                                  >
                                    <SelectTrigger className="glass-input">
                                      <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent className="glass-card border-white/20">
                                      {allMembers.map((member) => (
                                        <SelectItem key={member.id} value={member.id}>
                                          {member.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="type" className={getTextColor()}>
                                    Hour Type
                                  </Label>
                                  <Select
                                    value={memberHoursForm.type}
                                    onValueChange={(value) => setMemberHoursForm({ ...memberHoursForm, type: value })}
                                  >
                                    <SelectTrigger className="glass-input">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="glass-card border-white/20">
                                      <SelectItem value="service">Service Hours</SelectItem>
                                      <SelectItem value="chapter">Chapter Hours</SelectItem>
                                      <SelectItem value="study">Study Hours</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="date" className={getTextColor()}>
                                    Date
                                  </Label>
                                  <Input
                                    type="date"
                                    value={memberHoursForm.date}
                                    onChange={(e) => setMemberHoursForm({ ...memberHoursForm, date: e.target.value })}
                                    className="glass-input"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="hours" className={getTextColor()}>
                                    Hours
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={memberHoursForm.hours}
                                    onChange={(e) => setMemberHoursForm({ ...memberHoursForm, hours: e.target.value })}
                                    className="glass-input"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="description" className={getTextColor()}>
                                    Description
                                  </Label>
                                  <textarea
                                    className="glass-input min-h-[80px] resize-none"
                                    value={memberHoursForm.description}
                                    onChange={(e) =>
                                      setMemberHoursForm({ ...memberHoursForm, description: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowAddMemberHoursDialog(false)}
                                  className="glass-button-outline"
                                >
                                  Cancel
                                </Button>
                                <Button className="glass-button" onClick={handleAddMemberHours}>
                                  Add Hours
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="glass-table-container">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-white/10">
                                <TableHead className={getMutedTextColor()}>Member</TableHead>
                                <TableHead className={getMutedTextColor()}>Service Hours</TableHead>
                                <TableHead className={getMutedTextColor()}>Chapter Hours</TableHead>
                                <TableHead className={getMutedTextColor()}>Study Hours</TableHead>
                                <TableHead className={getMutedTextColor()}>Total Hours</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {memberHoursSummary.length === 0 ? (
                                <TableRow className="border-white/10">
                                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                    No members found. Add members to your organization first.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                memberHoursSummary.map((member) => (
                                  <TableRow
                                    key={member.id}
                                    className="cursor-pointer hover:bg-white/5 border-white/10"
                                    onClick={() => handleSelectMember(member)}
                                  >
                                    <TableCell className={`font-medium flex items-center gap-2 ${getTextColor()}`}>
                                      <User className="h-4 w-4" />
                                      {member.name}
                                    </TableCell>
                                    <TableCell className={getTextColor()}>{member.serviceHours.toFixed(1)}</TableCell>
                                    <TableCell className={getTextColor()}>{member.chapterHours.toFixed(1)}</TableCell>
                                    <TableCell className={getTextColor()}>{member.studyHours.toFixed(1)}</TableCell>
                                    <TableCell className={`font-medium ${getTextColor()}`}>
                                      {member.totalHours.toFixed(1)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      // Individual Member View
                      <>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMember(null)}
                              className="glass-button-outline"
                            >
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              Back to Members
                            </Button>
                            <div>
                              <h3 className={`text-lg font-medium ${getTextColor()}`}>{selectedMember.name}'s Hours</h3>
                              <p className={getSecondaryTextColor()}>
                                Total: {selectedMember.totalHours.toFixed(1)} hours
                              </p>
                            </div>
                          </div>
                          <Button
                            className="glass-button"
                            onClick={() => {
                              setMemberHoursForm({
                                memberId: selectedMember.id,
                                type: "service",
                                date: "",
                                hours: "",
                                description: "",
                              })
                              setShowAddMemberHoursDialog(true)
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Hours
                          </Button>
                        </div>

                        <div className="glass-table-container">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-white/10">
                                <TableHead className={getMutedTextColor()}>Date</TableHead>
                                <TableHead className={getMutedTextColor()}>Type</TableHead>
                                <TableHead className={getMutedTextColor()}>Hours</TableHead>
                                <TableHead className={getMutedTextColor()}>Description</TableHead>
                                <TableHead className={getMutedTextColor()}>Status</TableHead>
                                <TableHead className={`text-right ${getMutedTextColor()}`}>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getMemberHours(selectedMember.id).length === 0 ? (
                                <TableRow className="border-white/10">
                                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                    No hours found for this member.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                getMemberHours(selectedMember.id).map((hour) => (
                                  <TableRow key={hour.id} className="border-white/10">
                                    <TableCell className={getTextColor()}>{formatDate(hour.date)}</TableCell>
                                    <TableCell className={`capitalize ${getTextColor()}`}>{hour.type}</TableCell>
                                    <TableCell className={getTextColor()}>{hour.hours}</TableCell>
                                    <TableCell className={`max-w-[200px] truncate ${getSecondaryTextColor()}`}>
                                      {hour.description}
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${getStatusBadge(hour.status)}`}
                                      >
                                        {hour.status.charAt(0).toUpperCase() + hour.status.slice(1)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                        onClick={() => handleDeleteMemberHours(hour.id)}
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              )}

              {checkIsAdmin(user) && (
                <TabsContent value="chapter-stats">
                  <div className="space-y-6">
                    <div>
                      <h3 className={`text-lg font-medium ${getTextColor()}`}>Chapter Statistics</h3>
                      <p className={getSecondaryTextColor()}>
                        Overview of all chapter members' hour requirements and progress.
                      </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className={getCardClasses()}>
                        <CardHeader className="pb-2">
                          <CardTitle className={`text-sm font-medium ${getTextColor()}`}>Total Members</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${getTextColor()}`}>{memberHoursSummary.length}</div>
                        </CardContent>
                      </Card>

                      <Card className={getCardClasses()}>
                        <CardHeader className="pb-2">
                          <CardTitle className={`text-sm font-medium ${getTextColor()}`}>Total Service Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${getTextColor()}`}>
                            {memberHoursSummary.reduce((total, member) => total + member.serviceHours, 0).toFixed(1)}
                          </div>
                          <p className="text-xs text-slate-400">
                            Avg:{" "}
                            {memberHoursSummary.length > 0
                              ? (
                                  memberHoursSummary.reduce((total, member) => total + member.serviceHours, 0) /
                                  memberHoursSummary.length
                                ).toFixed(1)
                              : "0"}{" "}
                            per member
                          </p>
                        </CardContent>
                      </Card>

                      <Card className={getCardClasses()}>
                        <CardHeader className="pb-2">
                          <CardTitle className={`text-sm font-medium ${getTextColor()}`}>Total Chapter Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${getTextColor()}`}>
                            {memberHoursSummary.reduce((total, member) => total + member.chapterHours, 0).toFixed(1)}
                          </div>
                          <p className="text-xs text-slate-400">
                            Avg:{" "}
                            {memberHoursSummary.length > 0
                              ? (
                                  memberHoursSummary.reduce((total, member) => total + member.chapterHours, 0) /
                                  memberHoursSummary.length
                                ).toFixed(1)
                              : "0"}{" "}
                            per member
                          </p>
                        </CardContent>
                      </Card>

                      <Card className={getCardClasses()}>
                        <CardHeader className="pb-2">
                          <CardTitle className={`text-sm font-medium ${getTextColor()}`}>Total Study Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${getTextColor()}`}>
                            {memberHoursSummary.reduce((total, member) => total + member.studyHours, 0).toFixed(1)}
                          </div>
                          <p className="text-xs text-slate-400">
                            Avg:{" "}
                            {memberHoursSummary.length > 0
                              ? (
                                  memberHoursSummary.reduce((total, member) => total + member.studyHours, 0) /
                                  memberHoursSummary.length
                                ).toFixed(1)
                              : "0"}{" "}
                            per member
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top Performers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className={getCardClasses()}>
                        <CardHeader>
                          <CardTitle className={`text-sm ${getTextColor()}`}>Top Service Hours</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {memberHoursSummary
                            .sort((a, b) => b.serviceHours - a.serviceHours)
                            .slice(0, 5)
                            .map((member, index) => (
                              <div key={member.id} className="flex justify-between items-center">
                                <span className={`text-sm ${getSecondaryTextColor()}`}>
                                  {index + 1}. {member.name}
                                </span>
                                <span className={`text-sm font-medium ${getTextColor()}`}>
                                  {member.serviceHours.toFixed(1)}h
                                </span>
                              </div>
                            ))}
                        </CardContent>
                      </Card>

                      <Card className={getCardClasses()}>
                        <CardHeader>
                          <CardTitle className={`text-sm ${getTextColor()}`}>Top Chapter Hours</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {memberHoursSummary
                            .sort((a, b) => b.chapterHours - a.chapterHours)
                            .slice(0, 5)
                            .map((member, index) => (
                              <div key={member.id} className="flex justify-between items-center">
                                <span className={`text-sm ${getSecondaryTextColor()}`}>
                                  {index + 1}. {member.name}
                                </span>
                                <span className={`text-sm font-medium ${getTextColor()}`}>
                                  {member.chapterHours.toFixed(1)}h
                                </span>
                              </div>
                            ))}
                        </CardContent>
                      </Card>

                      <Card className={getCardClasses()}>
                        <CardHeader>
                          <CardTitle className={`text-sm ${getTextColor()}`}>Top Study Hours</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {memberHoursSummary
                            .sort((a, b) => b.studyHours - a.studyHours)
                            .slice(0, 5)
                            .map((member, index) => (
                              <div key={member.id} className="flex justify-between items-center">
                                <span className={`text-sm ${getSecondaryTextColor()}`}>
                                  {index + 1}. {member.name}
                                </span>
                                <span className={`text-sm font-medium ${getTextColor()}`}>
                                  {member.studyHours.toFixed(1)}h
                                </span>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Progress Overview */}
                    <Card className={getCardClasses()}>
                      <CardHeader>
                        <CardTitle className={getTextColor()}>Member Progress Overview</CardTitle>
                        <CardDescription className={getSecondaryTextColor()}>
                          See detailed breakdowns for each hour type.
                        </CardDescription>
                        <div className="flex gap-2 mb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/dashboard/hours/service-details")}
                            className={`${getButtonClasses("outline")}`}
                          >
                            View Service Hours Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/dashboard/hours/chapter-details")}
                            className={`${getButtonClasses("outline")}`}
                          >
                            View Chapter Hours Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/dashboard/hours/study-details")}
                            className={`${getButtonClasses("outline")}`}
                          >
                            View Study Hours Details
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Create Hour Requirements Dialog */}
        <Dialog open={showCreateRequirementDialog} onOpenChange={setShowCreateRequirementDialog}>
          <DialogContent className={`${getCardClasses()} max-w-md`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Create Hour Requirement</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                Set hour requirements for specific members or all members.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="requirement-type" className={getTextColor()}>
                  Hour Type
                </Label>
                <Select
                  value={newRequirement.type}
                  onValueChange={(value) => setNewRequirement({ ...newRequirement, type: value })}
                >
                  <SelectTrigger className={`${getCardClasses()} border-white/20`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`${getCardClasses()} border-white/20`}>
                    <SelectItem value="service">Service Hours</SelectItem>
                    <SelectItem value="chapter">Chapter Hours</SelectItem>
                    <SelectItem value="study">Study Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requirement-name" className={getTextColor()}>
                  Requirement Name
                </Label>
                <Input
                  id="requirement-name"
                  value={newRequirement.name}
                  onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })}
                  placeholder="e.g., Weekly Service Hours"
                  className={`${getCardClasses()} border-white/20`}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requirement-description" className={getTextColor()}>
                  Description (Optional)
                </Label>
                <Input
                  id="requirement-description"
                  value={newRequirement.description}
                  onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                  placeholder="e.g., Minimum service hours per week"
                  className={`${getCardClasses()} border-white/20`}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requirement-hours" className={getTextColor()}>
                  Hours Required
                </Label>
                <Input
                  id="requirement-hours"
                  type="number"
                  min="1"
                  max="100"
                  value={newRequirement.hoursRequired}
                  onChange={(e) => setNewRequirement({ ...newRequirement, hoursRequired: e.target.value })}
                  className={`${getCardClasses()} border-white/20`}
                />
              </div>
              <div className="grid gap-2">
                <Label className={getTextColor()}>Apply To</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all-members"
                    checked={selectedMembers.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMembers([])
                      }
                    }}
                    className="border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                  />
                  <Label htmlFor="all-members" className={getSecondaryTextColor()}>
                    All Members
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="specific-members"
                    checked={selectedMembers.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked && selectedMembers.length === 0) {
                        if (allMembers.length > 0) {
                          setSelectedMembers([allMembers[0].id])
                        }
                      }
                    }}
                    className="border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                  />
                  <Label htmlFor="specific-members" className={getSecondaryTextColor()}>
                    Specific Members
                  </Label>
                </div>

                {selectedMembers.length > 0 && (
                  <div className={`mt-2 ${getCardClasses()} border-white/10 p-2 max-h-40 overflow-y-auto`}>
                    {allMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`member-${member.id}`}
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMembers([...selectedMembers, member.id])
                            } else {
                              setSelectedMembers(selectedMembers.filter((id) => id !== member.id))
                            }
                          }}
                          className="border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                        />
                        <Label htmlFor={`member-${member.id}`} className={`text-sm ${getSecondaryTextColor()}`}>
                          {member.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateRequirementDialog(false)}
                className={`${getButtonClasses("outline")}`}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRequirement} className={`${getButtonClasses("default")}`}>
                Create Requirement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeWrapper>
  )
}


