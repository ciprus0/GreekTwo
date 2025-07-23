"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Edit,
  Trash,
  MapPin,
  Square,
  Circle,
  RotateCcw,
  Move,
  ScalingIcon as Resize,
  Dumbbell,
  Clock,
  Play,
  Target,
  Activity,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { api } from "@/lib/supabase-api"
import { useTextColors } from "@/components/theme-wrapper"
import { useThrottle, useCleanup } from "@/lib/performance-utils"
import { useTheme } from "@/lib/theme-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeWrapper } from "@/components/theme-wrapper"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-slate-600 dark:text-slate-300">Loading map...</div>
    </div>
  ),
})

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

interface GymSessionData {
  id: string
  user_id: string
  organization_id: string
  location_id: string
  location_name?: string
  start_time: string
  end_time?: string | null
  duration?: number
  status: "active" | "completed" | "paused"
}

interface GymLocationData {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  radius?: number
  is_box?: boolean
  box_coordinates?: { nw: { lat: number; lng: number }; se: { lat: number; lng: number } }
  organization_id: string
  created_by: string
  created_at: string
}

interface HourRequirement {
  id: string
  type: "gym" | "service" | "chapter"
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
  gymHours: number
  totalHours: number
}

interface HourData {
  id: string
  user_id: string
  user_name: string
  type: string
  date: string
  hours: number
  description: string
  status: string
  organization_id: string
  added_by?: string
  added_by_admin?: boolean
  created_at: string
}

