"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, MapPin, Clock, ArrowRight, Play, Pause, Plus, Trash, AlertCircle, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/supabase-api"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useThrottle, useCleanup } from "@/lib/performance-utils"
import { useTheme } from "@/lib/theme-context"

// Define a basic type for the user object expected from localStorage
interface LocalStorageUser {
  id: string
  role: string
  roles?: string[]
  organization_id?: string
  organizationId?: string // Allow for both naming conventions
  name?: string
  email?: string
}

interface StudySessionData {
  id: string
  user_id: string
  organization_id: string
  location_id: string
  location_name?: string
  start_time: string
  end_time?: string | null
  duration?: number
  status: "active" | "completed" | "cancelled"
}

interface StudyLocationData {
  id: string
  name: string
  address?: string
  lat?: number
  lng?: number
  radius?: number
  is_box?: boolean
  box_coordinates?: { nw: { lat: number; lng: number }; se: { lat: number; lng: number } }
  organization_id: string
}

interface HourRequirement {
  id: string
  type: "study" | "service" | "chapter"
  name: string
  description?: string
  hoursRequired: number
  targetUsers: string[]
  createdBy: string
  createdAt: string
}

interface OrganizationData {
  id: string
  name: string
  hour_requirements?: HourRequirement[]
}

interface MemberData {
  id: string
  name: string
  email?: string
  role?: string
}

interface MemberHoursSummary extends MemberData {
  serviceHours: number
  chapterHours: number
  studyHours: number
  totalHours: number
}

interface HourData {
  id: string
  user_id: string
  organization_id: string
  date: string
  hours: number
  type: "study" | "service" | "chapter"
  description?: string
  status: "pending" | "approved" | "rejected"
  approved_by?: string
  created_at: string
}

