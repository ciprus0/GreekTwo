"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Clock,
  Trash,
  Edit,
  MoreVertical,
  X,
  ImageIcon,
  MapPin,
  Bell,
  Divide,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/supabase-api"
import { useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"

export default function EventsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const eventIdParam = searchParams.get("event")
  const fileInputRef = useRef(null)
  const { theme } = useTheme()

  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [eventAttendees, setEventAttendees] = useState({}) // Store attendees by event ID
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [dateEvents, setDateEvents] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isMultiEventDialogOpen, setIsMultiEventDialogOpen] = useState(false)
  const [isAttendeesDialogOpen, setIsAttendeesDialogOpen] = useState(false)
  const [selectedEventAttendees, setSelectedEventAttendees] = useState([])
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  // Quick event creation states
  const [isQuickEventOpen, setIsQuickEventOpen] = useState(false)
  const [quickEventDate, setQuickEventDate] = useState(null)
  const [quickEventTitle, setQuickEventTitle] = useState("")
  const [showTimeInput, setShowTimeInput] = useState(false)
  const [quickEventStartTime, setQuickEventStartTime] = useState("")
  const [quickEventEndTime, setQuickEventEndTime] = useState("")
  const [isAllDay, setIsAllDay] = useState(true)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [quickEventLocation, setQuickEventLocation] = useState("")
  const [quickEventDescription, setQuickEventDescription] = useState("")
  const [quickEventType, setQuickEventType] = useState("social")
  const [quickEventPledgeExempt, setQuickEventPledgeExempt] = useState(false)
  const [quickEventRequired, setQuickEventRequired] = useState(false)

  // Recurrence states
  const [recurrenceType, setRecurrenceType] = useState("none")
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false)
  const [customRecurrence, setCustomRecurrence] = useState({
    interval: 1,
    frequency: "week", // day, week, month, year
    daysOfWeek: [], // for weekly recurrence
    endType: "never", // never, on, after
    endDate: "",
    endAfter: 1,
  })

  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    type: "social",
    maxAttendees: "",
    requiresRSVP: false,
    image: null,
    startTime: "",
    endTime: "",
    required: false,
    pledge_exempt: false,
  })

  const [selectedImages, setSelectedImages] = useState([])

  // Load user data once on mount
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    }
  }, [])

  // Load events data when user is available
  useEffect(() => {
    if (user?.organizationId) {
      loadEventsData()
    }
  }, [user?.organizationId, eventIdParam])

  const loadEventsData = async () => {
    if (!user?.organizationId) return

    setLoading(true)
    try {
      // Load events and members from Supabase
      const [orgEvents, orgMembers] = await Promise.all([
        api.getEventsByOrganization(user.organizationId),
        api.getMembersByOrganization(user.organizationId),
      ])

      // Sort events by start time
      const sortedEvents = [...orgEvents].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )

      setEvents(sortedEvents)
      setMembers(orgMembers)

      // Load attendees for each event
      const attendeesData = {}
      for (const event of orgEvents) {
        try {
          const attendees = await api.getEventAttendees(event.id)
          attendeesData[event.id] = attendees
        } catch (error) {
          console.warn(`Could not load attendees for event ${event.id}:`, error)
          attendeesData[event.id] = []
        }
      }
      setEventAttendees(attendeesData)

      // Load event images
      for (const event of orgEvents) {
        try {
          const images = await api.getEventImages(event.id)
          if (images && images.length > 0) {
            event.images = images
          }
        } catch (error) {
          console.warn(`Could not load images for event ${event.id}:`, error)
        }
      }

      if (eventIdParam) {
        const eventFromParam = orgEvents.find((event) => event.id === eventIdParam)
        if (eventFromParam) {
          setSelectedEvent(eventFromParam)
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load events.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleTypeFilter = (value) => {
    setTypeFilter(value)
  }

  const resetFormData = () => {
    setFormData({
      id: "",
      title: "",
      description: "",
      type: "social",
      location: "",
      date: "",
      startTime: "",
      endTime: "",
      required: false,
      pledge_exempt: false,
    })
    setSelectedImages([])
    setIsEditMode(false)
  }

  const resetQuickEventData = () => {
    setQuickEventTitle("")
    setQuickEventLocation("")
    setQuickEventDescription("")
    setQuickEventType("social")
    setQuickEventStartTime("")
    setQuickEventEndTime("")
    setIsAllDay(true)
    setShowTimeInput(false)
    setShowMoreOptions(false)
    setRecurrenceType("none")
    setCustomRecurrence({
      interval: 1,
      frequency: "week",
      daysOfWeek: [],
      endType: "never",
      endDate: "",
      endAfter: 1,
    })
    setQuickEventPledgeExempt(false)
    setQuickEventRequired(false)
  }

  const buildRepeatData = () => {
    if (recurrenceType === "none") return null

    const repeatData = {
      interval: customRecurrence.interval,
      frequency: customRecurrence.frequency,
      ends: customRecurrence.endType,
    }

    if (customRecurrence.daysOfWeek.length > 0) {
      repeatData.daysOfWeek = customRecurrence.daysOfWeek
    }

    if (customRecurrence.endType === "on" && customRecurrence.endDate) {
      repeatData.endDate = customRecurrence.endDate
    }

    if (customRecurrence.endType === "after" && customRecurrence.endAfter) {
      repeatData.occurrences = customRecurrence.endAfter
    }

    return repeatData
  }

  const getRecurrenceDisplayText = () => {
    if (recurrenceType === "none") return "Does not repeat"

    if (recurrenceType === "custom") {
      let text = `Every ${customRecurrence.interval > 1 ? customRecurrence.interval + " " : ""}${customRecurrence.frequency}`
      if (customRecurrence.interval > 1) {
        text += customRecurrence.frequency === "week" ? "s" : customRecurrence.frequency === "day" ? "s" : "s"
      }

      if (customRecurrence.frequency === "week" && customRecurrence.daysOfWeek.length > 0) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        const selectedDays = customRecurrence.daysOfWeek.map((day) => dayNames[day]).join(", ")
        text += ` on ${selectedDays}`
      }

      if (customRecurrence.endType === "on" && customRecurrence.endDate) {
        const endDate = new Date(customRecurrence.endDate)
        text += `, until ${endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      } else if (customRecurrence.endType === "after" && customRecurrence.endAfter) {
        text += `, ${customRecurrence.endAfter} time${customRecurrence.endAfter > 1 ? "s" : ""}`
      }

      return text
    }

    // Handle preset recurrence types
    switch (recurrenceType) {
      case "daily":
        return "Daily"
      case "weekdays":
        return "Every weekday (Monday to Friday)"
      case "weekly":
        return `Weekly on ${quickEventDate?.toLocaleDateString(undefined, { weekday: "long" })}`
      case "monthly":
        return `Monthly on day ${quickEventDate?.getDate()}`
      case "yearly":
        return `Annually on ${quickEventDate?.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`
      default:
        return "Does not repeat"
    }
  }

  // Generate expanded events for display (including recurring occurrences)
  const getExpandedEvents = () => {
    const expandedEvents = []
    const today = new Date()
    const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())

    filteredEvents.forEach((event) => {
      const eventStartTime = new Date(event.start_time)
      const eventEndTime = new Date(event.end_time)
      const duration = eventEndTime.getTime() - eventStartTime.getTime()

      if (!event.repeat) {
        // Non-recurring event - just add the original
        expandedEvents.push(event)
        return
      }

      // Recurring event - generate occurrences based on repeat data
      const repeat = event.repeat
      const currentDate = new Date(eventStartTime)
      let occurrenceCount = 0
      const maxOccurrences = 365 // Safety limit

      while (currentDate <= oneYearFromNow && occurrenceCount < maxOccurrences) {
        // Check if we've reached the end date
        if (repeat.ends === "on" && repeat.endDate) {
          const endDate = new Date(repeat.endDate)
          if (currentDate > endDate) break
        }

        // Check if we've reached the occurrence limit
        if (repeat.ends === "after" && repeat.occurrences && occurrenceCount >= repeat.occurrences) {
          break
        }

        // Check if this date should have an occurrence
        let shouldInclude = false

        if (occurrenceCount === 0) {
          // Always include the first occurrence (original event date)
          shouldInclude = true
        } else {
          // Check based on frequency and interval
          switch (repeat.frequency) {
            case "daily":
              shouldInclude = true
              break

            case "weekly":
              // For weekly, check if current day is in the allowed days
              if (repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
                shouldInclude = repeat.daysOfWeek.includes(currentDate.getDay())
              } else {
                // If no specific days, use the original day of week
                shouldInclude = currentDate.getDay() === eventStartTime.getDay()
              }
              break

            case "monthly":
              // Monthly on the same date
              shouldInclude = currentDate.getDate() === eventStartTime.getDate()
              break

            case "yearly":
              // Yearly on the same month and date
              shouldInclude =
                currentDate.getMonth() === eventStartTime.getMonth() &&
                currentDate.getDate() === eventStartTime.getDate()
              break

            default:
              shouldInclude = false
          }
        }

        if (shouldInclude) {
          // Create the occurrence with the correct time
          const occurrenceStartTime = new Date(currentDate)
          occurrenceStartTime.setHours(
            eventStartTime.getHours(),
            eventStartTime.getMinutes(),
            eventStartTime.getSeconds(),
          )

          const occurrenceEndTime = new Date(occurrenceStartTime.getTime() + duration)

          expandedEvents.push({
            ...event,
            start_time: occurrenceStartTime.toISOString(),
            end_time: occurrenceEndTime.toISOString(),
            isRecurringOccurrence: occurrenceCount > 0,
            originalEventId: event.id,
            occurrenceIndex: occurrenceCount,
          })

          occurrenceCount++
        }

        // Move to the next potential date based on frequency and interval
        switch (repeat.frequency) {
          case "daily":
            currentDate.setDate(currentDate.getDate() + (repeat.interval || 1))
            break

          case "weekly":
            if (repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
              // Move to next day to check all days in the week
              currentDate.setDate(currentDate.getDate() + 1)

              // If we've gone through a full week, skip ahead by the interval
              const weeksSinceStart = Math.floor((currentDate - eventStartTime) / (7 * 24 * 60 * 60 * 1000))
              if (weeksSinceStart > 0 && weeksSinceStart % (repeat.interval || 1) !== 0) {
                // Skip to the next interval week
                const daysToSkip = 7 * (repeat.interval || 1) - (currentDate.getDay() === 0 ? 7 : currentDate.getDay())
                currentDate.setDate(currentDate.getDate() + daysToSkip)
              }
            } else {
              // Move by week intervals
              currentDate.setDate(currentDate.getDate() + 7 * (repeat.interval || 1))
            }
            break

          case "monthly":
            currentDate.setMonth(currentDate.getMonth() + (repeat.interval || 1))
            break

          case "yearly":
            currentDate.setFullYear(currentDate.getFullYear() + (repeat.interval || 1))
            break

          default:
            // Fallback - move by day
            currentDate.setDate(currentDate.getDate() + 1)
        }

        // Safety check to prevent infinite loops
        if (occurrenceCount === 0 && currentDate.getTime() === eventStartTime.getTime()) {
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
    })

    return expandedEvents
  }

  const handleQuickEventSave = async () => {
    if (!quickEventTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter an event title.",
        variant: "destructive",
      })
      return
    }

    try {
      const eventDate = quickEventDate
      let startDateTime, endDateTime

      if (isAllDay) {
        startDateTime = new Date(eventDate)
        startDateTime.setHours(0, 0, 0, 0)
        endDateTime = new Date(eventDate)
        endDateTime.setHours(23, 59, 59, 999)
      } else {
        const startTime = quickEventStartTime || "09:00"
        const endTime = quickEventEndTime || "10:00"
        startDateTime = new Date(`${eventDate.toISOString().split("T")[0]}T${startTime}:00`)
        endDateTime = new Date(`${eventDate.toISOString().split("T")[0]}T${endTime}:00`)
      }

      const repeatData = buildRepeatData()

      const eventData = {
        title: quickEventTitle,
        description: quickEventDescription,
        type: quickEventType,
        location: quickEventLocation,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        organization_id: user.organizationId,
        created_by: user.id,
        repeat: repeatData,
        pledge_exempt: quickEventPledgeExempt,
        required: quickEventRequired,
      }

      // Create only one event with repeat information
      const newEvent = await api.createEvent(eventData)

      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      })

      setIsQuickEventOpen(false)
      resetQuickEventData()
      
      // Immediately add the new event to the local state to show it on calendar
      setEvents((prev) => {
        const updatedEvents = [...prev, newEvent]
        return updatedEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      })
      
      // Force re-render by updating the events state
      setEvents((prev) => {
        const updatedEvents = [...prev, newEvent]
        return updatedEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      })
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Failed to create event.",
        variant: "destructive",
      })
    }
  }

  const handleEditEvent = (event) => {
    const startTime = new Date(event.start_time)
    const endTime = new Date(event.end_time)

    setFormData({
      id: event.id,
      title: event.title,
      description: event.description || "",
      type: event.type || "social",
      location: event.location,
      date: startTime.toISOString().split("T")[0],
      startTime: startTime.toTimeString().slice(0, 5),
      endTime: endTime.toTimeString().slice(0, 5),
      required: event.required || false,
      pledge_exempt: event.pledge_exempt || false,
    })

    // Load existing images if any
    if (event.images && event.images.length > 0) {
      setSelectedImages(event.images)
    } else {
      setSelectedImages([])
    }

    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  const handleDeleteEvent = async (eventId) => {
    try {
      await api.deleteEvent(eventId)
      setEvents(events.filter((event) => event.id !== eventId))
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null)
      }

      toast({
        title: "Event deleted",
        description: "The event has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      })
    }
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const newImages = files.map((file) => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
    }))

    setSelectedImages((prev) => [...prev, ...newImages])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (imageId) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  const handleCreateOrUpdateEvent = async () => {
    if (!formData.title.trim() || !formData.date || !formData.startTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create datetime objects
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`)
      const endDateTime = formData.endTime
        ? new Date(`${formData.date}T${formData.endTime}:00`)
        : new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours later

      const eventData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        location: formData.location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        organization_id: user.organizationId,
        created_by: user.id,
        pledge_exempt: formData.pledge_exempt,
      }

      let updatedEvent

      if (isEditMode) {
        // Update existing event
        updatedEvent = await api.updateEvent(formData.id, eventData)

        // Handle images
        if (selectedImages.length > 0) {
          // Upload new images
          const newImages = selectedImages.filter((img) => img.file)
          for (const image of newImages) {
            await api.uploadEventImage(formData.id, image.file, user.id)
          }
        }

        // Reload event to get updated images
        const refreshedEvent = await api.getEventById(formData.id)
        if (refreshedEvent) {
          updatedEvent = refreshedEvent
        }

        setEvents(events.map((event) => (event.id === formData.id ? updatedEvent : event)))

        toast({
          title: "Event updated",
          description: "Your event has been updated successfully.",
        })
      } else {
        // Create new event
        const newEvent = await api.createEvent(eventData)

        // Upload images if any
        if (selectedImages.length > 0) {
          for (const image of selectedImages) {
            await api.uploadEventImage(newEvent.id, image.file, user.id)
          }

          // Reload event to get images
          const refreshedEvent = await api.getEventById(newEvent.id)
          if (refreshedEvent) {
            newEvent.images = refreshedEvent.images
          }
        }

        toast({
          title: "Event created",
          description: "Your event has been created successfully.",
        })
        setIsDialogOpen(false)
        resetFormData()

        // Reload data to ensure everything is up to date
        await loadEventsData()
      }

      setIsDialogOpen(false)
      resetFormData()

      // Reload data to ensure everything is up to date
      loadEventsData()
    } catch (error) {
      console.error("Error creating/updating event:", error)
      toast({
        title: "Error",
        description: "Failed to create/update event.",
        variant: "destructive",
      })
    }
  }

  const handleRSVP = async (eventId) => {
    if (!user) return

    try {
      const currentAttendees = eventAttendees[eventId] || []
      const isCurrentlyAttending = currentAttendees.some((attendee) => attendee.member_id === user.id)

      if (isCurrentlyAttending) {
        // Remove RSVP
        await api.removeEventAttendee(eventId, user.id)
        const updatedAttendees = currentAttendees.filter((attendee) => attendee.member_id !== user.id)
        setEventAttendees((prev) => ({ ...prev, [eventId]: updatedAttendees }))

        toast({
          title: "RSVP Cancelled",
          description: "You have cancelled your RSVP for this event.",
        })
      } else {
        // Add RSVP
        const newAttendee = await api.addEventAttendee(eventId, user.id)
        const updatedAttendees = [...currentAttendees, newAttendee]
        setEventAttendees((prev) => ({ ...prev, [eventId]: updatedAttendees }))

        toast({
          title: "RSVP Confirmed",
          description: "You have successfully RSVP'd for this event.",
        })
      }
    } catch (error) {
      console.error("Error updating RSVP:", error)
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      })
    }
  }

  const isUserAttending = (eventId) => {
    if (!user || !eventAttendees[eventId]) return false
    return eventAttendees[eventId].some((attendee) => attendee.member_id === user.id)
  }

  const getAttendeeCount = (eventId) => {
    return eventAttendees[eventId]?.length || 0
  }

  const handleShowAttendees = (eventId) => {
    const attendees = eventAttendees[eventId] || []
    const attendeesWithNames = attendees.map((attendee) => {
      const member = members.find((m) => m.id === attendee.member_id)
      return {
        ...attendee,
        name: member?.name || "Unknown Member",
        email: member?.email || "",
      }
    })
    setSelectedEventAttendees(attendeesWithNames)
    setIsAttendeesDialogOpen(true)
  }

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
    })
  }

  const handleImagePreview = (imageUrl) => {
    setPreviewImage(imageUrl)
    setIsImagePreviewOpen(true)
  }

  const isAdmin = user?.roles && user.roles.some((role) => ["Group Owner", "President", "Treasurer"].includes(role))

  const isPledgeOnly = user?.roles && user.roles.length === 1 && user.roles.includes("New Member")

  // Filter events based on search and type filter
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType = typeFilter === "all" || event.type === typeFilter

    // Hide pledge exempt events from pledge-only members
    const canViewEvent = !event.pledge_exempt || !isPledgeOnly

    return matchesSearch && matchesType && canViewEvent
  })

  // Sort events by date
  const expandedEvents = getExpandedEvents()
  const sortedEvents = [...expandedEvents].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

  // Get upcoming events (today and future)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sevenDaysFromNow = new Date(today)
  sevenDaysFromNow.setDate(today.getDate() + 7)

  const allUpcomingEvents = sortedEvents.filter((event) => {
    const eventDate = new Date(event.start_time)
    return eventDate >= today && eventDate <= sevenDaysFromNow
  })
  
  const upcomingEvents = allUpcomingEvents.slice(0, 3)
  const hasMoreUpcoming = allUpcomingEvents.length > 3
  
  const pastEvents = sortedEvents.filter((event) => new Date(event.start_time) < today)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatEventDateTime = (startTime, endTime) => {
    if (!startTime) return ""
    
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : null
    
    const startDate = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    
    const startTimeStr = start.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    })
    
    if (!end) {
      return `${startDate} at ${startTimeStr}`
    }
    
    const endTimeStr = end.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    })
    
    // Check if same day
    if (start.toDateString() === end.toDateString()) {
      return `${startDate} • ${startTimeStr} - ${endTimeStr}`
    } else {
      const endDate = end.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      return `${startDate} ${startTimeStr} - ${endDate} ${endTimeStr}`
    }
  }

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" })

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay()

    // Number of days in the month
    const daysInMonth = lastDay.getDate()

    // Previous month's days to show
    const prevMonthDays = []
    if (firstDayOfWeek > 0) {
      const prevMonth = new Date(year, month, 0)
      const prevMonthDaysCount = prevMonth.getDate()

      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        prevMonthDays.push({
          date: new Date(year, month - 1, prevMonthDaysCount - i),
          isCurrentMonth: false,
        })
      }
    }

    // Current month's days
    const currentMonthDays = []
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }

    // Next month's days to show
    const nextMonthDays = []
    const totalDaysShown = prevMonthDays.length + currentMonthDays.length
    if (totalDaysShown < 42) {
      // 6 rows of 7 days
      const daysToAdd = 42 - totalDaysShown
      for (let i = 1; i <= daysToAdd; i++) {
        nextMonthDays.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        })
      }
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]
  }

  const getEventsForDay = (date) => {
    // Use the expanded events which include recurring occurrences
    const dayEvents = expandedEvents.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    })

    // Sort events by start time
    return dayEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  const handleDayClick = (day) => {
    const dayEvents = getEventsForDay(day.date)

    if (dayEvents.length === 0) {
      // Open quick event creation for empty days
      setQuickEventDate(day.date)
      setIsQuickEventOpen(true)
      resetQuickEventData()
    } else if (dayEvents.length === 1) {
      setSelectedEvent(dayEvents[0])
    } else {
      // Multiple events - show Google Calendar style popup
      setSelectedDate(day.date)
      setDateEvents(dayEvents)
      setIsMultiEventDialogOpen(true)
    }
  }

  const calendarDays = generateCalendarDays()

  // Get theme-aware classes
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

  const getButtonClasses = () => {
    switch (theme) {
      case "original":
        return "original-button"
      case "light":
        return "light-glass-button"
      case "dark":
      default:
        return "glass-button"
    }
  }

  const getButtonOutlineClasses = () => {
    switch (theme) {
      case "original":
        return "original-button-outline"
      case "light":
        return "light-glass-button-outline"
      case "dark":
      default:
        return "glass-button-outline"
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className={getTextColor()}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Events</h1>
            <p className={getSecondaryTextColor()}>Manage and track chapter events and activities.</p>
          </div>
          {isAdmin && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetFormData()
              }}
            >
              <DialogTrigger asChild>
                <Button className={getButtonClasses()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className={`sm:max-w-[550px] ${getCardClasses()}`}>
                <DialogHeader>
                  <DialogTitle className={getTextColor()}>{isEditMode ? "Edit Event" : "Create Event"}</DialogTitle>
                  <DialogDescription className={getSecondaryTextColor()}>
                    {isEditMode ? "Update the details of your event." : "Create a new event for your chapter members."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title" className={getTextColor()}>
                      Event Title
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter event title"
                      className={getInputClasses()}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="type" className={getTextColor()}>
                      Event Type
                    </Label>
                    <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                      <SelectTrigger id="type" className={getInputClasses()}>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent className={getCardClasses()}>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="chapter">Chapter Meeting</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="philanthropy">Philanthropy</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="recruitment">Recruitment</SelectItem>
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
                      className={getInputClasses()}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startTime" className={getTextColor()}>
                        Start Time
                      </Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className={getInputClasses()}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endTime" className={getTextColor()}>
                        End Time
                      </Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className={getInputClasses()}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="location" className={getTextColor()}>
                      Location
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Enter event location"
                      className={getInputClasses()}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="required"
                        checked={formData.required || false}
                        onCheckedChange={(checked) => handleSelectChange("required", checked)}
                        className={`${theme === "original" ? "border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" : theme === "light" ? "border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"}`}
                      />
                      <Label htmlFor="required" className={getSecondaryTextColor()}>
                        Required Event (all members will automatically RSVP)
                      </Label>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pledge_exempt"
                        checked={formData.pledge_exempt || false}
                        onCheckedChange={(checked) => handleSelectChange("pledge_exempt", checked)}
                        className={`${theme === "original" ? "border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" : theme === "light" ? "border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"}`}
                      />
                      <Label htmlFor="pledge_exempt" className={getSecondaryTextColor()}>
                        Pledges Exempt (hide from members with only "New Member" role)
                      </Label>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description" className={getTextColor()}>
                      Description
                    </Label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      className={`${getInputClasses()} min-h-[100px] resize-none`}
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter event description"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className={getTextColor()}>Event Images</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <div
                            className={`border rounded p-1 ${theme === "original" ? "border-gray-200 bg-gray-50" : theme === "light" ? "border-blue-200/60 bg-blue-50/50" : "border-white/20 bg-white/5"}`}
                          >
                            <div className="relative w-16 h-16">
                              <img
                                src={image.url || "/placeholder.svg"}
                                alt={image.name}
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          </div>
                          <button
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(image.id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleImageUpload}
                        accept="image/*"
                        multiple
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className={`${getButtonOutlineClasses()} flex items-center gap-2`}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Add Images
                      </Button>
                      <span className={`text-xs ${getMutedTextColor()}`}>Upload images for this event</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetFormData()
                      setIsDialogOpen(false)
                    }}
                    className={getButtonOutlineClasses()}
                  >
                    Cancel
                  </Button>
                  <Button className={getButtonClasses()} onClick={handleCreateOrUpdateEvent}>
                    {isEditMode ? "Update Event" : "Create Event"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card className={getCardClasses()}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center justify-between w-full sm:w-auto">
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 ${getButtonOutlineClasses()}`}
                        onClick={handlePrevMonth}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className={`mx-3 font-semibold text-lg ${getTextColor()}`}>{monthName}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className={`h-8 w-8 ml-4 ${getButtonOutlineClasses()}`}
                      onClick={handleNextMonth}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className={`absolute left-2.5 top-2.5 h-4 w-4 ${getMutedTextColor()}`} />
                      <Input
                        type="search"
                        placeholder="Search events..."
                        className={`pl-8 w-full sm:w-[200px] ${getInputClasses()}`}
                        value={searchTerm}
                        onChange={handleSearch}
                      />
                    </div>
                    <Select defaultValue="all" onValueChange={handleTypeFilter}>
                      <SelectTrigger className={`w-full sm:w-[180px] ${getInputClasses()}`}>
                        <div className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          <span>Filter</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className={getCardClasses()}>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="chapter">Chapter Meetings</SelectItem>
                        <SelectItem value="social">Social Events</SelectItem>
                        <SelectItem value="service">Service Events</SelectItem>
                        <SelectItem value="philanthropy">Philanthropy Events</SelectItem>
                        <SelectItem value="professional">Professional Events</SelectItem>
                        <SelectItem value="recruitment">Recruitment Events</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 md:p-6">
                {/* Mobile Calendar - Google Calendar Style */}
                <div className="block md:hidden">
                  <div
                    className={`grid grid-cols-7 gap-0 text-center text-xs font-medium mb-2 px-4 ${getMutedTextColor()}`}
                  >
                    <div className="py-2">S</div>
                    <div className="py-2">M</div>
                    <div className="py-2">T</div>
                    <div className="py-2">W</div>
                    <div className="py-2">T</div>
                    <div className="py-2">F</div>
                    <div className="py-2">S</div>
                  </div>
                  <div className="grid grid-cols-7 gap-0 text-sm">
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDay(day.date)
                      const isToday = day.date.toDateString() === new Date().toDateString()
                      const isSelected =
                        selectedEvent && day.date.toDateString() === new Date(selectedEvent.start_time).toDateString()

                      return (
                        <div
                          key={index}
                          className={`aspect-square border-r border-b relative cursor-pointer flex flex-col ${
                            !day.isCurrentMonth
                              ? `${getMutedTextColor()} ${theme === "original" ? "bg-gray-50" : theme === "light" ? "bg-blue-50/30" : "bg-white/5"}`
                              : "bg-transparent"
                          } ${
                            isToday
                              ? theme === "original"
                                ? "bg-red-100"
                                : theme === "light"
                                  ? "bg-blue-100"
                                  : "bg-blue-500/20"
                              : ""
                          } ${
                            isSelected && !isToday
                              ? theme === "original"
                                ? "bg-red-50"
                                : theme === "light"
                                  ? "bg-blue-50"
                                  : "bg-red-500/20"
                              : ""
                          } ${
                            theme === "original"
                              ? "border-gray-200"
                              : theme === "light"
                                ? "border-blue-200/50"
                                : "border-white/10"
                          }`}
                          onClick={() => handleDayClick(day)}
                        >
                          <div
                            className={`text-center py-1 ${
                              isToday
                                ? theme === "original"
                                  ? "text-red-600 font-semibold"
                                  : theme === "light"
                                    ? "text-blue-600 font-semibold"
                                    : "text-blue-400 font-semibold"
                                : getTextColor()
                            }`}
                          >
                            {day.date.getDate()}
                          </div>
                          <div className="flex-1 px-1 pb-1">
                            {dayEvents.slice(0, 2).map((event, i) => (
                              <div
                                key={`${event.id}-${event.start_time}-${i}`}
                                className={`text-xs p-0.5 mb-0.5 rounded text-white truncate ${
                                  event.type === "social"
                                    ? "bg-red-500/80"
                                    : event.type === "chapter"
                                      ? "bg-purple-500/80"
                                      : event.type === "service"
                                        ? "bg-green-500/80"
                                        : event.type === "philanthropy"
                                          ? "bg-yellow-500/80"
                                          : event.type === "recruitment"
                                            ? "bg-orange-500/80"
                                            : "bg-slate-500/80"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedEvent(event)
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className={`text-xs text-center ${getMutedTextColor()}`}>
                                +{dayEvents.length - 2}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Desktop Calendar */}
                <div className="hidden md:block">
                  <div className={`grid grid-cols-7 gap-1 text-center text-xs font-medium mb-2 ${getMutedTextColor()}`}>
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDay(day.date)
                      const isToday = day.date.toDateString() === new Date().toDateString()
                      const isSelected =
                        selectedEvent && day.date.toDateString() === new Date(selectedEvent.start_time).toDateString()

                      const maxVisibleEvents = 3
                      const visibleEvents = dayEvents.slice(0, maxVisibleEvents)
                      const hiddenEventsCount = dayEvents.length - maxVisibleEvents

                      return (
                        <div
                          key={index}
                          className={`min-h-[100px] p-1 border relative cursor-pointer ${
                            !day.isCurrentMonth
                              ? `${getMutedTextColor()} ${theme === "original" ? "bg-gray-50" : theme === "light" ? "bg-blue-50/30" : "bg-white/5"}`
                              : "bg-transparent"
                          } ${
                            isToday
                              ? theme === "original"
                                ? "bg-red-100 border-red-300"
                                : theme === "light"
                                  ? "bg-blue-100 border-blue-300"
                                  : "bg-red-500/20 border-red-400/30"
                              : ""
                          } ${
                            isSelected && !isToday
                              ? theme === "original"
                                ? "bg-red-50 border-red-200"
                                : theme === "light"
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-red-500/10 border-red-400/20"
                              : ""
                          } ${
                            theme === "original"
                              ? "border-gray-200"
                              : theme === "light"
                                ? "border-blue-200/50"
                                : "border-white/10"
                          }`}
                          onClick={() => handleDayClick(day)}
                        >
                          <div
                            className={`text-sm font-medium mb-1 ${
                              isToday
                                ? theme === "original"
                                  ? "text-red-600"
                                  : theme === "light"
                                    ? "text-blue-600"
                                    : "text-red-400"
                                : getTextColor()
                            }`}
                          >
                            {day.date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {visibleEvents.map((event, i) => (
                              <div
                                key={`${event.id}-${event.start_time}-${i}`}
                                className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${
                                  event.type === "social"
                                    ? theme === "original"
                                      ? "bg-red-100 text-red-700 border border-red-200"
                                      : theme === "light"
                                        ? "bg-red-50 text-red-600 border border-red-200"
                                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : event.type === "chapter"
                                      ? theme === "original"
                                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                                        : theme === "light"
                                          ? "bg-purple-50 text-purple-600 border border-purple-200"
                                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                      : event.type === "service"
                                        ? theme === "original"
                                          ? "bg-green-100 text-green-700 border border-green-200"
                                          : theme === "light"
                                            ? "bg-green-50 text-green-600 border border-green-200"
                                            : "bg-green-500/20 text-green-300 border border-green-500/30"
                                        : event.type === "philanthropy"
                                          ? theme === "original"
                                            ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                            : theme === "light"
                                              ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
                                              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                          : event.type === "recruitment"
                                            ? theme === "original"
                                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                                              : theme === "light"
                                                ? "bg-orange-50 text-orange-600 border border-orange-200"
                                                : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                            : theme === "original"
                                              ? "bg-gray-100 text-gray-700 border border-gray-200"
                                              : theme === "light"
                                                ? "bg-gray-50 text-gray-600 border border-gray-200"
                                                : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                                } ${event.isRecurringOccurrence ? "opacity-80" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedEvent(event)
                                }}
                              >
                                <div className="font-medium truncate">{formatTime(event.start_time)}</div>
                                <div className="truncate">{event.title}</div>
                              </div>
                            ))}
                            {hiddenEventsCount > 0 && (
                              <div
                                className={`text-xs pl-1 cursor-pointer hover:underline flex items-center gap-1 ${getMutedTextColor()}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedDate(day.date)
                                  setDateEvents(dayEvents)
                                  setIsMultiEventDialogOpen(true)
                                }}
                              >
                                <span className="font-bold">⋯</span>
                                <span>+{hiddenEventsCount} more</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-1 space-y-6">
            <Card className={getCardClasses()}>
              <CardHeader>
                <CardTitle className={getTextColor()}>Events</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming">
                  <TabsList className={getTabsClasses()}>
                    <TabsTrigger
                      value="upcoming"
                      className={`${theme === "original" ? "original-tab" : theme === "light" ? "light-glass-tab" : "glass-tab"}`}
                    >
                      Upcoming
                    </TabsTrigger>
                    <TabsTrigger
                      value="past"
                      className={`${theme === "original" ? "original-tab" : theme === "light" ? "light-glass-tab" : "glass-tab"}`}
                    >
                      Past
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming" className="space-y-4">
                    {upcomingEvents.length === 0 ? (
                      <div className={`text-center py-8 ${getMutedTextColor()}`}>No upcoming events found.</div>
                    ) : (
                      upcomingEvents.map((event) => (
                        <div
                          key={`${event.id}-${event.start_time}`}
                          className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                            theme === "original"
                              ? "border-gray-200 hover:bg-gray-50"
                              : theme === "light"
                                ? "border-blue-200/50 hover:bg-blue-50/30"
                                : "border-white/10 hover:bg-white/5"
                          }`}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div
                            className={`flex flex-col items-center justify-center rounded-lg p-3 min-w-[60px] ${
                              event.type === "social"
                                ? theme === "original"
                                  ? "bg-red-100 text-red-600"
                                  : theme === "light"
                                    ? "bg-red-50 text-red-500"
                                    : "bg-red-500/20 text-red-400"
                                : event.type === "chapter"
                                  ? theme === "original"
                                    ? "bg-purple-100 text-purple-600"
                                    : theme === "light"
                                      ? "bg-purple-50 text-purple-500"
                                      : "bg-purple-500/20 text-purple-400"
                                  : event.type === "service"
                                    ? theme === "original"
                                      ? "bg-green-100 text-green-600"
                                      : theme === "light"
                                        ? "bg-green-50 text-green-500"
                                        : "bg-green-500/20 text-green-400"
                                    : event.type === "philanthropy"
                                      ? theme === "original"
                                        ? "bg-yellow-100 text-yellow-600"
                                        : theme === "light"
                                          ? "bg-yellow-50 text-yellow-500"
                                          : "bg-yellow-500/20 text-yellow-400"
                                      : event.type === "recruitment"
                                        ? theme === "original"
                                          ? "bg-orange-100 text-orange-600"
                                          : theme === "light"
                                            ? "bg-orange-50 text-orange-500"
                                            : "bg-orange-500/20 text-orange-400"
                                        : theme === "original"
                                          ? "bg-gray-100 text-gray-600"
                                          : theme === "light"
                                            ? "bg-gray-50 text-gray-500"
                                            : "bg-slate-500/20 text-slate-400"
                            }`}
                          >
                            <span className="text-sm font-semibold">
                              {new Date(event.start_time).toLocaleString("default", { month: "short" }).toUpperCase()}
                            </span>
                            <span className="text-2xl font-bold">{new Date(event.start_time).getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold truncate ${getTextColor()}`}>{event.title}</h3>
                                <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {formatTime(event.start_time)}
                                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                                  </span>
                                </div>
                                {event.location && (
                                  <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                              <Badge
                                variant="secondary"
                                className={`ml-2 ${
                                  event.type === "social"
                                    ? theme === "original"
                                      ? "bg-red-100 text-red-700"
                                      : theme === "light"
                                        ? "bg-red-50 text-red-600"
                                        : "bg-red-500/20 text-red-300"
                                    : event.type === "chapter"
                                      ? theme === "original"
                                        ? "bg-purple-100 text-purple-700"
                                        : theme === "light"
                                          ? "bg-purple-50 text-purple-600"
                                          : "bg-purple-500/20 text-purple-300"
                                      : event.type === "service"
                                        ? theme === "original"
                                          ? "bg-green-100 text-green-700"
                                          : theme === "light"
                                            ? "bg-green-50 text-green-600"
                                            : "bg-green-500/20 text-green-300"
                                        : event.type === "philanthropy"
                                          ? theme === "original"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : theme === "light"
                                              ? "bg-yellow-50 text-yellow-600"
                                              : "bg-yellow-500/20 text-yellow-300"
                                          : event.type === "recruitment"
                                            ? theme === "original"
                                              ? "bg-orange-100 text-orange-700"
                                              : theme === "light"
                                                ? "bg-orange-50 text-orange-500"
                                                : "bg-orange-500/20 text-orange-300"
                                            : theme === "original"
                                              ? "bg-gray-100 text-gray-700"
                                              : theme === "light"
                                                ? "bg-gray-50 text-gray-600"
                                                : "bg-slate-500/20 text-slate-300"
                                }`}
                              >
                                {event.type}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className={`text-sm ${getSecondaryTextColor()}`}>
                                {getAttendeeCount(event.id)} attending
                              </div>
                              <div className="flex items-center gap-2">
                                {event.required && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      theme === "original"
                                        ? "border-red-300 text-red-600"
                                        : theme === "light"
                                          ? "border-red-300 text-red-500"
                                          : "border-red-400/30 text-red-400"
                                    }`}
                                  >
                                    <Bell className="h-3 w-3 mr-1" />
                                    Required
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant={isUserAttending(event.id) ? "default" : "outline"}
                                  className={`text-xs ${
                                    isUserAttending(event.id) ? getButtonClasses() : getButtonOutlineClasses()
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRSVP(event.id)
                                  }}
                                >
                                  {isUserAttending(event.id) ? "Going" : "RSVP"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="past" className="space-y-4">
                    {pastEvents.length === 0 ? (
                      <div className={`text-center py-8 ${getMutedTextColor()}`}>No past events found.</div>
                    ) : (
                      pastEvents.map((event) => (
                        <div
                          key={`${event.id}-${event.start_time}`}
                          className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors opacity-75 ${
                            theme === "original"
                              ? "border-gray-200 hover:bg-gray-50"
                              : theme === "light"
                                ? "border-blue-200/50 hover:bg-blue-50/30"
                                : "border-white/10 hover:bg-white/5"
                          }`}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div
                            className={`flex flex-col items-center justify-center rounded-lg p-3 min-w-[60px] ${
                              event.type === "social"
                                ? theme === "original"
                                  ? "bg-red-100 text-red-600"
                                  : theme === "light"
                                    ? "bg-red-50 text-red-500"
                                    : "bg-red-500/20 text-red-400"
                                : event.type === "chapter"
                                  ? theme === "original"
                                    ? "bg-purple-100 text-purple-600"
                                    : theme === "light"
                                      ? "bg-purple-50 text-purple-500"
                                      : "bg-purple-500/20 text-purple-400"
                                  : event.type === "service"
                                    ? theme === "original"
                                      ? "bg-green-100 text-green-600"
                                      : theme === "light"
                                        ? "bg-green-50 text-green-500"
                                        : "bg-green-500/20 text-green-400"
                                    : event.type === "philanthropy"
                                      ? theme === "original"
                                        ? "bg-yellow-100 text-yellow-600"
                                        : theme === "light"
                                          ? "bg-yellow-50 text-yellow-500"
                                          : "bg-yellow-500/20 text-yellow-400"
                                      : event.type === "recruitment"
                                        ? theme === "original"
                                          ? "bg-orange-100 text-orange-600"
                                          : theme === "light"
                                            ? "bg-orange-50 text-orange-500"
                                            : "bg-orange-500/20 text-orange-400"
                                        : theme === "original"
                                          ? "bg-gray-100 text-gray-600"
                                          : theme === "light"
                                            ? "bg-gray-50 text-gray-500"
                                            : "bg-slate-500/20 text-slate-400"
                            }`}
                          >
                            <span className="text-sm font-semibold">
                              {new Date(event.start_time).toLocaleString("default", { month: "short" }).toUpperCase()}
                            </span>
                            <span className="text-2xl font-bold">{new Date(event.start_time).getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold truncate ${getTextColor()}`}>{event.title}</h3>
                                <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {formatTime(event.start_time)}
                                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                                  </span>
                                </div>
                                {event.location && (
                                  <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                              <Badge
                                variant="secondary"
                                className={`ml-2 ${
                                  event.type === "social"
                                    ? theme === "original"
                                      ? "bg-red-100 text-red-700"
                                      : theme === "light"
                                        ? "bg-red-50 text-red-600"
                                        : "bg-red-500/20 text-red-300"
                                    : event.type === "chapter"
                                      ? theme === "original"
                                        ? "bg-purple-100 text-purple-700"
                                        : theme === "light"
                                          ? "bg-purple-50 text-purple-600"
                                          : "bg-purple-500/20 text-purple-300"
                                      : event.type === "service"
                                        ? theme === "original"
                                          ? "bg-green-100 text-green-700"
                                          : theme === "light"
                                            ? "bg-green-50 text-green-600"
                                            : "bg-green-500/20 text-green-300"
                                        : event.type === "philanthropy"
                                          ? theme === "original"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : theme === "light"
                                              ? "bg-yellow-50 text-yellow-600"
                                              : "bg-yellow-500/20 text-yellow-300"
                                          : event.type === "recruitment"
                                            ? theme === "original"
                                              ? "bg-orange-100 text-orange-700"
                                              : theme === "light"
                                                ? "bg-orange-50 text-orange-500"
                                                : "bg-orange-500/20 text-orange-300"
                                            : theme === "original"
                                              ? "bg-gray-100 text-gray-700"
                                              : theme === "light"
                                                ? "bg-gray-50 text-gray-600"
                                                : "bg-slate-500/20 text-slate-300"
                                }`}
                              >
                                {event.type}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className={`text-sm ${getSecondaryTextColor()}`}>
                                {getAttendeeCount(event.id)} attended
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {selectedEvent && (
              <Card className={getCardClasses()}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className={`truncate ${getTextColor()}`}>{selectedEvent.title}</CardTitle>
                      <div className={`flex items-center gap-2 mt-1 ${getSecondaryTextColor()}`}>
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatEventDateTime(selectedEvent.start_time, selectedEvent.end_time)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isAdmin && !selectedEvent.isRecurringOccurrence && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className={`h-8 w-8 ${getButtonOutlineClasses()}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={getCardClasses()}>
                            <DropdownMenuItem
                              onClick={() => handleEditEvent(selectedEvent)}
                              className={`cursor-pointer ${getTextColor()}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteEvent(selectedEvent.id)}
                              className={`cursor-pointer ${theme === "original" ? "text-red-600" : theme === "light" ? "text-red-500" : "text-red-400"}`}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Event
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button
                        size="sm"
                        onClick={() => setSelectedEvent(null)}
                        variant="outline"
                        className={getButtonOutlineClasses()}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="secondary"
                      className={`${
                        selectedEvent.type === "social"
                          ? theme === "original"
                            ? "bg-red-100 text-red-700"
                            : theme === "light"
                              ? "bg-red-50 text-red-600"
                              : "bg-red-500/20 text-red-300"
                          : selectedEvent.type === "chapter"
                            ? theme === "original"
                              ? "bg-purple-100 text-purple-700"
                              : theme === "light"
                                ? "bg-purple-50 text-purple-600"
                                : "bg-purple-500/20 text-purple-300"
                            : selectedEvent.type === "service"
                              ? theme === "original"
                                ? "bg-green-100 text-green-700"
                                : theme === "light"
                                  ? "bg-green-50 text-green-600"
                                  : "bg-green-500/20 text-green-300"
                              : selectedEvent.type === "philanthropy"
                                ? theme === "original"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : theme === "light"
                                    ? "bg-yellow-50 text-yellow-600"
                                    : "bg-yellow-500/20 text-yellow-300"
                                : selectedEvent.type === "recruitment"
                                  ? theme === "original"
                                    ? "bg-orange-100 text-orange-700"
                                    : theme === "light"
                                      ? "bg-orange-50 text-orange-500"
                                      : "bg-orange-500/20 text-orange-300"
                                  : theme === "original"
                                    ? "bg-gray-100 text-gray-700"
                                    : theme === "light"
                                      ? "bg-gray-50 text-gray-600"
                                      : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      {selectedEvent.type}
                    </Badge>
                    {selectedEvent.required && (
                      <Badge
                        variant="outline"
                        className={`${
                          theme === "original"
                            ? "border-red-300 text-red-600"
                            : theme === "light"
                              ? "border-red-300 text-red-500"
                              : "border-red-400/30 text-red-400"
                        }`}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    )}
                  </div>

                  {selectedEvent.location && (
                    <div className={`flex items-center gap-2 ${getSecondaryTextColor()}`}>
                      <MapPin className="h-4 w-4" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}

                  {selectedEvent.description && (
                    <div>
                      <h4 className={`font-medium mb-2 ${getTextColor()}`}>Description</h4>
                      <p className={getSecondaryTextColor()}>{selectedEvent.description}</p>
                    </div>
                  )}

                  {selectedEvent.images && selectedEvent.images.length > 0 && (
                    <div>
                      <h4 className={`font-medium mb-2 ${getTextColor()}`}>Images</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedEvent.images.map((image) => (
                          <div
                            key={image.id}
                            className="relative group cursor-pointer"
                            onClick={() => handleImagePreview(image.url)}
                          >
                            <img
                              src={image.url || "/placeholder.svg"}
                              alt={image.name || "Event image"}
                              className="w-full h-24 object-cover rounded border"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className={`text-sm ${getSecondaryTextColor()}`}>
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => handleShowAttendees(selectedEvent.id)}
                      >
                        {getAttendeeCount(selectedEvent.id)} attending
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={isUserAttending(selectedEvent.id) ? "default" : "outline"}
                      className={isUserAttending(selectedEvent.id) ? getButtonClasses() : getButtonOutlineClasses()}
                      onClick={() => handleRSVP(selectedEvent.id)}
                    >
                      {isUserAttending(selectedEvent.id) ? "Going" : "RSVP"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Quick Event Creation Dialog */}
      <Dialog open={isQuickEventOpen} onOpenChange={setIsQuickEventOpen}>
        <DialogContent className={`sm:max-w-[500px] ${getCardClasses()}`}>
          <DialogHeader>
            <DialogTitle className={getTextColor()}>
              Create Event for {quickEventDate?.toLocaleDateString()}
            </DialogTitle>
            <DialogDescription className={getSecondaryTextColor()}>
              Quickly create an event for the selected date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quickTitle" className={getTextColor()}>
                Event Title
              </Label>
              <Input
                id="quickTitle"
                value={quickEventTitle}
                onChange={(e) => setQuickEventTitle(e.target.value)}
                placeholder="Enter event title"
                className={getInputClasses()}
              />
            </div>

            <div className="grid gap-2">
              <Label className={getTextColor()}>Time</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={isAllDay}
                  onCheckedChange={(checked) => {
                    setIsAllDay(checked)
                    setShowTimeInput(!checked)
                  }}
                  className={`${theme === "original" ? "border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" : theme === "light" ? "border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"}`}
                />
                <Label htmlFor="allDay" className={getSecondaryTextColor()}>
                  All day
                </Label>
              </div>
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="quickStartTime" className={getTextColor()}>
                      Start Time
                    </Label>
                    <Input
                      id="quickStartTime"
                      type="time"
                      value={quickEventStartTime}
                      onChange={(e) => setQuickEventStartTime(e.target.value)}
                      className={getInputClasses()}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quickEndTime" className={getTextColor()}>
                      End Time
                    </Label>
                    <Input
                      id="quickEndTime"
                      type="time"
                      value={quickEventEndTime}
                      onChange={(e) => setQuickEventEndTime(e.target.value)}
                      className={getInputClasses()}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label className={getTextColor()}>Repeat</Label>
              <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                <SelectTrigger className={getInputClasses()}>
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent className={getCardClasses()}>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekdays">Every weekday (Monday to Friday)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Annually</SelectItem>
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {recurrenceType !== "none" && (
                <div
                  className={`text-sm p-2 rounded border ${theme === "original" ? "bg-gray-50 border-gray-200" : theme === "light" ? "bg-blue-50/50 border-blue-200/50" : "bg-white/5 border-white/10"} ${getSecondaryTextColor()}`}
                >
                  {getRecurrenceDisplayText()}
                </div>
              )}
            </div>

            {recurrenceType === "custom" && (
              <div className="grid gap-4 p-4 border rounded">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className={getTextColor()}>Repeat every</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={customRecurrence.interval}
                        onChange={(e) =>
                          setCustomRecurrence((prev) => ({ ...prev, interval: Number.parseInt(e.target.value) || 1 }))
                        }
                        className={getInputClasses()}
                      />
                      <Select
                        value={customRecurrence.frequency}
                        onValueChange={(value) => setCustomRecurrence((prev) => ({ ...prev, frequency: value }))}
                      >
                        <SelectTrigger className={getInputClasses()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={getCardClasses()}>
                          <SelectItem value="day">Day(s)</SelectItem>
                          <SelectItem value="week">Week(s)</SelectItem>
                          <SelectItem value="month">Month(s)</SelectItem>
                          <SelectItem value="year">Year(s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {customRecurrence.frequency === "week" && (
                  <div className="grid gap-2">
                    <Label className={getTextColor()}>Repeat on</Label>
                    <div className="flex gap-2 flex-wrap">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant={customRecurrence.daysOfWeek.includes(index) ? "default" : "outline"}
                          size="sm"
                          className={`w-8 h-8 p-0 ${
                            customRecurrence.daysOfWeek.includes(index) ? getButtonClasses() : getButtonOutlineClasses()
                          }`}
                          onClick={() => {
                            const newDays = customRecurrence.daysOfWeek.includes(index)
                              ? customRecurrence.daysOfWeek.filter((d) => d !== index)
                              : [...customRecurrence.daysOfWeek, index]
                            setCustomRecurrence((prev) => ({ ...prev, daysOfWeek: newDays }))
                          }}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label className={getTextColor()}>Ends</Label>
                  <Select
                    value={customRecurrence.endType}
                    onValueChange={(value) => setCustomRecurrence((prev) => ({ ...prev, endType: value }))}
                  >
                    <SelectTrigger className={getInputClasses()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={getCardClasses()}>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="on">On date</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                    </SelectContent>
                  </Select>

                  {customRecurrence.endType === "on" && (
                    <Input
                      type="date"
                      value={customRecurrence.endDate}
                      onChange={(e) => setCustomRecurrence((prev) => ({ ...prev, endDate: e.target.value }))}
                      className={getInputClasses()}
                    />
                  )}

                  {customRecurrence.endType === "after" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={customRecurrence.endAfter}
                        onChange={(e) =>
                          setCustomRecurrence((prev) => ({ ...prev, endAfter: Number.parseInt(e.target.value) || 1 }))
                        }
                        className={getInputClasses()}
                      />
                      <span className={getSecondaryTextColor()}>occurrences</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showMoreOptions"
                checked={showMoreOptions}
                onCheckedChange={setShowMoreOptions}
                className={`${theme === "original" ? "border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" : theme === "light" ? "border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"}`}
              />
              <Label htmlFor="showMoreOptions" className={getSecondaryTextColor()}>
                Add more details
              </Label>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quickRequired"
                  checked={quickEventRequired}
                  onCheckedChange={setQuickEventRequired}
                  className={`${theme === "original" ? "border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" : theme === "light" ? "border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"}`}
                />
                <Label htmlFor="quickRequired" className={getSecondaryTextColor()}>
                  Required Event (all members will automatically RSVP)
                </Label>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quickPledgeExempt"
                  checked={quickEventPledgeExempt}
                  onCheckedChange={setQuickEventPledgeExempt}
                  className={`${theme === "original" ? "border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" : theme === "light" ? "border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"}`}
                />
                <Label htmlFor="quickPledgeExempt" className={getSecondaryTextColor()}>
                  Pledges Exempt (hide from members with only "New Member" role)
                </Label>
              </div>
            </div>

            {showMoreOptions && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="quickType" className={getTextColor()}>
                    Event Type
                  </Label>
                  <Select value={quickEventType} onValueChange={setQuickEventType}>
                    <SelectTrigger id="quickType" className={getInputClasses()}>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent className={getCardClasses()}>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="chapter">Chapter Meeting</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="philanthropy">Philanthropy</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="recruitment">Recruitment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quickLocation" className={getTextColor()}>
                    Location
                  </Label>
                  <Input
                    id="quickLocation"
                    value={quickEventLocation}
                    onChange={(e) => setQuickEventLocation(e.target.value)}
                    placeholder="Enter event location"
                    className={getInputClasses()}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quickDescription" className={getTextColor()}>
                    Description
                  </Label>
                  <textarea
                    id="quickDescription"
                    rows={3}
                    className={`${getInputClasses()} min-h-[80px] resize-none`}
                    value={quickEventDescription}
                    onChange={(e) => setQuickEventDescription(e.target.value)}
                    placeholder="Enter event description"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsQuickEventOpen(false)
                resetQuickEventData()
              }}
              className={getButtonOutlineClasses()}
            >
              Cancel
            </Button>
            <Button className={getButtonClasses()} onClick={handleQuickEventSave}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Event Dialog */}
      <Dialog open={isMultiEventDialogOpen} onOpenChange={setIsMultiEventDialogOpen}>
        <DialogContent className={`sm:max-w-[400px] ${getCardClasses()}`}>
          <DialogHeader>
            <DialogTitle className={getTextColor()}>
              {selectedDate?.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DialogTitle>
            <DialogDescription className={getSecondaryTextColor()}>
              {dateEvents.length} events on this day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {dateEvents.map((event) => (
              <div
                key={`${event.id}-${event.start_time}`}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  theme === "original"
                    ? "border-gray-200 hover:bg-gray-50"
                    : theme === "light"
                      ? "border-blue-200/50 hover:bg-blue-50/30"
                      : "border-white/10 hover:bg-white/5"
                }`}
                onClick={() => {
                  setSelectedEvent(event)
                  setIsMultiEventDialogOpen(false)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${getTextColor()}`}>{event.title}</h3>
                    <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(event.start_time)}
                        {event.end_time && ` - ${formatTime(event.end_time)}`}
                      </span>
                    </div>
                    {event.location && (
                      <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`ml-2 ${
                      event.type === "social"
                        ? theme === "original"
                          ? "bg-red-100 text-red-700"
                          : theme === "light"
                            ? "bg-red-50 text-red-600"
                            : "bg-red-500/20 text-red-300"
                        : event.type === "chapter"
                          ? theme === "original"
                            ? "bg-purple-100 text-purple-700"
                            : theme === "light"
                              ? "bg-purple-50 text-purple-600"
                              : "bg-purple-500/20 text-purple-300"
                          : event.type === "service"
                            ? theme === "original"
                              ? "bg-green-100 text-green-700"
                              : theme === "light"
                                ? "bg-green-50 text-green-600"
                                : "bg-green-500/20 text-green-300"
                            : event.type === "philanthropy"
                              ? theme === "original"
                                ? "bg-yellow-100 text-yellow-700"
                                : theme === "light"
                                  ? "bg-yellow-50 text-yellow-600"
                                  : "bg-yellow-500/20 text-yellow-300"
                              : event.type === "recruitment"
                                ? theme === "original"
                                  ? "bg-orange-100 text-orange-700"
                                  : theme === "light"
                                    ? "bg-orange-50 text-orange-500"
                                    : "bg-orange-500/20 text-orange-300"
                                : theme === "original"
                                  ? "bg-gray-100 text-gray-700"
                                  : theme === "light"
                                    ? "bg-gray-50 text-gray-600"
                                    : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {event.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendees Dialog */}
      <Dialog open={isAttendeesDialogOpen} onOpenChange={setIsAttendeesDialogOpen}>
        <DialogContent className={`sm:max-w-[400px] ${getCardClasses()}`}>
          <DialogHeader>
            <DialogTitle className={getTextColor()}>Event Attendees</DialogTitle>
            <DialogDescription className={getSecondaryTextColor()}>
              {selectedEventAttendees.length} people attending this event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {selectedEventAttendees.length === 0 ? (
              <div className={`text-center py-4 ${getMutedTextColor()}`}>No attendees yet.</div>
            ) : (
              selectedEventAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className={`flex items-center gap-3 p-2 rounded ${
                    theme === "original"
                      ? "hover:bg-gray-50"
                      : theme === "light"
                        ? "hover:bg-blue-50/30"
                        : "hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      theme === "original"
                        ? "bg-red-100 text-red-600"
                        : theme === "light"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {attendee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${getTextColor()}`}>{attendee.name}</div>
                    {attendee.email && (
                      <div className={`text-sm truncate ${getSecondaryTextColor()}`}>{attendee.email}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className={`sm:max-w-[800px] ${getCardClasses()}`}>
          <DialogHeader>
            <DialogTitle className={getTextColor()}>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {previewImage && (
              <img
                src={previewImage || "/placeholder.svg"}
                alt="Event image"
                className="max-w-full max-h-[600px] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>

    
  )
}
