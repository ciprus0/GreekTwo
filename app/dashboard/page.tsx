"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Calendar, ChevronRight, Clock, MessageSquare, Users, Check, BookOpen, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/supabase-api"
import { CustomAvatar } from "@/components/ui/custom-avatar"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useDebounce } from "@/lib/performance-utils"
import { useTheme } from "@/lib/theme-context"

// Memoized components to prevent unnecessary re-renders
const MemoizedProgressCard = memo(({ title, current, goal, icon, type }) => {
  const { getTextColor, getSecondaryTextColor } = useTextColors()

  const percentage = useMemo(() => {
    return goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  }, [current, goal])

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className={`text-sm font-medium ${getTextColor()}`}>{title}</span>
          </div>
          <span className={`text-xs md:text-sm ${getSecondaryTextColor()} whitespace-nowrap`}>
            {goal > 0 ? `${current.toFixed(1)}/${goal}` : "No requirement set"}
          </span>
        </div>
        {goal > 0 ? (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="bg-gradient-to-r from-red-500 to-red-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        ) : (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div className="bg-gray-400 h-2 rounded-full w-0" />
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className={`text-xs ${getSecondaryTextColor()}`}>
            {goal > 0 ? `${percentage.toFixed(0)}% complete` : "No requirements set"}
          </span>
          {goal > 0 && current >= goal && <span className="text-xs text-green-600 font-medium">✓ Complete</span>}
        </div>
      </div>
    </div>
  )
})

const MemoizedEventCard = memo(({ event, onClick }) => {
  const { getTextColor, getSecondaryTextColor } = useTextColors()

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }, [])

  const formatTime = useCallback((dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  const eventTypeColor = useMemo(() => {
    switch (event.type) {
      case "social":
        return "bg-blue-400"
      case "chapter":
        return "bg-green-400"
      case "philanthropy":
        return "bg-purple-400"
      default:
        return "bg-slate-400"
    }
  }, [event.type])

  return (
    <div
      className={`flex justify-between items-start cursor-pointer p-2 rounded-md transition-colors gap-2 ${
        theme === "original" ? "hover:bg-gray-50" : theme === "light" ? "hover:bg-blue-50/30" : "hover:bg-white/5"
      }`}
      onClick={() => onClick(event)}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${eventTypeColor}`} />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium block truncate ${getTextColor()}`}>{event.title}</span>
          <span className={`text-xs ${getSecondaryTextColor()} block`}>
            {formatDate(event.start_time)}, {formatTime(event.start_time)}
          </span>
        </div>
      </div>
    </div>
  )
})

const MemoizedAnnouncementCard = memo(({ announcement }) => {
  const { getTextColor, getSecondaryTextColor, getMutedTextColor } = useTextColors()

  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  const truncatedContent = useMemo(() => {
    return announcement.content.length > 120 ? `${announcement.content.substring(0, 120)}...` : announcement.content
  }, [announcement.content])

  return (
                    <div className={`p-4 transition-colors ${
                  theme === "original" ? "hover:bg-gray-50" : theme === "light" ? "hover:bg-blue-50/30" : "hover:bg-white/5"
                }`}>
      <div className="flex items-start gap-3 mb-2">
        <CustomAvatar src={null} name={announcement.author_name} size="sm" className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-medium truncate ${getTextColor()}`}>{announcement.author_name}</p>
            <Bell className="h-4 w-4 text-red-400 flex-shrink-0" />
          </div>
          <p className={`text-xs ${getMutedTextColor()}`}>{formatDate(announcement.created_at)}</p>
        </div>
      </div>
      <h3 className={`font-medium mb-1 text-sm md:text-base ${getTextColor()}`}>{announcement.title}</h3>
      <p className={`text-sm ${getSecondaryTextColor()} leading-relaxed`}>{truncatedContent}</p>
    </div>
  )
})

const MemoizedMessageCard = memo(({ message, onClick, formatTime }) => {
  const { getTextColor, getSecondaryTextColor, getMutedTextColor } = useTextColors()

  return (
    <div
      onClick={() => onClick(message)}
                        className={`flex items-center gap-3 p-4 transition-colors cursor-pointer ${
                    theme === "original" ? "hover:bg-gray-50" : theme === "light" ? "hover:bg-blue-50/30" : "hover:bg-white/5"
                  }`}
    >
      <CustomAvatar src={null} name={message.memberName} size="sm" className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-medium truncate ${getTextColor()}`}>{message.memberName}</p>
          <p className={`text-xs ${getMutedTextColor()} whitespace-nowrap`}>{formatTime(message.timestamp)}</p>
        </div>
        <p className={`text-xs ${getSecondaryTextColor()} truncate`}>
          {message.text || (message.attachments?.length > 0 ? "📎 Attachment" : "No message")}
        </p>
      </div>
      {message.unread && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>}
    </div>
  )
})