export default function StudyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [studyHours, setStudyHours] = useState<number>(0)
  const [studyHoursGoal, setStudyHoursGoal] = useState<number>(50)
  const [recentSessions, setRecentSessions] = useState<StudySessionData[]>([])
  const [studyLocations, setStudyLocations] = useState<StudyLocationData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [user, setUser] = useState<LocalStorageUser | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState<boolean>(false)
  const [studySession, setStudySession] = useState<StudySessionData | null>(null)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] = useState<boolean>(false)
  const [hourRequirements, setHourRequirements] = useState<HourRequirement[]>([])
  const [showRequirementsDialog, setShowRequirementsDialog] = useState<boolean>(false)
  const [showCreateRequirementDialog, setShowCreateRequirementDialog] = useState<boolean>(false)
  const [newRequirement, setNewRequirement] = useState<{
    type: "study"
    hoursRequired: number | string
    targetUsers: string[]
    name: string
    description: string
  }>({
    type: "study",
    hoursRequired: 50,
    targetUsers: [],
    name: "",
    description: "",
  })
  const [allMembers, setAllMembers] = useState<MemberData[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [allMemberHours, setAllMemberHours] = useState<HourData[]>([])
  const [pendingHours, setPendingHours] = useState<HourData[]>([])
  const [memberHoursSummary, setMemberHoursSummary] = useState<MemberHoursSummary[]>([])
  const [orgStudySessions, setOrgStudySessions] = useState<StudySessionData[]>([])

  // Refs for cleanup
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

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

  // --- after ---------------------------------------------------------------
  /**
   * Stable location updater wrapped in `useCallback` so that it never changes
   * between renders.  This prevents the mounting geo-initialisation effect from
   * re-running and triggering the "Maximum update depth exceeded" error.
   */
  const handleLocationUpdate = useCallback((location: { lat: number; lng: number }) => {
    if (mountedRef.current) {
      setUserLocation(location)
    }
    // NOTE: no dependencies → stable reference
  }, [])

  const throttledLocationUpdate = useThrottle(handleLocationUpdate, 1000)
  // -------------------------------------------------------------------------

  // Cleanup function
  useCleanup(() => {
    mountedRef.current = false
    if (watchIdRef.current && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  })

  useEffect(() => {
    console.log("StudyPage: Initializing component and loading user from localStorage.")
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user")
      if (userData) {
        try {
          const parsedUser: LocalStorageUser = JSON.parse(userData)
          console.log("StudyPage (localStorage effect): User data loaded from localStorage:", parsedUser)
          setUser(parsedUser)
          const adminRoles = ["Group Owner", "President", "Treasurer"]
          setIsAdmin(parsedUser.roles && parsedUser.roles.some((role) => adminRoles.includes(role)))
        } catch (e) {
          console.error("StudyPage (localStorage effect): Failed to parse user data from localStorage.", e)
          localStorage.removeItem("user")
        }
      } else {
        console.warn("StudyPage (localStorage effect): No user data found in localStorage.")
        setLoading(false)
      }
    }

    const checkGeolocationPermission = async () => {
      if (typeof navigator !== "undefined" && !navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser")
        return false
      }
      if (typeof navigator !== "undefined" && navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: "geolocation" })
          if (permission.state === "denied") {
            setLocationError("Geolocation permission has been denied. Please enable it in your browser settings.")
            return false
          }
          if (permission.state === "granted") {
            setIsLocationPermissionGranted(true)
            return true
          }
          return true
        } catch (error) {
          console.error("Error checking geolocation permission:", error)
          return true
        }
      }
      return true
    }

    const initGeolocation = async () => {
      const hasPermission = await checkGeolocationPermission()
      if (hasPermission && typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords
              throttledLocationUpdate({ lat: latitude, lng: longitude })
              setLocationError(null)
              setIsLocationPermissionGranted(true)
            },
            (error) => {
              console.error("Error getting location:", error)
              setLocationError(error.message || "Unable to get your location")
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
          )
        } catch (error) {
          console.error("Geolocation error:", error)
          setLocationError("Geolocation is not supported or has been blocked")
        }
      }
    }

    initGeolocation()
  }, [throttledLocationUpdate])

  // Optimized data loading with proper cleanup
  useEffect(() => {
    if (user && (user.organization_id || user.organizationId)) {
      console.log("StudyPage (user data effect): User object is available, proceeding to fetch data.", user)
      setLoading(true)

      const fetchDataForUser = async () => {
        const orgId = user.organization_id || user.organizationId
        if (!orgId || !mountedRef.current) {
          console.warn("StudyPage (user data effect): Organization ID is missing from user object.")
          setLoading(false)
          return
        }

        try {
          // Batch API calls for better performance
          const [org, userSessions, orgLocations, members] = await Promise.all([
            api.getOrganizationById(orgId),
            api.getStudySessionsByUser(user.id, orgId, "completed"),
            api.getStudyLocationsByOrganization(orgId),
            isAdmin ? api.getMembersByOrganization(orgId) : Promise.resolve([]),
          ])

          if (!mountedRef.current) return // Component unmounted

          if (org && org.hour_requirements) {
            const studyReqs = org.hour_requirements.filter((req) => req.type === "study")
            setHourRequirements(studyReqs)
            const userStudyReq = studyReqs.find(
              (req) => req.targetUsers.includes(user.id) || req.targetUsers.length === 0,
            )
            setStudyHoursGoal(userStudyReq ? userStudyReq.hoursRequired : 0)
          } else {
            setHourRequirements([])
            setStudyHoursGoal(0)
          }

          const totalHours = userSessions.reduce((total, session) => total + (session.duration || 0) / 3600, 0)
          setStudyHours(totalHours)
          setRecentSessions(
            userSessions
              .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
              .slice(0, 3),
          )

          // Check for active sessions
          const activeSessions = await api.getStudySessionsByUser(user.id, orgId, "active")
          if (activeSessions.length > 0 && mountedRef.current) {
            const activeSession = activeSessions[0]
            setStudySession(activeSession)
            setIsTracking(true)
            const elapsed = Math.floor((new Date().getTime() - new Date(activeSession.start_time).getTime()) / 1000)
            setElapsedTime(elapsed >= 0 ? elapsed : 0)
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = setInterval(() => {
              if (mountedRef.current) {
                setElapsedTime((prev) => prev + 1)
              }
            }, 1000)
            startLocationTracking()
          }

          console.log("StudyPage (user data effect): Received study locations from API:", orgLocations)
          setStudyLocations(orgLocations || [])

          if (isAdmin && members) {
            setAllMembers(members || [])
          }
        } catch (error) {
          console.error("StudyPage (user data effect): Failed to fetch data for user:", error)
          if (mountedRef.current) {
            toast({ title: "Error", description: "Failed to load study data.", variant: "destructive" })
            setStudyLocations([])
          }
        } finally {
          if (mountedRef.current) {
            setLoading(false)
          }
        }
      }

      fetchDataForUser()
    } else if (user === null && typeof window !== "undefined" && !localStorage.getItem("user")) {
      console.log("StudyPage (user data effect): User is null and not in localStorage, skipping data fetch.")
      setLoading(false)
    } else if (user && !(user.organization_id || user.organizationId)) {
      console.warn(
        "StudyPage (user data effect): User object present but organization_id is missing. Cannot fetch org-specific data.",
        user,
      )
      setStudyLocations([])
      setLoading(false)
    }
  }, [user, isAdmin, toast])

  useEffect(() => {
    const checkIsAdmin = (user: LocalStorageUser): boolean => {
      const adminRoles = ["Group Owner", "President", "Treasurer"]
      return user.roles && user.roles.some((role) => adminRoles.includes(role))
    }

    const loadInitialData = async () => {
      if (typeof window === "undefined") return // Skip if not in browser environment

      const storedUser = localStorage.getItem("user")
      if (!storedUser) {
        console.warn("StudyPage (localStorage effect): No user data found in localStorage.")
        setLoading(false)
        return
      }

      try {
        const parsedUser: LocalStorageUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setIsAdmin(checkIsAdmin(parsedUser))

        if (!parsedUser.organizationId) {
          console.warn("StudyPage (localStorage effect): Organization ID is missing from user object.")
          setLoading(false)
          return
        }

        // Load study sessions for the current user (weekly calculation)
        const fetchedCurrentUserStudySessions = await api.getStudySessionsByUser(
          parsedUser.id,
          parsedUser.organizationId,
        )
        const completedCurrentUserSessions = fetchedCurrentUserStudySessions.filter((s) => s.end_time && s.duration)

        // Calculate weekly study hours (current week only)
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Start of current week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7) // End of current week

        const weeklyStudySessions = completedCurrentUserSessions.filter((session) => {
          const sessionDate = new Date(session.start_time)
          return sessionDate >= startOfWeek && sessionDate < endOfWeek
        })

        const sessionBasedStudySeconds = weeklyStudySessions.reduce(
          (total, session) => total + (session.duration || 0),
          0,
        )
        const sessionBasedStudyHours = sessionBasedStudySeconds / 3600

        // Load manual hours for the current user
        const userHours = await api.getHoursByUser(parsedUser.id, parsedUser.organizationId)

        // For manual study hours, also filter by current week
        const manualStudyHoursTotal = userHours
          .filter((h) => {
            if (h.type !== "study" || h.status !== "approved") return false
            const hourDate = new Date(h.date)
            return hourDate >= startOfWeek && hourDate < endOfWeek
          })
          .reduce((total, h) => total + h.hours, 0)

        const totalUserStudyHours = manualStudyHoursTotal + sessionBasedStudyHours
        setStudyHours(totalUserStudyHours)

        // Load study locations
        const studyLocations = await api.getStudyLocationsByOrganization(parsedUser.organizationId)
        setStudyLocations(studyLocations)

        // Load hour requirements
        const org = await api.getOrganizationById(parsedUser.organizationId)
        if (org && org.hour_requirements) {
          const studyReqs = org.hour_requirements.filter((req) => req.type === "study")
          setHourRequirements(studyReqs)
          const userStudyReq = studyReqs.find(
            (req) => req.targetUsers.includes(parsedUser.id) || req.targetUsers.length === 0,
          )
          setStudyHoursGoal(userStudyReq ? userStudyReq.hoursRequired : 0)
        } else {
          setHourRequirements([])
          setStudyHoursGoal(0)
        }

        if (checkIsAdmin(parsedUser)) {
          // Load all hours for the organization
          const allHours = await api.getHoursByOrganization(parsedUser.organizationId)
          setAllMemberHours(allHours)
          setPendingHours(allHours.filter((h) => h.status === "pending"))

          // Load all members
          const members = await api.getMembersByOrganization(parsedUser.organizationId)
          const approvedMembers = members.filter((m) => m.approved)
          setAllMembers(approvedMembers)

          const fetchedOrgStudySessions = await api.getStudySessionsByOrganization(parsedUser.organizationId)
          const completedOrgSessions = fetchedOrgStudySessions.filter((s) => s.end_time && s.duration)
          setOrgStudySessions(completedOrgSessions)

          // Calculate member hours summary with weekly study hours calculation
          const summary = approvedMembers.map((member) => {
            const memberHours = allHours.filter((h) => h.user_id === member.id && h.status === "approved")

            const serviceHours = memberHours
              .filter((h) => h.type === "service")
              .reduce((total, h) => total + h.hours, 0)
            const chapterHours = memberHours
              .filter((h) => h.type === "chapter")
              .reduce((total, h) => total + h.hours, 0)

            // Weekly manual study hours
            const memberManualStudyHours = memberHours
              .filter((h) => {
                if (h.type !== "study") return false
                const hourDate = new Date(h.date)
                return hourDate >= startOfWeek && hourDate < endOfWeek
              })
              .reduce((total, h) => total + h.hours, 0)

            // Weekly session-based study hours
            const memberWeeklySessionData = completedOrgSessions
              .filter((s) => {
                if (s.user_id !== member.id) return false
                const sessionDate = new Date(s.start_time)
                return sessionDate >= startOfWeek && sessionDate < endOfWeek
              })
              .reduce((total, session) => total + (session.duration || 0), 0)
            const memberSessionDataHours = memberWeeklySessionData / 3600

            const studyHours = memberManualStudyHours + memberSessionDataHours

            return {
              ...member,
              serviceHours,
              chapterHours,
              studyHours,
              totalHours: serviceHours + chapterHours + studyHours,
            }
          })
          setMemberHoursSummary(summary)
        }
      } catch (error) {
        console.error("StudyPage (data loading effect): Failed to load data:", error)
        toast({ title: "Error", description: "Failed to load study data.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [toast])

  const startLocationTracking = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      })
      return false
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (!mountedRef.current) return

          const { latitude, longitude } = position.coords
          const newLocation = { lat: latitude, lng: longitude }

          if (!userLocation || calculateDistance(userLocation.lat, userLocation.lng, latitude, longitude) > 10) {
            throttledLocationUpdate(newLocation)
          }
          setLocationError(null)

          const currentStudyZone = checkIfInStudyLocation(newLocation)

          if (!currentStudyZone && studySession) {
            endStudySession()
            setIsTracking(false)
            toast({
              title: "Study Session Ended",
              description: "You've left the study location. Your session has been saved.",
            })
          }
        },
        (error) => {
          console.error("Error tracking location:", error)
          if (mountedRef.current) {
            setLocationError(error.message || "Unable to track your location")
            if (error.code === error.TIMEOUT) {
              toast({
                title: "Location Update Delayed",
                description: "We're having trouble getting your current location. Tracking will continue.",
              })
              return
            }
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 60000,
        },
      )
      return true
    } catch (error) {
      console.error("Geolocation tracking error:", error)
      if (mountedRef.current) {
        setLocationError("Geolocation tracking is not supported or has been blocked")
        setIsTracking(false)
        toast({
          title: "Location Error",
          description: "Unable to track your location.",
          variant: "destructive",
        })
      }
      return false
    }
  }, [userLocation, studySession, throttledLocationUpdate, toast])

  const checkIfInStudyLocation = useCallback(
    (location: { lat: number; lng: number } | null): StudyLocationData | false => {
      console.log(
        "StudyPage (checkIfInStudyLocation): Checking location:",
        location,
        "against studyLocations:",
        studyLocations,
      )
      if (!location || !studyLocations || studyLocations.length === 0) return false

      for (const studyLoc of studyLocations) {
        console.log("StudyPage (checkIfInStudyLocation): Comparing with:", studyLoc.name)
        if (studyLoc.is_box && studyLoc.box_coordinates) {
          const { nw, se } = studyLoc.box_coordinates
          if (nw && se && nw.lat != null && nw.lng != null && se.lat != null && se.lng != null) {
            const inBox =
              location.lat <= nw.lat && location.lat >= se.lat && location.lng >= nw.lng && location.lng <= se.lng
            if (inBox) {
              console.log("StudyPage (checkIfInStudyLocation): User IS IN BOX:", studyLoc.name)
              return studyLoc
            }
          } else {
            console.warn(
              `StudyPage (checkIfInStudyLocation): Invalid box_coordinates for ${studyLoc.name}`,
              studyLoc.box_coordinates,
            )
          }
        } else if (studyLoc.radius != null && studyLoc.lat != null && studyLoc.lng != null) {
          const distance = calculateDistance(location.lat, location.lng, studyLoc.lat, studyLoc.lng)
          if (distance <= studyLoc.radius) {
            console.log("StudyPage (checkIfInStudyLocation): User IS IN CIRCLE:", studyLoc.name)
            return studyLoc
          }
        } else {
          console.warn(`StudyPage (checkIfInStudyLocation): Location ${studyLoc.name} has insufficient data for check.`)
        }
      }
      return false
    },
    [studyLocations],
  )

  // Determine whether the user is inside a study location.
  // This must come *after* checkIfInStudyLocation is created.
  const currentStudyZone = useMemo(() => {
    if (!userLocation || studyLocations.length === 0) return null
    return checkIfInStudyLocation(userLocation)
  }, [userLocation, studyLocations, checkIfInStudyLocation])

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  const toggleTracking = useCallback(() => {
    if (isTracking) {
      if (watchIdRef.current && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (studySession) {
        endStudySession()
      } else {
        setIsTracking(false)
      }
    } else {
      if (!isLocationPermissionGranted) {
        toast({
          title: "Location Permission Needed",
          description: "Please grant location permission to start tracking.",
          variant: "destructive",
        })
        return
      }
      if (!userLocation) {
        toast({
          title: "Location Not Available",
          description: "Waiting for location data. Please ensure location services are on.",
          variant: "destructive",
        })
        return
      }

      const currentStudyZone = checkIfInStudyLocation(userLocation)
      if (currentStudyZone) {
        const trackingStarted = startLocationTracking()
        if (trackingStarted) {
          startStudySession(currentStudyZone)
        } else {
          toast({ title: "Tracking Error", description: "Could not start location tracking.", variant: "destructive" })
        }
      } else {
        toast({
          title: "Not in Study Location",
          description: "You must be in a designated study location to track hours.",
          variant: "destructive",
        })
      }
    }
  }, [
    isTracking,
    isLocationPermissionGranted,
    userLocation,
    studySession,
    checkIfInStudyLocation,
    startLocationTracking,
    toast,
  ])

  const startStudySession = useCallback(
    async (location: StudyLocationData) => {
      if (!user || !mountedRef.current) {
        toast({ title: "Error", description: "User not identified.", variant: "destructive" })
        return
      }
      const orgId = user.organization_id || user.organizationId
      if (!orgId) {
        toast({ title: "Error", description: "Organization not identified.", variant: "destructive" })
        return
      }

      try {
        const newSessionData = {
          user_id: user.id,
          organization_id: orgId,
          location_id: location.id,
          location_name: location.name,
          start_time: new Date().toISOString(),
          status: "active" as const,
        }
        const createdSession: StudySessionData = await api.createStudySession(newSessionData)
        if (!createdSession || !createdSession.id)
          throw new Error("Failed to create session in DB or session ID missing")

        if (mountedRef.current) {
          setStudySession(createdSession)
          setIsTracking(true)
          setElapsedTime(0)
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = setInterval(() => {
            if (mountedRef.current) {
              setElapsedTime((prev) => prev + 1)
            }
          }, 1000)
          toast({
            title: "Study Session Started",
            description: `You're now studying at ${location.name}. Your hours are being tracked.`,
          })
        }
      } catch (error) {
        console.error("Failed to start study session:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: `Could not start study session: ${error.message}`,
            variant: "destructive",
          })
          setIsTracking(false)
          if (watchIdRef.current && typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
        }
      }
    },
    [user, toast],
  )

  const endStudySession = useCallback(async () => {
    if (!studySession || !studySession.id || !mountedRef.current) return
    if (!user) {
      toast({ title: "Error", description: "User not identified for ending session.", variant: "destructive" })
      return
    }
    const orgId = user.organization_id || user.organizationId
    if (!orgId) {
      toast({ title: "Error", description: "Organization not identified for ending session.", variant: "destructive" })
      return
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const endTime = new Date().toISOString()
    const durationInSeconds = elapsedTime

    try {
      const updatedSession: StudySessionData = await api.updateStudySession(studySession.id, {
        end_time: endTime,
        duration: durationInSeconds,
        status: "completed",
      })
      if (!updatedSession) throw new Error("Failed to update session in DB")

      if (mountedRef.current) {
        const userSessions: StudySessionData[] = await api.getStudySessionsByUser(user.id, orgId, "completed")
        const totalHours = userSessions.reduce((total, session) => total + (session.duration || 0) / 3600, 0)
        setStudyHours(totalHours)
        setRecentSessions(
          userSessions.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 3),
        )
        toast({
          title: "Study Session Completed",
          description: `You studied for ${formatDurationDisplay(durationInSeconds)}. Great job!`,
        })
      }
    } catch (error) {
      console.error("Failed to end study session:", error)
      if (mountedRef.current) {
        toast({ title: "Error", description: `Could not save study session: ${error.message}`, variant: "destructive" })
      }
    } finally {
      if (mountedRef.current) {
        setStudySession(null)
        setElapsedTime(0)
        setIsTracking(false)
      }
    }
  }, [studySession, user, elapsedTime, toast])

  // Memoized helper functions
  const formatTimeDisplay = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":")
  }, [])

  const formatDateDisplay = useCallback((dateString?: string): string => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  const formatDurationDisplay = useCallback((seconds?: number): string => {
    if (seconds == null || isNaN(seconds) || seconds < 0) return "0 min"
    if (seconds === 0) return "0 min"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours === 0 && minutes === 0 && seconds > 0) return "<1 min"
    if (hours === 0 && minutes === 0 && seconds === 0) return "0 min"

    const parts = []
    if (hours > 0) parts.push(`${hours} hr`)
    if (minutes > 0) parts.push(`${minutes} min`)

    return parts.length > 0 ? parts.join(" ") : "0 min"
  }, [])

  // Optimized requirement handlers
  const handleCreateRequirement = useCallback(async () => {
    if (!newRequirement.name.trim() || !user) {
      toast({
        title: "Missing Information",
        description: "Requirement name and user context are needed.",
        variant: "destructive",
      })
      return
    }
    const orgId = user.organization_id || user.organizationId
    if (!orgId) {
      toast({
        title: "Error",
        description: "Organization not identified for creating requirement.",
        variant: "destructive",
      })
      return
    }

    try {
      const org: OrganizationData | null = await api.getOrganizationById(orgId)
      if (!org) throw new Error("Organization not found")

      const newReqData: HourRequirement = {
        id: `req_${Date.now().toString()}`,
        type: "study",
        name: newRequirement.name,
        description: newRequirement.description,
        hoursRequired: Number(newRequirement.hoursRequired) || 50,
        targetUsers: selectedMembers,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      }

      const updatedOrgRequirements = [...(org.hour_requirements || []), newReqData]
      await api.updateOrganization(orgId, { hour_requirements: updatedOrgRequirements })

      if (mountedRef.current) {
        setHourRequirements(updatedOrgRequirements.filter((req) => req.type === "study"))
        toast({ title: "Requirement Added", description: "Study hour requirement added." })
      }
    } catch (error) {
      console.error("Failed to create requirement:", error)
      if (mountedRef.current) {
        toast({ title: "Error", description: `Could not add requirement: ${error.message}`, variant: "destructive" })
      }
    } finally {
      setNewRequirement({ type: "study", hoursRequired: 50, targetUsers: [], name: "", description: "" })
      setSelectedMembers([])
      setShowCreateRequirementDialog(false)
    }
  }, [newRequirement, selectedMembers, user, toast])

  const handleDeleteRequirement = useCallback(
    async (requirementId: string) => {
      if (!user) return
      const orgId = user.organization_id || user.organizationId
      if (!orgId) {
        toast({
          title: "Error",
          description: "Organization not identified for deleting requirement.",
          variant: "destructive",
        })
        return
      }

      try {
        const org: OrganizationData | null = await api.getOrganizationById(orgId)
        if (!org || !org.hour_requirements) throw new Error("Organization or requirements not found")

        const updatedOrgRequirements = org.hour_requirements.filter((req) => req.id !== requirementId)
        await api.updateOrganization(orgId, { hour_requirements: updatedOrgRequirements })

        if (mountedRef.current) {
          setHourRequirements(updatedOrgRequirements.filter((req) => req.type === "study"))
          toast({ title: "Requirement Deleted", description: "Study hour requirement deleted." })
        }
      } catch (error) {
        console.error("Failed to delete requirement:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: `Could not delete requirement: ${error.message}`,
            variant: "destructive",
          })
        }
      }
    },
    [user, toast],
  )

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-white">Loading study data...</div>
        </div>
      </div>
    )
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto p-4 text-center">
          <Alert variant="destructive" className={getCardClasses()}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-white">Authentication Error</AlertTitle>
            <AlertDescription className="text-slate-300">
              User data not found. Please{" "}
              <Link href="/login" className="underline font-semibold text-red-400">
                log in
              </Link>{" "}
              to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Study</h1>
            <p className={getSecondaryTextColor()}>Track and manage your study hours and locations.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isLocationPermissionGranted && (
              <Button
                variant={isTracking ? "destructive" : "default"}
                className={isTracking ? getButtonClasses("destructive") : getButtonClasses("default")}
                onClick={toggleTracking}
                disabled={!isTracking && (!userLocation || !currentStudyZone)}
              >
                {isTracking ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Stop Tracking
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Tracking
                  </>
                )}
              </Button>
            )}
            <Button className={getButtonClasses("default")} onClick={() => router.push("/dashboard/study/locations")}>
              <MapPin className="mr-2 h-4 w-4" />
              Study Locations
            </Button>
            {isAdmin && (
              <Dialog open={showRequirementsDialog} onOpenChange={setShowRequirementsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className={getButtonClasses("outline")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Requirements
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl glass-dialog border-white/20">
                  <DialogHeader>
                    <DialogTitle className={getTextColor()}>Study Hour Requirements</DialogTitle>
                    <DialogDescription className={getSecondaryTextColor()}>
                      Current study hour requirements for members.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-4">
                      {hourRequirements.filter((req) => req.type === "study").length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          No study hour requirements are currently set.
                        </div>
                      ) : (
                        hourRequirements
                          .filter((req) => req.type === "study")
                          .map((requirement) => (
                            <div key={requirement.id} className={getCardClasses()}>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className={`font-medium ${getTextColor()}`}>{requirement.name}</h3>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-slate-300">{requirement.hoursRequired} hours</span>
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                      onClick={() => handleDeleteRequirement(requirement.id)}
                                      aria-label={`Delete requirement ${requirement.name}`}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {requirement.description && (
                                <p className="text-sm text-slate-300 mb-2">{requirement.description}</p>
                              )}
                              <div className="text-xs text-slate-400">
                                Applies to:{" "}
                                {requirement.targetUsers.length === 0
                                  ? "All Members"
                                  : `${requirement.targetUsers.length} specific member(s)`}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    {isAdmin && (
                      <Button
                        onClick={() => {
                          setNewRequirement({
                            type: "study",
                            hoursRequired: 50,
                            targetUsers: [],
                            name: "",
                            description: "",
                          })
                          setSelectedMembers([])
                          setShowRequirementsDialog(false)
                          setTimeout(() => setShowCreateRequirementDialog(true), 100)
                        }}
                        className={getButtonClasses("default")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {locationError && (
          <Alert variant="destructive" className={getCardClasses()}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className={getTextColor()}>Location Error</AlertTitle>
            <AlertDescription className={getSecondaryTextColor()}>
              {locationError}. Please enable location services in your browser to track study hours.
            </AlertDescription>
          </Alert>
        )}

        {studySession && (
          <Card className={getCardClasses()}>
            <CardContent className="pt-6">
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-400" />
                    <span className={`font-medium ${getAccentTextColor()}`}>
                      Current Session: {studySession.location_name || "Unknown Location"}
                    </span>
                  </div>
                  <div className={`text-lg font-bold font-mono ${getAccentTextColor()}`}>
                    {formatTimeDisplay(elapsedTime)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userLocation && isLocationPermissionGranted && (
          <Card className={getCardClasses()}>
            <CardContent className="pt-6">
              {currentStudyZone ? (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-md flex items-center">
                  <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    You are currently in the <strong>{currentStudyZone?.name}</strong> study zone.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-md flex items-center">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" />
                  <span className="text-sm text-orange-700 dark:text-orange-300">You are not currently in any designated study zone.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="glass-tabs mb-4">
            <TabsTrigger value="overview" className={`glass-tab ${activeTab === "overview" ? "glass-tab-active" : ""}`}>
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className={`glass-tab ${activeTab === "requirements" ? "glass-tab-active" : ""}`}
            >
              Requirements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className={getCardClasses()}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className={getTextColor()}>Weekly Study Hours Progress</CardTitle>
                  <CardDescription className={getSecondaryTextColor()}>
                    {studyHoursGoal > 0
                      ? `${studyHours.toFixed(1)}/${studyHoursGoal} hours this week (${Math.min(100, (studyHours / studyHoursGoal) * 100).toFixed(0)}% complete)`
                      : "No weekly requirements set for you."}
                  </CardDescription>
                </div>
                <BookOpen className="h-5 w-5 text-red-400" />
              </CardHeader>
              <CardContent>
                {studyHoursGoal > 0 ? (
                  <div className="glass-progress">
                    <div
                      className="glass-progress-fill"
                      style={{ width: `${Math.min(100, (studyHours / studyHoursGoal) * 100)}%` }}
                    ></div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400">
                      Administrator needs to set study hour requirements, or they may not apply to you.
                    </p>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={`mt-2 ${getButtonClasses("outline")}`}
                        onClick={() => {
                          setActiveTab("requirements")
                          setShowCreateRequirementDialog(true)
                        }}
                      >
                        Set Requirements
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card className={getCardClasses()}>
                <CardHeader>
                  <CardTitle className={getTextColor()}>Recent Study Sessions</CardTitle>
                  <CardDescription className={getSecondaryTextColor()}>Your most recent study activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentSessions.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className={`text-lg font-medium ${getTextColor()}`}>No study sessions yet</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Visit a study location to start tracking your hours.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentSessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0"
                        >
                          <div>
                            <p className={`font-medium ${getTextColor()}`}>
                              {session.location_name || "Unknown Location"}
                            </p>
                            <p className="text-sm text-slate-400">{formatDateDisplay(session.start_time)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${getAccentTextColor()}`}>
                              {formatDurationDisplay(session.duration)}
                            </p>
                            {session.start_time && session.end_time && (
                              <p className="text-xs text-slate-400">
                                {new Date(session.start_time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {" - "}
                                {new Date(session.end_time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <Button variant="link" className="p-0 h-auto text-red-400 hover:text-red-300" asChild>
                          <Link href="/dashboard/study/sessions" className="flex items-center">
                            View all study sessions
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={getCardClasses()}>
                <CardHeader>
                  <CardTitle className={getTextColor()}>Study Locations</CardTitle>
                  <CardDescription className={getSecondaryTextColor()}>
                    Approved locations for tracking study hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {studyLocations.length === 0 ? (
                    <div className="text-center py-6">
                      <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className={`text-lg font-medium ${getTextColor()}`}>No study locations yet</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Your chapter administrators have not added any study locations yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {studyLocations.slice(0, 3).map((location) => (
                        <div
                          key={location.id}
                          className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0"
                        >
                          <div>
                            <p className={`font-medium ${getTextColor()}`}>{location.name}</p>
                            <p className="text-sm text-slate-400">{location.address || "No address provided"}</p>
                          </div>
                          <div className="flex items-center text-sm text-slate-400">
                            {location.is_box ? (
                              <span className="flex items-center">
                                <MapPin className="mr-1 h-4 w-4 text-red-400" />
                                Study Zone
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <MapPin className="mr-1 h-4 w-4 text-red-400" /> Radius: {location.radius}m
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <Button variant="link" className="p-0 h-auto text-red-400 hover:text-red-300" asChild>
                          <Link href="/dashboard/study/locations" className="flex items-center">
                            View all study locations
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requirements">
            <Card className={getCardClasses()}>
              <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className={getTextColor()}>Study Hour Requirements</CardTitle>
                  <CardDescription className={getSecondaryTextColor()}>
                    View your weekly study hour requirements and progress.
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setNewRequirement({
                        type: "study",
                        hoursRequired: 50,
                        targetUsers: [],
                        name: "",
                        description: "",
                      })
                      setSelectedMembers([])
                      setShowCreateRequirementDialog(true)
                    }}
                    className={`${getButtonClasses("default")} flex-shrink-0`}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Requirement
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="glass-table-container">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className={getMutedTextColor()}>Name</TableHead>
                        <TableHead className={getMutedTextColor()}>Description</TableHead>
                        <TableHead className={getMutedTextColor()}>Hours Required</TableHead>
                        <TableHead className={getMutedTextColor()}>Progress</TableHead>
                        {isAdmin && <TableHead className={`text-right ${getMutedTextColor()}`}>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hourRequirements.filter(
                        (req) =>
                          req.type === "study" &&
                          (req.targetUsers.length === 0 || (user && req.targetUsers.includes(user.id))),
                      ).length === 0 ? (
                        <TableRow className="border-white/10">
                          <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-400">
                            No study hour requirements applicable to you have been added yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        hourRequirements
                          .filter((req) => req.type === "study")
                          .filter((req) => req.targetUsers.length === 0 || (user && req.targetUsers.includes(user.id)))
                          .map((requirement) => (
                            <TableRow key={requirement.id} className="border-white/10">
                              <TableCell className={`font-medium ${getTextColor()}`}>{requirement.name}</TableCell>
                              <TableCell className={getSecondaryTextColor()}>
                                {requirement.description || "N/A"}
                              </TableCell>
                              <TableCell className={getSecondaryTextColor()}>
                                {requirement.hoursRequired} hours
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 glass-progress h-2.5 overflow-hidden">
                                    <div
                                      className="glass-progress-fill h-2.5"
                                      style={{
                                        width: `${Math.min(100, (studyHours / requirement.hoursRequired) * 100)}%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-slate-400">
                                    {Math.min(100, (studyHours / requirement.hoursRequired) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                    onClick={() => handleDeleteRequirement(requirement.id)}
                                    aria-label={`Delete requirement ${requirement.name}`}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showCreateRequirementDialog} onOpenChange={setShowCreateRequirementDialog}>
          <DialogContent className="max-w-md glass-dialog border-white/20">
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Create Study Hour Requirement</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                Set study hour requirements for specific members or all members.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="requirement-name" className={getTextColor()}>
                  Requirement Name
                </Label>
                <Input
                  id="requirement-name"
                  value={newRequirement.name}
                  onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })}
                  placeholder="e.g., Freshman Study Hours"
                  className="glass-input"
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
                  placeholder="e.g., Study hours for first-year members"
                  className="glass-input"
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
                  max="1000"
                  value={newRequirement.hoursRequired}
                  onChange={(e) => setNewRequirement({ ...newRequirement, hoursRequired: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="gri gap-2">
                <Label className={getTextColor()}>Target Members</Label>
                <div className={`text-sm ${getSecondaryTextColor()} mb-2`}>
                  Leave empty to apply to all members, or select specific members.
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
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
                      />
                      <Label htmlFor={`member-${member.id}`} className={`text-sm ${getTextColor()}`}>
                        {member.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateRequirementDialog(false)}
                className={getButtonClasses("outline")}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRequirement} className={getButtonClasses("default")}>
                Create Requirement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeWrapper>
  )
}