export default function GymPage() {
  const router = useRouter()
  const { toast } = useToast()
  const mapRef = useRef(null)
  const [gymHours, setGymHours] = useState<number>(0)
  const [gymHoursGoal, setGymHoursGoal] = useState<number>(50)
  const [recentSessions, setRecentSessions] = useState<GymSessionData[]>([])
  const [gymLocations, setGymLocations] = useState<GymLocationData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [user, setUser] = useState<LocalStorageUser | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState<boolean>(false)
  const [gymSession, setGymSession] = useState<GymSessionData | null>(null)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] = useState<boolean>(false)
  const [hourRequirements, setHourRequirements] = useState<HourRequirement[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false)
  const [showRequirementsDialog, setShowRequirementsDialog] = useState<boolean>(false)
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false)
  const [editingLocation, setEditingLocation] = useState<GymLocationData | null>(null)
  const [clickMode, setClickMode] = useState(false)
  const [drawingMode, setDrawingMode] = useState<"circle" | "box" | null>(null)
  const [drawingBox, setDrawingBox] = useState(null)
  const [drawingCircle, setDrawingCircle] = useState(null)
  const [isMovingShape, setIsMovingShape] = useState(false)
  const [isResizingShape, setIsResizingShape] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    radius: 100,
    size: 100,
  })
  const [errors, setErrors] = useState({
    name: "",
    address: "",
  })
  const [newRequirement, setNewRequirement] = useState<{
    type: "gym"
    hoursRequired: number | string
    targetUsers: string[]
    name: string
    description: string
  }>({
    type: "gym",
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
  const [orgGymSessions, setOrgGymSessions] = useState<GymSessionData[]>([])

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
    console.log("GymPage: Initializing component and loading user from localStorage.")
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user")
      if (userData) {
        try {
          const parsedUser: LocalStorageUser = JSON.parse(userData)
          console.log("GymPage (localStorage effect): User data loaded from localStorage:", parsedUser)
          setUser(parsedUser)
          const adminRoles = ["Group Owner", "President", "Treasurer"]
          setIsAdmin(parsedUser.roles && parsedUser.roles.some((role) => adminRoles.includes(role)))
        } catch (e) {
          console.error("GymPage (localStorage effect): Failed to parse user data from localStorage.", e)
          localStorage.removeItem("user")
        }
      } else {
        console.warn("GymPage (localStorage effect): No user data found in localStorage.")
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
      console.log("GymPage (user data effect): User object is available, proceeding to fetch data.", user)
      setLoading(true)

      const fetchDataForUser = async () => {
        const orgId = user.organization_id || user.organizationId
        if (!orgId || !mountedRef.current) {
          console.warn("GymPage (user data effect): Organization ID is missing from user object.")
          setLoading(false)
          return
        }

        try {
          // Batch API calls for better performance
          const [org, userSessions, orgLocations, members] = await Promise.all([
            api.getOrganizationById(orgId),
            api.getGymSessionsByUser(user.id, orgId, "completed"),
            api.getGymLocationsByOrganization(orgId),
            isAdmin ? api.getMembersByOrganization(orgId) : Promise.resolve([]),
          ])

          if (!mountedRef.current) return // Component unmounted

          if (org && org.hour_requirements) {
            const gymReqs = org.hour_requirements.filter((req) => req.type === "gym")
            setHourRequirements(gymReqs)
            const userGymReq = gymReqs.find((req) => req.targetUsers.includes(user.id) || req.targetUsers.length === 0)
            setGymHoursGoal(userGymReq ? userGymReq.hoursRequired : 0)
          } else {
            setHourRequirements([])
            setGymHoursGoal(0)
          }

          const totalHours = userSessions.reduce((total, session) => total + (session.duration || 0) / 3600, 0)
          setGymHours(totalHours)
          setRecentSessions(
            userSessions
              .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
              .slice(0, 3),
          )

          // Check for active sessions
          const activeSessions = await api.getGymSessionsByUser(user.id, orgId, "active")
          if (activeSessions.length > 0 && mountedRef.current) {
            const activeSession = activeSessions[0]
            setGymSession(activeSession)
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

          console.log("GymPage (user data effect): Received gym locations from API:", orgLocations)
          setGymLocations(orgLocations || [])

          if (isAdmin && members) {
            setAllMembers(members || [])
          }
        } catch (error) {
          console.error("GymPage (user data effect): Failed to fetch data for user:", error)
          if (mountedRef.current) {
            toast({ title: "Error", description: "Failed to load gym data.", variant: "destructive" })
            setGymLocations([])
          }
        } finally {
          if (mountedRef.current) {
            setLoading(false)
          }
        }
      }

      fetchDataForUser()
    } else if (user === null && typeof window !== "undefined" && !localStorage.getItem("user")) {
      console.log("GymPage (user data effect): User is null and not in localStorage, skipping data fetch.")
      setLoading(false)
    } else if (user && !(user.organization_id || user.organizationId)) {
      console.warn(
        "GymPage (user data effect): User object present but organization_id is missing. Cannot fetch org-specific data.",
        user,
      )
      setGymLocations([])
      setLoading(false)
    }
  }, [user, isAdmin, toast])

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

          const currentGymZone = checkIfInGymLocation(newLocation)

          if (!currentGymZone && gymSession) {
            endGymSession()
            setIsTracking(false)
            toast({
              title: "Gym Session Ended",
              description: "You've left the gym location. Your session has been saved.",
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
  }, [userLocation, gymSession, throttledLocationUpdate, toast])

  const checkIfInGymLocation = useCallback(
    (location: { lat: number; lng: number } | null): GymLocationData | false => {
      console.log("GymPage (checkIfInGymLocation): Checking location:", location, "against gymLocations:", gymLocations)
      if (!location || !gymLocations || gymLocations.length === 0) return false

      for (const gymLoc of gymLocations) {
        console.log("GymPage (checkIfInGymLocation): Comparing with:", gymLoc.name)
        if (gymLoc.is_box && gymLoc.box_coordinates) {
          const { nw, se } = gymLoc.box_coordinates
          if (nw && se && nw.lat != null && nw.lng != null && se.lat != null && se.lng != null) {
            const inBox =
              location.lat <= nw.lat && location.lat >= se.lat && location.lng >= nw.lng && location.lng <= se.lng
            if (inBox) {
              console.log("GymPage (checkIfInGymLocation): User IS IN BOX:", gymLoc.name)
              return gymLoc
            }
          } else {
            console.warn(
              `GymPage (checkIfInGymLocation): Invalid box_coordinates for ${gymLoc.name}`,
              gymLoc.box_coordinates,
            )
          }
        } else if (gymLoc.radius != null && gymLoc.lat != null && gymLoc.lng != null) {
          const distance = calculateDistance(location.lat, location.lng, gymLoc.lat, gymLoc.lng)
          if (distance <= gymLoc.radius) {
            console.log("GymPage (checkIfInGymLocation): User IS IN CIRCLE:", gymLoc.name)
            return gymLoc
          }
        } else {
          console.warn(`GymPage (checkIfInGymLocation): Location ${gymLoc.name} has insufficient data for check.`)
        }
      }
      return false
    },
    [gymLocations],
  )

  // Determine whether the user is inside a gym location.
  // This must come *after* checkIfInGymLocation is created.
  const currentGymZone = useMemo(() => {
    if (!userLocation || gymLocations.length === 0) return null
    return checkIfInGymLocation(userLocation)
  }, [userLocation, gymLocations, checkIfInGymLocation])

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
      if (gymSession) {
        endGymSession()
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

      const currentGymZone = checkIfInGymLocation(userLocation)
      if (currentGymZone) {
        const trackingStarted = startLocationTracking()
        if (trackingStarted) {
          startGymSession(currentGymZone)
        } else {
          toast({ title: "Tracking Error", description: "Could not start location tracking.", variant: "destructive" })
        }
      } else {
        toast({
          title: "Not in Gym Location",
          description: "You must be in a designated gym location to track hours.",
          variant: "destructive",
        })
      }
    }
  }, [
    isTracking,
    isLocationPermissionGranted,
    userLocation,
    gymSession,
    checkIfInGymLocation,
    startLocationTracking,
    toast,
  ])

  const startGymSession = useCallback(
    async (location: GymLocationData) => {
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
        const createdSession: GymSessionData = await api.createGymSession(newSessionData)
        if (!createdSession || !createdSession.id)
          throw new Error("Failed to create session in DB or session ID missing")

        if (mountedRef.current) {
          setGymSession(createdSession)
          setIsTracking(true)
          setElapsedTime(0)
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = setInterval(() => {
            if (mountedRef.current) {
              setElapsedTime((prev) => prev + 1)
            }
          }, 1000)
          toast({
            title: "Gym Session Started",
            description: `You're now working out at ${location.name}. Your hours are being tracked.`,
          })
        }
      } catch (error) {
        console.error("Failed to start gym session:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: `Could not start gym session: ${error.message}`,
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

  const endGymSession = useCallback(async () => {
    if (!gymSession || !gymSession.id || !mountedRef.current) return
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
      const updatedSession: GymSessionData = await api.updateGymSession(gymSession.id, {
        end_time: endTime,
        duration: durationInSeconds,
        status: "completed",
      })
      if (!updatedSession) throw new Error("Failed to update session in DB")

      if (mountedRef.current) {
        const userSessions: GymSessionData[] = await api.getGymSessionsByUser(user.id, orgId, "completed")
        const totalHours = userSessions.reduce((total, session) => total + (session.duration || 0) / 3600, 0)
        setGymHours(totalHours)
        setRecentSessions(
          userSessions.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 3),
        )
        toast({
          title: "Gym Session Completed",
          description: `You worked out for ${formatDurationDisplay(durationInSeconds)}. Great job!`,
        })
      }
    } catch (error) {
      console.error("Failed to end gym session:", error)
      if (mountedRef.current) {
        toast({ title: "Error", description: `Could not save gym session: ${error.message}`, variant: "destructive" })
      }
    } finally {
      if (mountedRef.current) {
        setGymSession(null)
        setElapsedTime(0)
        setIsTracking(false)
      }
    }
  }, [gymSession, user, elapsedTime, toast])

  // Formats a duration (in seconds) as a readable string like "2 hr 15 min".
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

  // Map interaction handlers
  const handleMapClick = (e) => {
    if (isMovingShape) {
      if (drawingCircle) {
        setDrawingCircle({
          ...drawingCircle,
          center: { lat: e.latlng.lat, lng: e.latlng.lng },
        })
      } else if (drawingBox) {
        const latDiff = drawingBox.se.lat - drawingBox.nw.lat
        const lngDiff = drawingBox.se.lng - drawingBox.nw.lng
        setDrawingBox({
          ...drawingBox,
          nw: { lat: e.latlng.lat, lng: e.latlng.lng },
          se: { lat: e.latlng.lat + latDiff, lng: e.latlng.lng + lngDiff },
        })
      }
      setIsMovingShape(false)
      setClickMode(false)
    } else if (isResizingShape) {
      if (drawingCircle) {
        setDrawingCircle({ ...drawingCircle, isDrawing: false })
      } else if (drawingBox) {
        setDrawingBox({ ...drawingBox, isDrawing: false })
      }
      setIsResizingShape(false)
      setClickMode(false)
    } else if (clickMode && drawingMode === "circle") {
      if (!drawingCircle) {
        setDrawingCircle({
          center: { lat: e.latlng.lat, lng: e.latlng.lng },
          radius: 100,
          isDrawing: true,
        })
      } else if (drawingCircle.isDrawing) {
        setDrawingCircle({
          ...drawingCircle,
          isDrawing: false,
        })
        setClickMode(false)
      }
    } else if (clickMode && drawingMode === "box") {
      if (!drawingBox) {
        setDrawingBox({
          nw: { lat: e.latlng.lat, lng: e.latlng.lng },
          se: { lat: e.latlng.lat, lng: e.latlng.lng },
          isDrawing: true,
        })
      } else if (drawingBox.isDrawing) {
        setDrawingBox({
          ...drawingBox,
          se: { lat: e.latlng.lat, lng: e.latlng.lng },
          isDrawing: false,
        })
        setClickMode(false)
      }
    }
  }

  const handleMapMove = (e) => {
    if (drawingBox && drawingBox.isDrawing) {
      setDrawingBox({
        ...drawingBox,
        se: { lat: e.latlng.lat, lng: e.latlng.lng },
      })
    } else if (drawingCircle && drawingCircle.isDrawing) {
      const distance = calculateDistance(drawingCircle.center, { lat: e.latlng.lat, lng: e.latlng.lng })
      setDrawingCircle({
        ...drawingCircle,
        radius: Math.max(50, Math.min(500, distance)),
      })
    } else if (isResizingShape && drawingCircle) {
      const distance = calculateDistance(drawingCircle.center, { lat: e.latlng.lat, lng: e.latlng.lng })
      setDrawingCircle({
        ...drawingCircle,
        radius: Math.max(50, Math.min(500, distance)),
      })
    } else if (isResizingShape && drawingBox) {
      setDrawingBox({
        ...drawingBox,
        se: { lat: e.latlng.lat, lng: e.latlng.lng },
      })
    }
  }

  const startDrawingCircle = () => {
    setDrawingMode("circle")
    setClickMode(true)
    setDrawingBox(null)
    setIsMovingShape(false)
    setIsResizingShape(false)
    toast({
      title: "Circle Mode",
      description: "Click and drag to draw a circular gym area.",
    })
  }

  const startDrawingBox = () => {
    setDrawingMode("box")
    setClickMode(true)
    setDrawingCircle(null)
    setIsMovingShape(false)
    setIsResizingShape(false)
    toast({
      title: "Box Mode",
      description: "Click and drag to draw a rectangular gym zone.",
    })
  }

  const toggleResizeMode = () => {
    if (!drawingCircle && !drawingBox) {
      toast({
        title: "No Shape Selected",
        description: "Please draw a shape first before resizing.",
        variant: "destructive",
      })
      return
    }
    setIsResizingShape(!isResizingShape)
    setClickMode(true)
    setIsMovingShape(false)
    if (drawingCircle) setDrawingCircle({ ...drawingCircle, isDrawing: true })
    else if (drawingBox) setDrawingBox({ ...drawingBox, isDrawing: true })
    toast({
      title: "Resize Mode",
      description: "Move your mouse to resize the shape, then click to confirm.",
    })
  }

  const toggleMoveMode = () => {
    if (!drawingCircle && !drawingBox) {
      toast({
        title: "No Shape Selected",
        description: "Please draw a shape first before moving.",
        variant: "destructive",
      })
      return
    }
    setIsMovingShape(!isMovingShape)
    setClickMode(true)
    setIsResizingShape(false)
    toast({
      title: "Move Mode",
      description: "Click on the map to move the shape to a new location.",
    })
  }

  const confirmResize = () => {
    if (drawingCircle) setDrawingCircle({ ...drawingCircle, isDrawing: false })
    else if (drawingBox) setDrawingBox({ ...drawingBox, isDrawing: false })
    setIsResizingShape(false)
    setClickMode(false)
    toast({
      title: "Resize Complete",
      description: "Shape has been resized successfully.",
    })
  }

  const startMoving = () => {
    if (!drawingCircle && !drawingBox) {
      toast({
        title: "No Shape Selected",
        description: "Please draw a shape first before moving.",
        variant: "destructive",
      })
      return
    }
    setIsMovingShape(true)
    setClickMode(true)
    setIsResizingShape(false)
    toast({
      title: "Move Mode",
      description: "Click on the map to move the shape to a new location.",
    })
  }

  const clearDrawing = () => {
    setDrawingBox(null)
    setDrawingCircle(null)
    setClickMode(false)
    setDrawingMode(null)
    setIsMovingShape(false)
    setIsResizingShape(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const validateForm = () => {
    let valid = true
    const newErrors = { name: "", address: "" }
    if (!formData.name.trim()) {
      newErrors.name = "Location name is required"
      valid = false
    }
    setErrors(newErrors)
    return valid
  }

  const handleSaveLocation = async () => {
    console.log("GymPage (handleSaveLocation): Starting save...")
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please check form fields.", variant: "destructive" })
      return
    }

    const currentUserId = user?.id
    const currentOrgId = user?.organizationId || user?.organization_id

    console.log("GymPage (handleSaveLocation): User ID:", currentUserId, "Org ID:", currentOrgId)

    if (!user || !currentUserId || !currentOrgId) {
      console.error("GymPage (handleSaveLocation): User data missing or incomplete.")
      toast({ title: "User Error", description: "User data unavailable. Please log in.", variant: "destructive" })
      return
    }

    let locationData: Omit<GymLocationData, "id" | "created_at">

    if (drawingCircle) {
      locationData = {
        name: formData.name,
        address: formData.address || undefined,
        lat: drawingCircle.center.lat,
        lng: drawingCircle.center.lng,
        radius: drawingCircle.radius,
        is_box: false,
        created_by: currentUserId,
        organization_id: currentOrgId,
      }
    } else if (drawingBox) {
      locationData = {
        name: formData.name,
        address: formData.address || undefined,
        lat: (drawingBox.nw.lat + drawingBox.se.lat) / 2,
        lng: (drawingBox.nw.lng + drawingBox.se.lng) / 2,
        is_box: true,
        box_coordinates: { nw: drawingBox.nw, se: drawingBox.se },
        created_by: currentUserId,
        organization_id: currentOrgId,
      }
    } else {
      toast({ title: "No Shape Drawn", description: "Please draw a location shape.", variant: "destructive" })
      return
    }

    console.log("GymPage (handleSaveLocation): Location data to save:", locationData)

    try {
      const newLocation = await api.createGymLocation(locationData)
      if (!newLocation || !newLocation.id) throw new Error("Failed to save location to DB.")
      console.log("GymPage (handleSaveLocation): Location saved, newLocation:", newLocation)
      setGymLocations((prev) => [...prev, newLocation])
      setFormData({ name: "", address: "", radius: 100, size: 100 })
      clearDrawing()
      setShowCreateDialog(false)
      toast({ title: "Location Added", description: "Gym location added successfully." })
    } catch (error) {
      console.error("GymPage (handleSaveLocation): Error saving location:", error)
      toast({ title: "Error Saving", description: `Could not save location. ${error.message}`, variant: "destructive" })
    }
  }

  const handleEditLocation = (location: GymLocationData) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      address: location.address || "",
      radius: location.radius || 100,
      size: 100,
    })
    setShowEditDialog(true)
  }

  const handleUpdateLocation = async () => {
    if (!validateForm() || !editingLocation) return

    const updates: Partial<GymLocationData> = {
      name: formData.name,
      address: formData.address || undefined,
    }
    if (!editingLocation.is_box) {
      updates.radius = Number(formData.radius)
    }

    try {
      const updatedLocation = await api.updateGymLocation(editingLocation.id, updates)
      if (!updatedLocation) throw new Error("Failed to update location in DB")
      setGymLocations((prev) => prev.map((loc) => (loc.id === editingLocation.id ? updatedLocation : loc)))
      setShowEditDialog(false)
      setEditingLocation(null)
      toast({ title: "Location Updated", description: "Gym location updated successfully." })
    } catch (error) {
      console.error("Failed to update location:", error)
      toast({ title: "Error", description: "Could not update gym location.", variant: "destructive" })
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    try {
      const success = await api.deleteGymLocation(locationId)
      if (!success) throw new Error("Failed to delete location from DB")
      setGymLocations((prev) => prev.filter((loc) => loc.id !== locationId))
      toast({ title: "Location Deleted", description: "Gym location deleted successfully." })
    } catch (error) {
      console.error("Failed to delete location:", error)
      toast({ title: "Error", description: "Could not delete gym location.", variant: "destructive" })
    }
  }

  const handleRequirementInputChange = (e) => {
    const { name, value } = e.target
    setNewRequirement((prev) => ({ ...prev, [name]: value }))
  }

  const handleHoursRequiredChange = (value) => {
    setNewRequirement((prev) => ({ ...prev, hoursRequired: Number(value) }))
  }

  const handleMemberSelection = (memberId) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId)
      } else {
        return [...prev, memberId]
      }
    })
  }

  const handleSelectAllMembers = () => {
    if (selectedMembers.length === allMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(allMembers.map((member) => member.id))
    }
  }

  const handleSaveRequirement = async () => {
    if (!user) {
      toast({ title: "Error", description: "User not identified.", variant: "destructive" })
      return
    }

    const orgId = user.organization_id || user.organizationId
    if (!orgId) {
      toast({ title: "Error", description: "Organization not identified.", variant: "destructive" })
      return
    }

    if (!newRequirement.name) {
      toast({ title: "Validation Error", description: "Requirement name is required.", variant: "destructive" })
      return
    }

    if (!newRequirement.hoursRequired || Number(newRequirement.hoursRequired) <= 0) {
      toast({
        title: "Validation Error",
        description: "Hours required must be a positive number.",
        variant: "destructive",
      })
      return
    }

    try {
      // Get current organization
      const org = await api.getOrganizationById(orgId)
      if (!org) throw new Error("Organization not found")

      // Create new requirement
      const newReq = {
        id: crypto.randomUUID(),
        type: "gym" as const,
        name: newRequirement.name,
        description: newRequirement.description,
        hoursRequired: Number(newRequirement.hoursRequired),
        targetUsers: selectedMembers,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      }

      // Update organization with new requirement
      const currentRequirements = org.hour_requirements || []
      const updatedRequirements = [...currentRequirements, newReq]

      await api.updateOrganization(orgId, { hour_requirements: updatedRequirements })

      // Update local state
      setHourRequirements((prev) => [...prev, newReq])
      setNewRequirement({
        type: "gym",
        hoursRequired: 50,
        targetUsers: [],
        name: "",
        description: "",
      })
      setSelectedMembers([])
      setShowRequirementsDialog(false)

      toast({ title: "Requirement Added", description: "Gym hour requirement added successfully." })
    } catch (error) {
      console.error("Failed to save requirement:", error)
      toast({ title: "Error", description: "Could not save gym requirement.", variant: "destructive" })
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={getCardClasses()}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const progressPercentage = gymHoursGoal > 0 ? Math.min((gymHours / gymHoursGoal) * 100, 100) : 0

  return (
    <ThemeWrapper>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className={`text-3xl font-bold ${getTextColor()}`}>Gym Tracking</h1>
          <p className={`${getSecondaryTextColor()}`}>Track your workout sessions and monitor your fitness progress</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${getSecondaryTextColor()}`}>This Week's Hours</CardTitle>
              <Dumbbell className={`h-4 w-4 ${getMutedTextColor()}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTextColor()}`}>{gymHours.toFixed(1)}</div>
              <p className={`text-xs ${getMutedTextColor()}`}>
                {gymHoursGoal > 0 ? `of ${gymHoursGoal} hours goal` : "No goal set"}
              </p>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${getSecondaryTextColor()}`}>Progress</CardTitle>
              <Target className={`h-4 w-4 ${getMutedTextColor()}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTextColor()}`}>{progressPercentage.toFixed(0)}%</div>
              <Progress value={progressPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${getSecondaryTextColor()}`}>Sessions</CardTitle>
              <Activity className={`h-4 w-4 ${getMutedTextColor()}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTextColor()}`}>{recentSessions.length}</div>
              <p className={`text-xs ${getMutedTextColor()}`}>This week</p>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${getSecondaryTextColor()}`}>Locations</CardTitle>
              <MapPin className={`h-4 w-4 ${getMutedTextColor()}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTextColor()}`}>{gymLocations.length}</div>
              <p className={`text-xs ${getMutedTextColor()}`}>Available gyms</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Tracking */}
          <div className="space-y-6">
            <Card className={getCardClasses()}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${getTextColor()}`}>
                  <Dumbbell className="h-5 w-5" />
                  Workout Tracking
                </CardTitle>
                <CardDescription className={getSecondaryTextColor()}>
                  {isTracking ? "Currently tracking your workout" : "Start tracking your gym session"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isTracking && gymSession ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getTextColor()}`}>{formatTimeDisplay(elapsedTime)}</div>
                      <p className={`text-sm ${getSecondaryTextColor()}`}>Working out at {gymSession.location_name}</p>
                    </div>
                    <Button onClick={toggleTracking} className={`w-full ${getButtonClasses("destructive")}`}>
                      <Square className="h-4 w-4 mr-2" />
                      Stop Workout
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentGymZone ? (
                      <div className="text-center space-y-2">
                        <Badge variant="secondary" className="mb-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          At {currentGymZone.name}
                        </Badge>
                        <Button onClick={toggleTracking} className={`w-full ${getButtonClasses()}`}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Workout
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <p className={`text-sm ${getMutedTextColor()}`}>
                          {locationError ? locationError : "Move to a gym location to start tracking"}
                        </p>
                        <Button disabled className={`w-full ${getButtonClasses()}`}>
                          <MapPin className="h-4 w-4 mr-2" />
                          Not at Gym
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card className={getCardClasses()}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${getTextColor()}`}>
                  <Clock className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${getTextColor()}`}>
                            {session.location_name || "Unknown Location"}
                          </p>
                          <p className={`text-sm ${getMutedTextColor()}`}>
                            {new Date(session.start_time).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{formatDurationDisplay(session.duration)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${getMutedTextColor()}`}>No recent sessions. Start your first workout!</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Locations */}
          <div className="space-y-6">
            <Card className={getCardClasses()}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className={`flex items-center gap-2 ${getTextColor()}`}>
                    <MapPin className="h-5 w-5" />
                    Gym Locations
                  </CardTitle>
                </div>
                {isAdmin && (
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className={`${getButtonClasses("outline")} flex-shrink-0`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={`${getCardClasses()} sm:max-w-[900px] max-h-[90vh] overflow-y-auto shadow-2xl`}>
                      <DialogHeader>
                        <DialogTitle className={getTextColor()}>Create New Gym Location</DialogTitle>
                        <DialogDescription className={getSecondaryTextColor()}>
                          Draw a shape on the map and fill in the details to create a new gym location.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant={drawingMode === "circle" ? "default" : "outline"}
                            size="sm"
                            onClick={startDrawingCircle}
                            className={
                              drawingMode === "circle"
                                ? "bg-rose-700 hover:bg-rose-800 text-white"
                                : `${getButtonClasses("outline")}`
                            }
                          >
                            <Circle className="mr-2 h-4 w-4" /> Circle
                          </Button>
                          <Button
                            variant={drawingMode === "box" ? "default" : "outline"}
                            size="sm"
                            onClick={startDrawingBox}
                            className={
                              drawingMode === "box"
                                ? "bg-rose-700 hover:bg-rose-800 text-white"
                                : `${getButtonClasses("outline")}`
                            }
                          >
                            <Square className="mr-2 h-4 w-4" /> Square
                          </Button>
                          <Button
                            variant={isResizingShape ? "default" : "outline"}
                            size="sm"
                            onClick={toggleResizeMode}
                            className={
                              isResizingShape
                                ? "bg-rose-700 hover:bg-rose-800 text-white"
                                : `${getButtonClasses("outline")}`
                            }
                          >
                            <Resize className="mr-2 h-4 w-4" /> Resize
                          </Button>
                          {isResizingShape && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={confirmResize}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Confirm Resize
                            </Button>
                          )}
                          <Button
                            variant={isMovingShape ? "default" : "outline"}
                            size="sm"
                            onClick={toggleMoveMode}
                            className={
                              isMovingShape
                                ? "bg-rose-700 hover:bg-rose-800 text-white"
                                : `${getButtonClasses("outline")}`
                            }
                          >
                            <Move className="mr-2 h-4 w-4" /> Move
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearDrawing}
                            className={`${getButtonClasses("outline")}`}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" /> Clear
                          </Button>
                        </div>
                        <div className="h-[400px] rounded-lg overflow-hidden border border-slate-600">
                          <MapComponent
                            userLocation={userLocation}
                            studyLocations={gymLocations}
                            onMapClick={handleMapClick}
                            onMapMove={handleMapMove}
                            clickMode={clickMode}
                            drawingBox={drawingBox}
                            drawingCircle={drawingCircle}
                            useAppleMaps={false}
                            isMovingShape={isMovingShape}
                            isResizingShape={isResizingShape}
                            mapRef={mapRef}
                          />
                        </div>
                        {(drawingCircle || drawingBox) && (
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="location-name" className={getTextColor()}>
                                Location Name
                              </Label>
                              <Input
                                id="location-name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., University Gym"
                                className={`${getCardClasses()} ${errors.name ? "border-red-500" : ""}`}
                              />
                              {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="location-address" className={getTextColor()}>
                                Address (Optional)
                              </Label>
                              <Input
                                id="location-address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="e.g., 123 University Ave"
                                className={getCardClasses()}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleSaveLocation} className={`${getButtonClasses("default")}`}>
                                Save Location
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  clearDrawing()
                                  setShowCreateDialog(false)
                                }}
                                className={`${getButtonClasses("outline")}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {gymLocations.length > 0 ? (
                  <div className="space-y-3">
                    {gymLocations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${getTextColor()}`}>{location.name}</p>
                          {location.address && <p className={`text-sm ${getMutedTextColor()}`}>{location.address}</p>}
                        </div>
                        {isAdmin ? (
                          <div className="flex gap-2">
                            <Dialog
                              open={showEditDialog && editingLocation?.id === location.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setShowEditDialog(false)
                                  setEditingLocation(null)
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
                                  onClick={() => handleEditLocation(location)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-[500px] shadow-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Edit Gym Location</DialogTitle>
                                  <DialogDescription className="text-slate-300">
                                    Update the details of this gym location.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-location-name" className="text-white">
                                      Location Name
                                    </Label>
                                    <Input
                                      id="edit-location-name"
                                      name="name"
                                      value={formData.name}
                                      onChange={handleInputChange}
                                      className={`bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 ${
                                        errors.name ? "border-red-500" : ""
                                      }`}
                                    />
                                    {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-location-address" className="text-white">
                                      Address
                                    </Label>
                                    <Input
                                      id="edit-location-address"
                                      name="address"
                                      value={formData.address}
                                      onChange={handleInputChange}
                                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                  </div>
                                  {!editingLocation?.is_box && (
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-location-radius" className="text-white">
                                        Radius (meters): {formData.radius}m
                                      </Label>
                                      <Input
                                        id="edit-location-radius"
                                        name="radius"
                                        type="range"
                                        min="50"
                                        max="500"
                                        step="10"
                                        value={formData.radius}
                                        onChange={handleInputChange}
                                        className="bg-slate-700"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setShowEditDialog(false)
                                      setEditingLocation(null)
                                    }}
                                    className="bg-transparent border-slate-600 text-white hover:bg-slate-700"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    className="bg-rose-700 hover:bg-rose-800 text-white"
                                    onClick={handleUpdateLocation}
                                  >
                                    Update Location
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              onClick={() => handleDeleteLocation(location.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant={currentGymZone?.id === location.id ? "default" : "outline"}>
                            {currentGymZone?.id === location.id ? "Current" : "Available"}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <p className={`text-sm ${getMutedTextColor()}`}>No gym locations configured yet.</p>
                    {isAdmin && (
                      <p className={`text-xs ${getMutedTextColor()}`}>Add gym locations to enable workout tracking.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hour Requirements */}
            {isAdmin && (
              <Card className={getCardClasses()}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className={`flex items-center gap-2 ${getTextColor()}`}>
                      <Target className="h-5 w-5" />
                      Hour Requirements
                    </CardTitle>
                  </div>
                  <Dialog open={showRequirementsDialog} onOpenChange={setShowRequirementsDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className={`${getButtonClasses("outline")} flex-shrink-0`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Requirement
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={`${getCardClasses()} sm:max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl`}>
                      <DialogHeader>
                        <DialogTitle className={getTextColor()}>Create Gym Hour Requirement</DialogTitle>
                        <DialogDescription className={getSecondaryTextColor()}>
                          Set gym hour requirements for specific members or all members.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="requirement-name" className={getTextColor()}>
                            Requirement Name
                          </Label>
                          <Input
                            id="requirement-name"
                            name="name"
                            value={newRequirement.name}
                            onChange={handleRequirementInputChange}
                            placeholder="e.g., Weekly Gym Hours"
                            className={getCardClasses()}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="requirement-description" className={getTextColor()}>
                            Description (Optional)
                          </Label>
                          <Input
                            id="requirement-description"
                            name="description"
                            value={newRequirement.description}
                            onChange={handleRequirementInputChange}
                            placeholder="e.g., Minimum gym hours per week"
                            className={getCardClasses()}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="requirement-hours" className={getTextColor()}>
                            Hours Required
                          </Label>
                          <Input
                            id="requirement-hours"
                            name="hoursRequired"
                            type="number"
                            min="0"
                            step="0.5"
                            value={newRequirement.hoursRequired}
                            onChange={handleRequirementInputChange}
                            className={getCardClasses()}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className={getTextColor()}>Target Members</Label>
                          <p className={`text-sm ${getSecondaryTextColor()}`}>
                            Leave empty to apply to all members, or select specific members.
                          </p>
                          <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                            {allMembers.map((member) => (
                              <div key={member.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`member-${member.id}`}
                                  checked={selectedMembers.includes(member.id)}
                                  onCheckedChange={() => handleMemberSelection(member.id)}
                                  className="border-slate-500 data-[state=checked]:bg-rose-700 data-[state=checked]:border-rose-700"
                                />
                                <Label
                                  htmlFor={`member-${member.id}`}
                                  className={`text-sm cursor-pointer ${getTextColor()}`}
                                >
                                  {member.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setShowRequirementsDialog(false)}
                            className={`${getButtonClasses("outline")}`}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleSaveRequirement} className={`${getButtonClasses("default")}`}>
                            Save Requirement
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {hourRequirements.length > 0 ? (
                    <div className="space-y-3">
                      {hourRequirements.map((req) => (
                        <div key={req.id} className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${getTextColor()}`}>{req.name}</p>
                            <p className={`text-sm ${getMutedTextColor()}`}>{req.hoursRequired} hours required</p>
                          </div>
                          <Badge variant="outline">
                            {req.targetUsers.length === 0 ? "All Members" : `${req.targetUsers.length} Members`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${getMutedTextColor()}`}>No gym hour requirements set.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Map View */}
        <div className={`${getCardClasses()} overflow-hidden`}>
          <div className="p-6 border-b">
            <h2 className={`text-xl font-semibold ${getTextColor()}`}>Map View</h2>
            <p className={`text-sm ${getSecondaryTextColor()}`}>Visual representation of all gym locations and your current location.</p>
          </div>
          <div className="h-[500px]">
            {!showCreateDialog && !showRequirementsDialog && (
              <MapComponent
                userLocation={userLocation}
                studyLocations={gymLocations}
                mapRef={mapRef}
              />
            )}
          </div>
        </div>

        {!isAdmin && (
          <Card className={getCardClasses()}>
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <MapPin className={`h-12 w-12 ${getMutedTextColor()} mx-auto mb-4`} />
                <h3 className={`text-lg font-medium mb-2 ${getTextColor()}`}>Need a New Gym Location?</h3>
                <p className={`text-sm ${getSecondaryTextColor()} mb-4`}>
                  Contact your chapter administrators to request new gym locations be added.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ThemeWrapper>
  )
}