// Fix the CircleCheckbox component to prevent double check marks
const CircleCheckbox = memo(({ checked, onCheckedChange, id, className }) => {
  return (
    <div className="relative">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "h-5 w-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-slate-300",
          className,
        )}
      />
      {checked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  )
})

export default function DashboardPage() {
  const [organization, setOrganization] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tasks, setTasks] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const router = useRouter()

  const [totalStudyHours, setTotalStudyHours] = useState(0)
  const [serviceHours, setServiceHours] = useState(0)
  const [chapterHours, setChapterHours] = useState(0)

  const [members, setMembers] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [studyHoursGoal, setStudyHoursGoal] = useState(0)
  const [serviceHoursGoal, setServiceHoursGoal] = useState(0)
  const [chapterHoursGoal, setChapterHoursGoal] = useState(0)

  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()
  const { theme } = useTheme()

  // Debounce task toggle to prevent rapid state changes
  const debouncedTaskToggle = useDebounce((taskId) => {
    const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))
    updatedTasks.sort((a, b) => {
      if (a.completed === b.completed) return 0
      return a.completed ? 1 : -1
    })

    setTasks(updatedTasks)

    const allTasks = JSON.parse(localStorage.getItem("tasks") || "[]")
    const updatedAllTasks = allTasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    )
    localStorage.setItem("tasks", JSON.stringify(updatedAllTasks))
  }, 300)

  // Load user data and other information with caching - FIXED DEPENDENCIES
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        const isAuthenticated = localStorage.getItem("isAuthenticated")
        const userData = localStorage.getItem("user")

        if (!isAuthenticated || !userData) {
          router.push("/login")
          return
        }

        const parsedUser = JSON.parse(userData)
        if (!isMounted) return

        setUser(parsedUser)
        setIsAdmin(parsedUser.role === "admin" || parsedUser.role === "executive")

        if (parsedUser.organizationId) {
          try {
            // Load organization
            const userOrg = await api.getOrganizationById(parsedUser.organizationId)
            if (!isMounted) return
            if (userOrg) {
              setOrganization(userOrg)
            }

            // Load members
            try {
              const orgMembers = await api.getMembersBasicByOrganization(parsedUser.organizationId)
              if (!isMounted) return
              setMembers(orgMembers.filter((m) => m.approved))
            } catch (error) {
              console.error("Error loading members:", error)
            }

            // Load events
            try {
              const upcomingEvents = await api.getUpcomingEventsByOrganization(parsedUser.organizationId, 3)
              if (!isMounted) return
              setEvents(upcomingEvents)
            } catch (error) {
              console.error("Error loading events:", error)
            }

            // Load announcements
            try {
              const recentAnnouncements = await api.getRecentAnnouncementsByOrganization(parsedUser.organizationId, 3)
              if (!isMounted) return
              setAnnouncements(recentAnnouncements)
            } catch (error) {
              console.error("Error loading announcements:", error)
            }

            // Load hours data
            try {
              // Load study sessions to calculate weekly study hours
              const userSessions = await api.getStudySessionsByUser(parsedUser.id, parsedUser.organizationId)
              if (!isMounted) return

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

              const weeklyStudyHours = weeklyStudySessions.reduce((total, session) => {
                return total + (session.duration || 0) / 3600
              }, 0)
              setTotalStudyHours(weeklyStudyHours)

              // Load hours data for service and chapter hours
              const userHours = await api.getHoursByUser(parsedUser.id, parsedUser.organizationId)
              if (!isMounted) return

              const approvedHours = userHours.filter((hour) => hour.status === "approved")

              // Calculate totals by type
              const serviceTotal = approvedHours
                .filter((h) => h.type === "service")
                .reduce((total, h) => total + h.hours, 0)

              const chapterTotal = approvedHours
                .filter((h) => h.type === "chapter")
                .reduce((total, h) => total + h.hours, 0)

              setServiceHours(serviceTotal)
              setChapterHours(chapterTotal)

              // Load hour requirements from organization
              if (userOrg && userOrg.hour_requirements) {
                // Find requirements for current user
                const userServiceReq = userOrg.hour_requirements.find(
                  (req) =>
                    req.type === "service" && (req.targetUsers.includes(parsedUser.id) || req.targetUsers.length === 0),
                )
                const userChapterReq = userOrg.hour_requirements.find(
                  (req) =>
                    req.type === "chapter" && (req.targetUsers.includes(parsedUser.id) || req.targetUsers.length === 0),
                )
                const userStudyReq = userOrg.hour_requirements.find(
                  (req) =>
                    req.type === "study" && (req.targetUsers.includes(parsedUser.id) || req.targetUsers.length === 0),
                )

                if (userServiceReq) setServiceHoursGoal(userServiceReq.hoursRequired)
                if (userChapterReq) setChapterHoursGoal(userChapterReq.hoursRequired)
                // Study requirements are always weekly
                if (userStudyReq) setStudyHoursGoal(userStudyReq.hoursRequired)
              }
            } catch (error) {
              console.error("Error loading hours data:", error)
            }

            // Load recent messages with proper conversation handling
            try {
              const conversations = await api.getUserConversations(parsedUser.id, parsedUser.organizationId)
              if (!isMounted) return

              // Process conversations to get recent messages
              const recentMsgs = []

              for (const conversation of conversations.slice(0, 4)) {
                if (conversation.type === "direct" && conversation.lastMessage) {
                  // For direct messages, find the other participant
                  const otherUserId = conversation.participants.find((id) => id !== parsedUser.id)
                  const otherMember = members.find((m) => m.id === otherUserId)

                  if (otherMember) {
                    recentMsgs.push({
                      id: conversation.lastMessage.id,
                      senderId: conversation.lastMessage.sender_id,
                      text: conversation.lastMessage.text,
                      attachments: conversation.lastMessage.attachments || [],
                      timestamp: conversation.lastMessage.created_at,
                      memberName: otherMember.name,
                      memberId: otherMember.id,
                      unread: conversation.lastMessage.sender_id !== parsedUser.id,
                      conversationType: "direct",
                    })
                  }
                } else if (conversation.type === "group" && conversation.groupChat) {
                  // For group chats
                  recentMsgs.push({
                    id: conversation.lastMessage?.id || `group-${conversation.groupChat.id}`,
                    senderId: conversation.lastMessage?.sender_id,
                    text: conversation.lastMessage?.text || "No messages yet",
                    attachments: conversation.lastMessage?.attachments || [],
                    timestamp: conversation.lastMessage?.created_at || conversation.groupChat.created_at,
                    memberName: conversation.groupChat.name,
                    memberId: conversation.groupChat.id,
                    unread: conversation.lastMessage ? conversation.lastMessage.sender_id !== parsedUser.id : false,
                    conversationType: "group",
                  })
                }
              }

              // Sort by timestamp (most recent first)
              recentMsgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              setRecentMessages(recentMsgs.slice(0, 4))
            } catch (error) {
              console.error("Error loading messages:", error)
              // Fallback: try to load some basic message data
              try {
                const recentMsgs = []
                const limitedMembers = members.slice(0, 3)

                for (const member of limitedMembers) {
                  if (member.id === parsedUser.id) continue

                  try {
                    const messages = await api.getMessagesBetweenUsers(
                      parsedUser.id,
                      member.id,
                      parsedUser.organizationId,
                      1,
                    )

                    if (messages.length > 0) {
                      const lastMessage = messages[messages.length - 1]
                      recentMsgs.push({
                        id: lastMessage.id,
                        senderId: lastMessage.sender_id,
                        text: lastMessage.text,
                        attachments: lastMessage.attachments || [],
                        timestamp: lastMessage.created_at,
                        memberName: member.name,
                        memberId: member.id,
                        unread: lastMessage.sender_id !== parsedUser.id,
                        conversationType: "direct",
                      })
                    }
                  } catch (error) {
                    console.warn(`Could not load messages with ${member.name}:`, error)
                  }
                }

                recentMsgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                if (!isMounted) return
                setRecentMessages(recentMsgs.slice(0, 4))
              } catch (fallbackError) {
                console.error("Error in fallback message loading:", fallbackError)
              }
            }
          } catch (error) {
            console.error("Error loading organization data:", error)
          }

          // Load tasks from localStorage (no API call needed)
          const tasksData = localStorage.getItem("tasks")
          if (tasksData) {
            const allTasks = JSON.parse(tasksData)
            const userTasks = parsedUser.organizationId
              ? allTasks.filter((task) => task.organizationId === parsedUser.organizationId)
              : allTasks.filter((task) => task.assignedTo === parsedUser.id || task.assignedTo === null)

            if (!isMounted) return
            setTasks(userTasks)
          }
        }

        if (!isMounted) return
        setLoading(false)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        if (!isMounted) return
        setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [router]) // Only depend on router

  // Handle task completion toggle
  const handleTaskToggle = useCallback(
    (taskId) => {
      debouncedTaskToggle(taskId)
    },
    [debouncedTaskToggle],
  )

  // Handle event click
  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event)
    setShowEventDialog(true)
  }, [])

  // Handle message click
  const handleMessageClick = useCallback(
    (message) => {
      if (message.conversationType === "group") {
        router.push(`/dashboard/messages?group=${message.memberId}`)
      } else {
        router.push(`/dashboard/messages?user=${message.memberId}`)
      }
    },
    [router],
  )

  // Format date for display
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }, [])

  // Format time for display
  const formatTime = useCallback((timeString) => {
    if (!timeString) return ""

    // If it's an ISO string (from message timestamps)
    if (timeString.includes("T") || timeString.includes("Z")) {
      const date = new Date(timeString)
      const now = new Date()
      const diffInHours = (now - date) / (1000 * 60 * 60)

      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } else if (diffInHours < 48) {
        return "Yesterday"
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" })
      }
    }

    // If it's a time string like "14:30" (from events)
    const [hours, minutes] = timeString.split(":")
    const date = new Date()
    date.setHours(Number.parseInt(hours, 10))
    date.setMinutes(Number.parseInt(minutes, 10))

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  // Get completed and pending task counts
  const completedTasks = useMemo(() => tasks.filter((task) => task.completed).length, [tasks])
  const pendingTasks = useMemo(() => tasks.filter((task) => !task.completed).length, [tasks])

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

  // Get theme-aware tab classes
  const getTabsClasses = () => {
    switch (theme) {
      case "original":
        return "original-tabs"
      case "light":
        return "light-glass-tabs"
      case "dark":
      default:
        return "glass-card border-white/20"
    }
  }

  // Get theme-aware button classes
  const getButtonClasses = () => {
    switch (theme) {
      case "original":
        return "original-button-outline"
      case "light":
        return "light-glass-button-outline"
      case "dark":
      default:
        return "glass-button border-white/20 text-white hover:bg-white/10 bg-transparent"
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)] text-gray-900">Loading...</div>
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Dashboard</h1>
            <p className={getSecondaryTextColor()}>
              Welcome back, {user?.name?.split(" ")[0] || "User"}! Here's what's happening with your chapter.
            </p>
            {organization && (
              <div className="mt-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${
                    theme === "original"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : theme === "light"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "glass-card text-red-300 border-red-500/30"
                  }`}
                >
                  {organization.name} • {organization.university}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hours Progress Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className={`text-base md:text-lg font-medium ${getTextColor()}`}>Hours Progress</CardTitle>
                <CardDescription className={`text-sm ${getSecondaryTextColor()}`}>
                  Track your progress across all hour requirements
                </CardDescription>
              </div>
              <Clock className="h-5 w-5 text-red-400 flex-shrink-0" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <MemoizedProgressCard
                  title="Study Hours (This Week)"
                  current={totalStudyHours}
                  goal={studyHoursGoal}
                  icon={<BookOpen className="h-4 w-4 text-indigo-400 flex-shrink-0" />}
                  type="study"
                />

                <MemoizedProgressCard
                  title="Service Hours"
                  current={serviceHours}
                  goal={serviceHoursGoal}
                  icon={<Users className="h-4 w-4 text-green-400 flex-shrink-0" />}
                  type="service"
                />

                <MemoizedProgressCard
                  title="Chapter Hours"
                  current={chapterHours}
                  goal={chapterHoursGoal}
                  icon={<Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />}
                  type="chapter"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Link
                href="/dashboard/hours"
                className={`text-xs ${getAccentTextColor()} hover:underline flex items-center transition-colors`}
              >
                View Details
                <ChevronRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className={`text-base md:text-lg font-medium ${getTextColor()}`}>Upcoming Events</CardTitle>
                <CardDescription className={`text-sm ${getSecondaryTextColor()}`}>
                  You have {events.length} events coming up
                </CardDescription>
              </div>
              <Calendar className="h-4 w-4 text-red-400 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.length > 0 ? (
                  events.map((event, index) => (
                    <MemoizedEventCard key={event.id || index} event={event} onClick={handleEventClick} />
                  ))
                ) : (
                  <div className={`text-center py-2 text-sm ${getMutedTextColor()}`}>No upcoming events</div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Link
                href="/dashboard/events"
                className={`text-xs ${getAccentTextColor()} hover:underline flex items-center transition-colors`}
              >
                View All Events
                <ChevronRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 w-full">
          <div className="xl:col-span-2">
            <Tabs defaultValue="announcements">
              <div className="flex items-center justify-between mb-4">
                <TabsList className={getTabsClasses()}>
                  <TabsTrigger
                    value="announcements"
                    className={`text-xs md:text-sm ${getSecondaryTextColor()} data-[state=active]:text-red-600`}
                  >
                    Announcements
                  </TabsTrigger>
                  <TabsTrigger
                    value="recent-activity"
                    className={`text-xs md:text-sm ${getSecondaryTextColor()} data-[state=active]:text-red-600`}
                  >
                    Recent Activity
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-red-600 hover:text-red-700 text-xs md:text-sm`}
                  asChild
                >
                  <Link href="/dashboard/announcements">View All</Link>
                </Button>
              </div>

              <TabsContent value="announcements" className="mt-4">
                <Card className={getCardClasses()}>
                  <CardContent className="p-0">
                    <div
                      className={`divide-y ${theme === "original" ? "divide-gray-200" : theme === "light" ? "divide-blue-200/50" : "divide-white/10"}`}
                    >
                      {announcements.length > 0 ? (
                        announcements
                          .slice(0, 3)
                          .map((announcement) => (
                            <MemoizedAnnouncementCard key={announcement.id} announcement={announcement} />
                          ))
                      ) : (
                        <div className={`p-8 text-center ${getMutedTextColor()}`}>No announcements yet</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent-activity" className="mt-4">
                <Card className={getCardClasses()}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="mt-0.5 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Sarah" />
                        <AvatarFallback
                          className={`${theme === "original" ? "bg-red-100 text-red-700" : theme === "light" ? "bg-blue-100 text-blue-700" : "bg-red-600/20 text-red-300 border border-red-500/30"}`}
                        >
                          SJ
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${getSecondaryTextColor()}`}>
                          <span className={`font-medium ${getTextColor()}`}>Sarah Johnson</span> completed 5 service
                          hours at the local food bank.
                        </p>
                        <p className={`text-xs ${getMutedTextColor()}`}>1 hour ago</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Avatar className="mt-0.5 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Mike" />
                        <AvatarFallback
                          className={`${theme === "original" ? "bg-red-100 text-red-700" : theme === "light" ? "bg-blue-100 text-blue-700" : "bg-red-600/20 text-red-300 border border-red-500/30"}`}
                        >
                          MT
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${getSecondaryTextColor()}`}>
                          <span className={`font-medium ${getTextColor()}`}>Mike Thompson</span> created a new event:
                          "Alumni Networking Night".
                        </p>
                        <p className={`text-xs ${getMutedTextColor()}`}>3 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Avatar className="mt-0.5 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Emma" />
                        <AvatarFallback
                          className={`${theme === "original" ? "bg-red-100 text-red-700" : theme === "light" ? "bg-blue-100 text-blue-700" : "bg-red-600/20 text-red-300 border border-red-500/30"}`}
                        >
                          EW
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${getSecondaryTextColor()}`}>
                          <span className={`font-medium ${getTextColor()}`}>Emma Wilson</span> completed the "New Member
                          Education" task.
                        </p>
                        <p className={`text-xs ${getMutedTextColor()}`}>Yesterday</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Avatar className="mt-0.5 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=40&width=40" alt="David" />
                        <AvatarFallback
                          className={`${theme === "original" ? "bg-red-100 text-red-700" : theme === "light" ? "bg-blue-100 text-blue-700" : "bg-red-600/20 text-red-300 border border-red-500/30"}`}
                        >
                          DL
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${getSecondaryTextColor()}`}>
                          <span className={`font-medium ${getTextColor()}`}>David Lee</span> uploaded photos from the
                          "Community Service Day" event.
                        </p>
                        <p className={`text-xs ${getMutedTextColor()}`}>2 days ago</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4 md:space-y-6">
            <Card className={getCardClasses()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-base md:text-lg ${getTextColor()}`}>Recent Messages</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-red-600 hover:text-red-700 text-xs md:text-sm`}
                    asChild
                  >
                    <Link href="/dashboard/messages">
                      <MessageSquare className="h-4 w-4 mr-1 md:mr-2" />
                      New
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  className={`divide-y ${theme === "original" ? "divide-gray-200" : theme === "light" ? "divide-blue-200/50" : "divide-white/10"}`}
                >
                  {recentMessages.length === 0 ? (
                    <div className={`text-center py-8 ${getMutedTextColor()} text-sm`}>No messages yet</div>
                  ) : (
                    recentMessages.map((message) => (
                      <MemoizedMessageCard
                        key={message.id}
                        message={message}
                        onClick={handleMessageClick}
                        formatTime={formatTime}
                      />
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter
                className={`border-t ${theme === "original" ? "border-gray-200" : theme === "light" ? "border-blue-200/50" : "border-white/10"} p-4`}
              >
                <Button variant="outline" className={`w-full ${getButtonClasses()}`} asChild>
                  <Link href="/dashboard/messages">View All Messages</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className={getCardClasses()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-base md:text-lg ${getTextColor()}`}>Chapter Members</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-red-600 hover:text-red-700 text-xs md:text-sm`}
                    asChild
                  >
                    <Link href="/dashboard/members">
                      <Users className="h-4 w-4 mr-1 md:mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  className={`divide-y ${theme === "original" ? "divide-gray-200" : theme === "light" ? "divide-blue-200/50" : "divide-white/10"}`}
                >
                  {members.length === 0 ? (
                    <div className={`text-center py-8 ${getMutedTextColor()} text-sm`}>No chapter members yet</div>
                  ) : (
                    members.slice(0, 4).map((member) => (
                      <div key={member.id} className={`flex items-center gap-3 p-4 transition-colors ${
                  theme === "original" ? "hover:bg-gray-50" : theme === "light" ? "hover:bg-blue-50/30" : "hover:bg-white/5"
                }`}>
                        <CustomAvatar src={null} name={member.name} size="sm" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${getTextColor()}`}>{member.name}</p>
                          <p className={`text-xs ${getMutedTextColor()}`}>
                            {member.role === "admin"
                              ? "President"
                              : member.role === "executive"
                                ? "Executive"
                                : "Member"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter
                className={`border-t ${theme === "original" ? "border-gray-200" : theme === "light" ? "border-blue-200/50" : "border-white/10"} p-4`}
              >
                <Button variant="outline" className={`w-full ${getButtonClasses()}`} asChild>
                  <Link href="/dashboard/members">View All Members</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Event Details Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className={`sm:max-w-[500px] ${getCardClasses()}`}>
            <DialogHeader>
              <DialogTitle className={`${getTextColor()}`}>{selectedEvent?.title}</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                {selectedEvent && formatDate(selectedEvent.start_time)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedEvent && (
                <>
                  <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{formatDate(selectedEvent.start_time)}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>
                      {formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}
                    </span>
                  </div>
                  {selectedEvent.location && (
                    <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  {selectedEvent.description && (
                    <div className="mt-4">
                      <h4 className={`text-sm font-medium mb-1 ${getTextColor()}`}>Description</h4>
                      <p className={`text-sm ${getSecondaryTextColor()}`}>{selectedEvent.description}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setShowEventDialog(false)} className={getButtonClasses()}>
                      Close
                    </Button>
                    <Button
                      asChild
                      className={
                        theme === "original"
                          ? "original-button"
                          : theme === "light"
                            ? "light-glass-button"
                            : "btn-primary"
                      }
                    >
                      <Link href={`/dashboard/events?event=${selectedEvent.id}`}>View Details</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeWrapper>
  )
}
