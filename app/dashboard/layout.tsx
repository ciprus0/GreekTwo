"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  Award,
  Calendar,
  ChevronDown,
  Clock,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Users,
  CheckSquare,
  Menu,
  Megaphone,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Library,
  Dumbbell,
  Vote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomAvatar } from "@/components/ui/custom-avatar"
import { NotificationBell } from "@/components/notification-bell"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api, type Organization } from "@/lib/supabase-api"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"

function PendingApprovalScreen({ user, onRefresh }) {
  return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-100/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-amber-200/30">
            <Clock className="h-8 w-8 text-amber-300" />
          </div>
          <CardTitle className="text-xl text-white">Pending Approval</CardTitle>
          <CardDescription className="text-slate-300">
            Your account is waiting for approval from an administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              <strong className="text-white">Name:</strong> {user?.name}
            </p>
            <p className="text-sm text-slate-300">
              <strong className="text-white">Email:</strong> {user?.email}
            </p>
            <p className="text-sm text-slate-300">
              <strong className="text-white">Organization:</strong> {user?.chapter}
            </p>
          </div>
          <div className="p-4 bg-amber-500/10 backdrop-blur-sm rounded-lg border border-amber-200/20">
            <p className="text-sm text-amber-200">
              An administrator will review your request and approve your access to the platform. You'll receive an email
              notification once your account is approved.
            </p>
          </div>
          <Button
            onClick={onRefresh}
            className="w-full bg-red-600/80 hover:bg-red-700/80 backdrop-blur-sm border border-red-500/30"
          >
            Check Approval Status
          </Button>
          <p className="text-xs text-slate-400">
            If you have questions, please contact your organization administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const SidebarLink = ({ href, children, icon, isActive, title, sidebarCollapsed }) => {
  const { theme } = useTheme()

  const getSidebarLinkClasses = () => {
    const baseClasses = "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all"
    const collapsedClasses = sidebarCollapsed ? "justify-center" : ""

    if (isActive) {
      // Theme-aware active colors with proper text contrast
      switch (theme) {
        case "original":
          return `${baseClasses} bg-red-100 text-red-800 border border-red-200 shadow-sm ${collapsedClasses}`
        case "light":
          return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200 shadow-sm ${collapsedClasses}`
        case "dark":
        default:
          return `${baseClasses} bg-red-600/20 text-white border border-red-500/30 backdrop-blur-sm ${collapsedClasses}`
      }
    }

    // Theme-aware inactive colors
    switch (theme) {
      case "original":
        return `${baseClasses} text-gray-700 hover:bg-gray-100/50 hover:text-gray-900 border border-transparent hover:border-gray-200 hover:shadow-sm ${collapsedClasses}`
      case "light":
        return `${baseClasses} text-gray-700 hover:bg-blue-50 hover:text-gray-900 border border-transparent hover:border-blue-200/50 hover:shadow-sm ${collapsedClasses}`
      case "dark":
      default:
        return `${baseClasses} text-slate-300 hover:bg-white/10 hover:text-white border border-transparent ${collapsedClasses}`
    }
  }

  return (
    <Link href={href} className={getSidebarLinkClasses()} title={title}>
      {icon}
      {!sidebarCollapsed && children}
    </Link>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { theme } = useTheme()
  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()

  const fetchAndUpdateUserApproval = useCallback(async (currentUser) => {
    if (!currentUser || !currentUser.email || !(currentUser.organizationId || currentUser.organization_id)) {
      return currentUser
    }
    try {
      const orgId = currentUser.organizationId || currentUser.organization_id
      const members = await api.getMembersByOrganization(orgId)
      const dbUser = members.find((member) => member.email === currentUser.email)

      if (dbUser) {
        const updatedUser = {
          ...currentUser,
          approved: dbUser.approved || false,
          id: dbUser.id,
          profile_picture: dbUser.profile_picture,
          name: dbUser.name,
          pledge: dbUser.pledge || false,
          roles: dbUser.roles || ["New Member"], // Use roles array
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        return updatedUser
      }
    } catch (error) {
      console.error("DashboardLayout: Error verifying user data:", error)
    }
    return currentUser
  }, [])

  useEffect(() => {
    const initUser = async () => {
      setLoading(true)
      const isAuthenticated = localStorage.getItem("isAuthenticated")
      const userData = localStorage.getItem("user")

      if (!isAuthenticated || !userData) {
        console.warn("DashboardLayout: Missing localStorage auth data. Redirecting to /login. Pathname:", pathname)
        router.push("/login")
        return
      }

      let parsedUser = JSON.parse(userData)

      if (!parsedUser.approved) {
        parsedUser = await fetchAndUpdateUserApproval(parsedUser)
      }

      // Auto-approve Group Owners, Presidents, and Treasurers
      if (
        parsedUser.roles &&
        (parsedUser.roles.includes("Group Owner") ||
          parsedUser.roles.includes("President") ||
          parsedUser.roles.includes("Treasurer")) &&
        !parsedUser.approved
      ) {
        parsedUser.approved = true
        localStorage.setItem("user", JSON.stringify(parsedUser))
      }

      setUser(parsedUser)
      setLoading(false)
    }

    initUser()

    const savedSidebarState = localStorage.getItem("sidebarCollapsed")
    if (savedSidebarState) {
      setSidebarCollapsed(JSON.parse(savedSidebarState))
    }
  }, [router, fetchAndUpdateUserApproval, pathname])

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

  useEffect(() => {
    let interval
    if (user && !user.approved && (user.organizationId || user.organization_id)) {
      const checkApprovalStatusPeriodically = async () => {
        const updatedUser = await fetchAndUpdateUserApproval(user)
        if (updatedUser.approved && !user.approved) {
          setUser(updatedUser)
        }
      }
      interval = setInterval(checkApprovalStatusPeriodically, 30000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [user, fetchAndUpdateUserApproval])

  useEffect(() => {
    let interval
    if (user && user.approved && (user.organizationId || user.organization_id)) {
      const refreshUserData = async () => {
        const updatedUser = await fetchAndUpdateUserApproval(user)
        if (updatedUser && (updatedUser.profile_picture !== user.profile_picture || updatedUser.name !== user.name)) {
          setUser(updatedUser)
        }
      }
      interval = setInterval(refreshUserData, 5000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [user, fetchAndUpdateUserApproval])

  useEffect(() => {
    const loadOrganization = async () => {
      // Get organization ID from user metadata (like mobile app)
      const organizationId = user?.user_metadata?.organization_id || user?.organizationId
      if (organizationId) {
        const org = await api.getOrganizationById(organizationId)
        setOrganization(org)
      }
    }
    loadOrganization()
  }, [user])

  const handleRefreshStatus = async () => {
    if (user) {
      setLoading(true)
      const updatedUser = await fetchAndUpdateUserApproval(user)
      setUser(updatedUser)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/login")
  }

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState))
  }

  const handleMobileNavClick = () => {
    setMobileMenuOpen(false)
  }

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`)
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

  // Check if user is only a New Member
  const isOnlyNewMember = (user) => {
    if (!user || !user.roles) return false
    return user.roles.length === 1 && user.roles.includes("New Member")
  }

  // Check if pledge system is enabled
  const isPledgeSystemEnabled = () => {
    return organization?.features?.features?.pledgeSystem === true
  }

  const showFeature = (feature: string) => {
    // Chapter Settings is ONLY for admins
    if (feature === "Chapter Settings") {
      return isAdmin(user)
    }

    // Dashboard is always visible
    if (feature === "Dashboard") {
      return true
    }

    // Settings is always visible
    if (feature === "Settings") {
      return true
    }

    // Members is always visible (not a feature toggle)
    if (feature === "Members") {
      return true
    }

    // If user is only a New Member and pledge system is enabled
    if (isOnlyNewMember(user) && isPledgeSystemEnabled()) {
      // New members with pledge system can only see these features
      const allowedFeatures = ["Dashboard", "Study", "Tasks", "Announcements", "Settings"]
      return allowedFeatures.includes(feature)
    }

    // If user is only a New Member but pledge system is disabled
    if (isOnlyNewMember(user) && !isPledgeSystemEnabled()) {
      // New members without pledge system can see everything except Chapter Settings
      return feature !== "Chapter Settings"
    }

    // Feature mapping for all users
    const featureMap = {
      Events: "events",
      Study: "study",
      Tasks: "tasks",
      Library: "library",
      Messages: "messages",
      Announcements: "announcements",
      Gym: "gym",
      Polls: "polls",
      Hours: "hours",
    }

    const orgFeatureKey = featureMap[feature]
    if (orgFeatureKey) {
      // Check if the feature is explicitly enabled in the organization settings
      return organization?.features?.features?.[orgFeatureKey] === true
    }

    // Default to true for unmapped features
    return true
  }

  // Get theme-aware dropdown classes
  const getDropdownClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border-gray-200 text-gray-900"
      case "light":
        return "bg-white/95 backdrop-blur-sm border-blue-200/50 text-gray-900"
      case "dark":
      default:
        return "glass-dropdown border-white/20 bg-slate-800/95 backdrop-blur-sm text-white"
    }
  }

  const getDropdownItemClasses = () => {
    switch (theme) {
      case "original":
        return "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      case "light":
        return "text-gray-700 hover:bg-blue-50 hover:text-gray-900"
      case "dark":
      default:
        return "text-slate-300 hover:text-white hover:bg-white/10"
    }
  }

  const getDropdownSeparatorClasses = () => {
    switch (theme) {
      case "original":
        return "bg-gray-200"
      case "light":
        return "bg-blue-200/50"
      case "dark":
      default:
        return "bg-white/10"
    }
  }

  // Get theme-aware logo
  const getLogoSrc = () => {
    switch (theme) {
      case "original":
      case "light":
        return "/logo.svg" // Dark logo for light themes
      case "dark":
      default:
        return "/logo-white.svg" // White logo for dark theme
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user.approved) {
    return (
      <div className="min-h-screen bg-slate-800 flex flex-col">
        <header className="glass-nav border-b border-white/10 px-4 h-16 flex items-center justify-between relative z-10 sticky top-0">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-white.svg" alt="GreekOne Logo" width={32} height={32} className="h-8 w-auto" />
            <span className={`font-bold text-base sm:text-lg ${getTextColor()}`}>GreekOne</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <CustomAvatar src={user?.profile_picture} name={user?.name} className="h-8 w-8" />
              <span className={`text-sm font-medium hidden sm:inline ${getTextColor()}`}>{user?.name || "User"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>
        <PendingApprovalScreen user={user} onRefresh={handleRefreshStatus} />
      </div>
    )
  }

  const getBackgroundClasses = () => {
    switch (theme) {
      case "original":
        return "min-h-screen bg-white"
      case "light":
        return "min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50"
      case "dark":
      default:
        return "min-h-screen bg-slate-800"
    }
  }

  return (
    <div className={`${getBackgroundClasses()} flex flex-col md:flex-row w-full max-w-full overflow-hidden`}>
      {/* Sidebar for desktop */}
      <aside
        className={`hidden md:flex ${sidebarCollapsed ? "w-16" : "w-64"} flex-col ${
          theme === "original"
            ? "bg-white border-r border-gray-200 shadow-lg"
            : theme === "light"
              ? "bg-white/95 backdrop-blur-sm border-r border-blue-200/50 shadow-lg"
              : "glass-sidebar border-r border-white/10"
        } h-screen fixed top-0 left-0 transition-all duration-300 z-40`}
      >
        <div className="p-6 relative">
          <div className="flex items-center justify-center">
            {!sidebarCollapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src={getLogoSrc() || "/placeholder.svg"}
                  alt="GreekOne Logo"
                  width={40}
                  height={40}
                  className="h-8 w-auto"
                />
                <span className={`font-bold text-xl ${getTextColor()}`}>GreekOne</span>
              </Link>
            )}
            {sidebarCollapsed && (
              <Link href="/dashboard" className="flex items-center justify-center">
                <Image
                  src={getLogoSrc() || "/placeholder.svg"}
                  alt="GreekOne Logo"
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={`absolute top-2 right-2 h-8 w-8 ${
              theme === "original" || theme === "light"
                ? "text-gray-600 hover:bg-gray-100"
                : "text-white hover:bg-white/10"
            }`}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {!sidebarCollapsed && (
            <p
              className={`text-xs font-semibold px-3 py-2 ${
                theme === "original" || theme === "light" ? "text-gray-500" : "text-slate-300"
              }`}
            >
              MAIN
            </p>
          )}
          <SidebarLink
            href="/dashboard"
            icon={<Home className="h-5 w-5" />}
            isActive={isActive("/dashboard") && pathname === "/dashboard"}
            title="Dashboard"
            sidebarCollapsed={sidebarCollapsed}
          >
            Dashboard
          </SidebarLink>
          {showFeature("Study") && (
            <SidebarLink
              href="/dashboard/study"
              icon={<BookOpen className="h-5 w-5" />}
              isActive={isActive("/dashboard/study")}
              title="Study"
              sidebarCollapsed={sidebarCollapsed}
            >
              Study
            </SidebarLink>
          )}
          {showFeature("Gym") && (
            <SidebarLink
              href="/dashboard/gym"
              icon={<Dumbbell className="h-5 w-5" />}
              isActive={isActive("/dashboard/gym")}
              title="Gym"
              sidebarCollapsed={sidebarCollapsed}
            >
              Gym
            </SidebarLink>
          )}
          {showFeature("Hours") && (
            <SidebarLink
              href={organization?.features?.trackingSystem === 'housePoints' ? "/dashboard/house-points" : "/dashboard/hours"}
              icon={organization?.features?.trackingSystem === 'housePoints' ? <Award className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              isActive={organization?.features?.trackingSystem === 'housePoints' ? isActive("/dashboard/house-points") : isActive("/dashboard/hours")}
              title={organization?.features?.trackingSystem === 'housePoints' ? "House Points" : "Hours"}
              sidebarCollapsed={sidebarCollapsed}
            >
              {organization?.features?.trackingSystem === 'housePoints' ? "House Points" : "Hours"}
            </SidebarLink>
          )}
          {showFeature("Events") && (
            <SidebarLink
              href="/dashboard/events"
              icon={<Calendar className="h-5 w-5" />}
              isActive={isActive("/dashboard/events")}
              title="Events"
              sidebarCollapsed={sidebarCollapsed}
            >
              Events
            </SidebarLink>
          )}
          {showFeature("Messages") && (
            <SidebarLink
              href="/dashboard/messages"
              icon={<MessageSquare className="h-5 w-5" />}
              isActive={isActive("/dashboard/messages")}
              title="Messages"
              sidebarCollapsed={sidebarCollapsed}
            >
              Messages
            </SidebarLink>
          )}
          {showFeature("Tasks") && (
            <SidebarLink
              href="/dashboard/tasks"
              icon={<CheckSquare className="h-5 w-5" />}
              isActive={isActive("/dashboard/tasks")}
              title="Tasks"
              sidebarCollapsed={sidebarCollapsed}
            >
              Tasks
            </SidebarLink>
          )}
          {showFeature("Announcements") && (
            <SidebarLink
              href="/dashboard/announcements"
              icon={<Megaphone className="h-5 w-5" />}
              isActive={isActive("/dashboard/announcements")}
              title="Announcements"
              sidebarCollapsed={sidebarCollapsed}
            >
              Announcements
            </SidebarLink>
          )}
          <SidebarLink
            href="/dashboard/polls"
            icon={<Vote className="h-5 w-5" />}
            isActive={isActive("/dashboard/polls")}
            title="Polls"
            sidebarCollapsed={sidebarCollapsed}
          >
            Polls
          </SidebarLink>
          {showFeature("Library") && (
            <SidebarLink
              href="/dashboard/library"
              icon={<Library className="h-5 w-5" />}
              isActive={isActive("/dashboard/library")}
              title="Library"
              sidebarCollapsed={sidebarCollapsed}
            >
              Library
            </SidebarLink>
          )}

          {!sidebarCollapsed && (
            <p
              className={`text-xs font-semibold px-3 py-2 mt-6 ${
                theme === "original" || theme === "light" ? "text-gray-500" : "text-slate-300"
              }`}
            >
              CHAPTER
            </p>
          )}
          {showFeature("Members") && (
            <SidebarLink
              href="/dashboard/members"
              icon={<Users className="h-5 w-5" />}
              isActive={isActive("/dashboard/members")}
              title="Members"
              sidebarCollapsed={sidebarCollapsed}
            >
              Members
            </SidebarLink>
          )}
          {showFeature("Chapter Settings") && (
            <SidebarLink
              href="/dashboard/chapter-settings"
              icon={<Settings className="h-5 w-5" />}
              isActive={isActive("/dashboard/chapter-settings")}
              title="Chapter Settings"
              sidebarCollapsed={sidebarCollapsed}
            >
              Chapter Settings
            </SidebarLink>
          )}
          <SidebarLink
            href="/dashboard/settings"
            icon={<Settings className="h-5 w-5" />}
            isActive={isActive("/dashboard/settings")}
            title="Settings"
            sidebarCollapsed={sidebarCollapsed}
          >
            Settings
          </SidebarLink>
        </nav>

        <div
          className={`p-4 ${
            theme === "original"
              ? "border-t border-gray-200"
              : theme === "light"
                ? "border-t border-blue-200/50"
                : "border-t border-white/10"
          }`}
        >
          <div className={`flex items-center gap-3 px-2 py-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <CustomAvatar src={user?.profile_picture} name={user?.name} />
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${getTextColor()} truncate`}>{user?.name || "User"}</p>
                  <p className={`text-xs ${getSecondaryTextColor()} truncate`}>{user?.chapter || "Chapter"}</p>
                  {user?.organizationId && isGroupOwner(user) && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-purple-600/20 px-2 py-0.5 text-xs font-medium text-purple-300 border border-purple-500/30">
                      Group Owner
                    </div>
                  )}
                  {user?.organizationId && user?.roles?.includes("President") && !isGroupOwner(user) && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">
                      President
                    </div>
                  )}
                  {user?.organizationId &&
                    user?.roles?.includes("Treasurer") &&
                    !isGroupOwner(user) &&
                    !user?.roles?.includes("President") && (
                      <div className="mt-1 inline-flex items-center rounded-full bg-green-600/20 px-2 py-0.5 text-xs font-medium text-green-300 border border-green-500/30">
                        Treasurer
                      </div>
                    )}
                  {user?.organizationId && isOnlyNewMember(user) && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-yellow-600/20 px-2 py-0.5 text-xs font-medium text-yellow-300 border border-yellow-500/30">
                      {isPledgeSystemEnabled() ? "Pledge" : "New Member"}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        theme === "original" || theme === "light"
                          ? "text-gray-600 hover:bg-gray-100"
                          : "text-white hover:bg-white/10"
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={getDropdownClasses()}>
                    <DropdownMenuLabel className={`${getTextColor()}`}>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className={getDropdownSeparatorClasses()} />
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/settings")}
                      className={getDropdownItemClasses()}
                    >
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/settings")}
                      className={getDropdownItemClasses()}
                    >
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className={getDropdownSeparatorClasses()} />
                    <DropdownMenuItem onClick={handleLogout} className={getDropdownItemClasses()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <header
          className={`md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 h-16 sticky ${
            theme === "original"
              ? "bg-white border-b border-gray-200 shadow-sm"
              : theme === "light"
                ? "bg-white/95 backdrop-blur-sm border-b border-blue-200/50 shadow-sm"
                : "glass-nav border-b border-white/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`md:hidden ${
                  theme === "original" || theme === "light"
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <Link href="/dashboard" className="flex items-center gap-2" onClick={handleMobileNavClick}>
              <Image
                src={getLogoSrc() || "/placeholder.svg"}
                alt="GreekOne Logo"
                width={32}
                height={32}
                className="h-8 w-auto"
              />
              <span className={`font-bold text-xl ${getTextColor()}`}>GreekOne</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell
              userId={user?.id}
              organizationId={user?.organizationId || user?.organization_id}
              theme={theme}
              className={theme === "original" || theme === "light" ? "text-gray-700" : ""}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0">
                  <CustomAvatar src={user?.profile_picture} name={user?.name} className="h-8 w-8" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={getDropdownClasses()}>
                <DropdownMenuLabel className={`${getTextColor()}`}>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className={getDropdownSeparatorClasses()} />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings")}
                  className={getDropdownItemClasses()}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings")}
                  className={getDropdownItemClasses()}
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className={getDropdownSeparatorClasses()} />
                <DropdownMenuItem onClick={handleLogout} className={getDropdownItemClasses()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <SheetContent className="md:hidden">
          <nav className="flex-1 px-4 space-y-1">
            {!sidebarCollapsed && (
              <p
                className={`text-xs font-semibold px-3 py-2 ${
                  theme === "original" || theme === "light" ? "text-gray-500" : "text-slate-300"
                }`}
              >
                MAIN
              </p>
            )}
            <SidebarLink
              href="/dashboard"
              icon={<Home className="h-5 w-5" />}
              isActive={isActive("/dashboard") && pathname === "/dashboard"}
              title="Dashboard"
              sidebarCollapsed={sidebarCollapsed}
            >
              Dashboard
            </SidebarLink>
            {showFeature("Study") && (
              <SidebarLink
                href="/dashboard/study"
                icon={<BookOpen className="h-5 w-5" />}
                isActive={isActive("/dashboard/study")}
                title="Study"
                sidebarCollapsed={sidebarCollapsed}
              >
                Study
              </SidebarLink>
            )}
            {showFeature("Gym") && (
              <SidebarLink
                href="/dashboard/gym"
                icon={<Dumbbell className="h-5 w-5" />}
                isActive={isActive("/dashboard/gym")}
                title="Gym"
                sidebarCollapsed={sidebarCollapsed}
              >
                Gym
              </SidebarLink>
            )}
            {showFeature("Hours") && (
              <SidebarLink
                href="/dashboard/hours"
                icon={<Clock className="h-5 w-5" />}
                isActive={isActive("/dashboard/hours")}
                title="Hours"
                sidebarCollapsed={sidebarCollapsed}
              >
                Hours
              </SidebarLink>
            )}
            {showFeature("Events") && (
              <SidebarLink
                href="/dashboard/events"
                icon={<Calendar className="h-5 w-5" />}
                isActive={isActive("/dashboard/events")}
                title="Events"
                sidebarCollapsed={sidebarCollapsed}
              >
                Events
              </SidebarLink>
            )}
            {showFeature("Messages") && (
              <SidebarLink
                href="/dashboard/messages"
                icon={<MessageSquare className="h-5 w-5" />}
                isActive={isActive("/dashboard/messages")}
                title="Messages"
                sidebarCollapsed={sidebarCollapsed}
              >
                Messages
              </SidebarLink>
            )}
            {showFeature("Tasks") && (
              <SidebarLink
                href="/dashboard/tasks"
                icon={<CheckSquare className="h-5 w-5" />}
                isActive={isActive("/dashboard/tasks")}
                title="Tasks"
                sidebarCollapsed={sidebarCollapsed}
              >
                Tasks
              </SidebarLink>
            )}
            {showFeature("Announcements") && (
              <SidebarLink
                href="/dashboard/announcements"
                icon={<Megaphone className="h-5 w-5" />}
                isActive={isActive("/dashboard/announcements")}
                title="Announcements"
                sidebarCollapsed={sidebarCollapsed}
              >
                Announcements
              </SidebarLink>
            )}
            {showFeature("Library") && (
              <SidebarLink
                href="/dashboard/library"
                icon={<Library className="h-5 w-5" />}
                isActive={isActive("/dashboard/library")}
                title="Library"
                sidebarCollapsed={sidebarCollapsed}
              >
                Library
              </SidebarLink>
            )}

            {!sidebarCollapsed && (
              <p
                className={`text-xs font-semibold px-3 py-2 mt-6 ${
                  theme === "original" || theme === "light" ? "text-gray-500" : "text-slate-300"
                }`}
              >
                CHAPTER
              </p>
            )}
            {showFeature("Members") && (
              <SidebarLink
                href="/dashboard/members"
                icon={<Users className="h-5 w-5" />}
                isActive={isActive("/dashboard/members")}
                title="Members"
                sidebarCollapsed={sidebarCollapsed}
              >
                Members
              </SidebarLink>
            )}
            {showFeature("Chapter Settings") && (
              <SidebarLink
                href="/dashboard/chapter-settings"
                icon={<Settings className="h-5 w-5" />}
                isActive={isActive("/dashboard/chapter-settings")}
                title="Chapter Settings"
                sidebarCollapsed={sidebarCollapsed}
              >
                Chapter Settings
              </SidebarLink>
            )}
            <SidebarLink
              href="/dashboard/settings"
              icon={<Settings className="h-5 w-5" />}
              isActive={isActive("/dashboard/settings")}
              title="Settings"
              sidebarCollapsed={sidebarCollapsed}
            >
              Settings
            </SidebarLink>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main
        className={`flex-1 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"} transition-all duration-300 p-6 md:p-8 w-full max-w-full overflow-hidden pt-20 md:pt-6`}
      >
        {children}
      </main>
    </div>
  )
}
