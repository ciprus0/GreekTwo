"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, ArrowLeft, Edit, Trash, MapPin, Square, Clock, Play, Pause, RotateCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import dynamic from "next/dynamic"
import { api } from "@/lib/supabase-api"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">Loading map...</div>
  ),
})

export default function StudyLocationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studyLocations, setStudyLocations] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [currentSession, setCurrentSession] = useState(null)
  const [studyHistory, setStudyHistory] = useState([])
  const [studyRequirement, setStudyRequirement] = useState(20) // hours per week
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    radius: 100,
  })
  const [errors, setErrors] = useState({
    name: "",
    address: "",
  })

  useEffect(() => {
    // Request user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          toast({
            title: "Location Access",
            description: "Unable to access your location. Using default location.",
            variant: "destructive",
          })
          // Fallback to a default location
          setUserLocation({
            lat: 40.7128,
            lng: -74.006,
          })
        },
      )
    }

    // Load user data
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setIsAdmin(parsedUser.role === "admin" || parsedUser.role === "executive")

      const fetchData = async () => {
        if (!parsedUser || !parsedUser.organization_id) {
          setLoading(false)
          return
        }
        try {
          const orgLocations = await api.getStudyLocationsByOrganization(parsedUser.organization_id)
          setStudyLocations(orgLocations || [])

          const userSessions = await api.getStudySessionsByUser(parsedUser.id, parsedUser.organization_id, "completed")
          setStudyHistory(userSessions || [])

          const activeSessions = await api.getStudySessionsByUser(parsedUser.id, parsedUser.organization_id, "active")
          if (activeSessions.length > 0) {
            setCurrentSession(activeSessions[0])
            setIsTracking(true)
            // If you have an elapsedTime state for UI, initialize it here based on activeSession.start_time
          }
        } catch (error) {
          console.error("Failed to fetch data:", error)
          toast({ title: "Error", description: "Failed to load study data.", variant: "destructive" })
        } finally {
          setLoading(false)
        }
      }
      fetchData()

      setLoading(false)
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const validateForm = () => {
    let valid = true
    const newErrors = { name: "", address: "" }

    if (!formData.name.trim()) {
      newErrors.name = "Location name is required"
      valid = false
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleAddLocation = () => {
    if (!validateForm()) {
      return
    }

    const newLocation = {
      id: Date.now().toString(),
      name: formData.name,
      address: formData.address,
      lat: 40.7128 + (Math.random() - 0.5) * 0.01, // Random coordinates near NYC for demo
      lng: -74.006 + (Math.random() - 0.5) * 0.01,
      radius: formData.radius,
      isBox: false,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      organizationId: user.organizationId || null,
    }

    // Add to study locations
    const updatedLocations = [...studyLocations, newLocation]
    setStudyLocations(updatedLocations)

    // Update localStorage
    const allLocations = JSON.parse(localStorage.getItem("studyLocations") || "[]")
    const updatedAllLocations = [...allLocations, newLocation]
    localStorage.setItem("studyLocations", JSON.stringify(updatedAllLocations))

    // Reset form
    setFormData({
      name: "",
      address: "",
      radius: 100,
    })
    setShowAddLocationDialog(false)

    toast({
      title: "Location Added",
      description: "The study location has been added successfully.",
    })
  }

  const handleEditLocation = (location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      address: location.address || "",
      radius: location.radius || 100,
    })
    setShowAddLocationDialog(true)
  }

  const handleUpdateLocation = () => {
    if (!validateForm()) {
      return
    }

    // Update location
    const updatedLocations = studyLocations.map((loc) =>
      loc.id === editingLocation.id
        ? {
            ...loc,
            name: formData.name,
            address: formData.address,
            radius: formData.radius,
          }
        : loc,
    )

    setStudyLocations(updatedLocations)

    // Update localStorage
    const allLocations = JSON.parse(localStorage.getItem("studyLocations") || "[]")
    const updatedAllLocations = allLocations.map((loc) =>
      loc.id === editingLocation.id
        ? {
            ...loc,
            name: formData.name,
            address: formData.address,
            radius: formData.radius,
          }
        : loc,
    )
    localStorage.setItem("studyLocations", JSON.stringify(updatedAllLocations))

    // Reset form
    setEditingLocation(null)
    setFormData({
      name: "",
      address: "",
      radius: 100,
    })
    setShowAddLocationDialog(false)

    toast({
      title: "Location Updated",
      description: "The study location has been updated successfully.",
    })
  }

  const handleDeleteLocation = (locationId) => {
    // Remove location
    const updatedLocations = studyLocations.filter((loc) => loc.id !== locationId)
    setStudyLocations(updatedLocations)

    // Update localStorage
    const allLocations = JSON.parse(localStorage.getItem("studyLocations") || "[]")
    const updatedAllLocations = allLocations.filter((loc) => loc.id !== locationId)
    localStorage.setItem("studyLocations", JSON.stringify(updatedAllLocations))

    toast({
      title: "Location Deleted",
      description: "The study location has been deleted successfully.",
    })
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  const findNearestLocation = () => {
    if (!userLocation || studyLocations.length === 0) return null

    let nearestLocation = null
    let minDistance = Number.POSITIVE_INFINITY

    for (const location of studyLocations) {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
      if (distance <= location.radius && distance < minDistance) {
        minDistance = distance
        nearestLocation = { ...location, distance }
      }
    }

    return nearestLocation
  }

  const startStudySession = async () => {
    const nearestLocation = findNearestLocation()
    if (!nearestLocation) {
      toast({
        title: "Not at Study Location",
        description: "You need to be within range of a study location to start tracking.",
        variant: "destructive",
      })
      return
    }

    const session = {
      user_id: user.id,
      organization_id: user.organization_id,
      location_id: nearestLocation.id,
      location_name: nearestLocation.name,
      start_time: new Date().toISOString(),
      status: "active" as const,
    }

    try {
      const createdSession = await api.createStudySession(session)
      if (!createdSession) throw new Error("Failed to create session in DB")
      setCurrentSession(createdSession)
      setIsTracking(true)
      toast({
        title: "Study Session Started",
        description: `Started tracking at ${nearestLocation.name}`,
      })
    } catch (error) {
      console.error("Failed to start study session:", error)
      toast({ title: "Error", description: "Could not start study session.", variant: "destructive" })
    }
  }

  const pauseStudySession = () => {
    if (!currentSession) return

    setIsTracking(false)
    toast({
      title: "Study Session Paused",
      description: "Your study session has been paused.",
    })
  }

  const resumeStudySession = () => {
    if (!currentSession) return

    const nearestLocation = findNearestLocation()
    if (!nearestLocation || nearestLocation.id !== currentSession.locationId) {
      toast({
        title: "Location Changed",
        description: "You need to be at the same study location to resume.",
        variant: "destructive",
      })
      return
    }

    setIsTracking(true)
    toast({
      title: "Study Session Resumed",
      description: "Your study session has been resumed.",
    })
  }

  const endStudySession = async () => {
    if (!currentSession) return

    const endTime = new Date().toISOString()
    // Duration should be calculated based on how elapsedTime is managed, or from start_time to endTime
    // For simplicity, let's assume getCurrentSessionDuration() returns seconds
    const durationInSeconds = getCurrentSessionDuration() * 60 // If getCurrentSessionDuration is in minutes

    try {
      const updatedSession = await api.updateStudySession(currentSession.id, {
        end_time: endTime,
        duration: durationInSeconds, // Ensure this is in seconds
        status: "completed",
      })
      if (!updatedSession) throw new Error("Failed to update session in DB")

      setStudyHistory((prev) =>
        [...prev, updatedSession].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
      )
      setCurrentSession(null)
      setIsTracking(false)
      toast({
        title: "Study Session Completed",
        description: `Logged ${formatDuration(durationInSeconds / 60)} of study time.`, // formatDuration expects minutes
      })
    } catch (error) {
      console.error("Failed to end study session:", error)
      toast({ title: "Error", description: "Could not save study session.", variant: "destructive" })
    }
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getCurrentSessionDuration = () => {
    if (!currentSession || !isTracking) return 0
    return Math.floor((new Date() - new Date(currentSession.start_time)) / 1000 / 60)
  }

  const getWeeklyStudyHours = () => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const weeklyMinutes = studyHistory
      .filter((session) => new Date(session.start_time) >= oneWeekAgo)
      .reduce((total, session) => total + session.duration, 0)

    return Math.floor(weeklyMinutes / 60)
  }

  const nearestLocation = findNearestLocation()

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)]">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Locations</h1>
          <p className="text-muted-foreground">Track your study hours at designated locations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {isAdmin && (
            <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
              <DialogTrigger asChild>
                <Button className="bg-rose-700 hover:bg-rose-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Edit Study Location" : "Add Study Location"}</DialogTitle>
                  <DialogDescription>
                    {editingLocation
                      ? "Update the details of this study location."
                      : "Add a new location where members can track study hours."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="location-name">Location Name</Label>
                    <Input
                      id="location-name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., University Library"
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location-address">Address</Label>
                    <Input
                      id="location-address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="e.g., 123 University Ave"
                      className={errors.address ? "border-red-500" : ""}
                    />
                    {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location-radius">
                      Radius (meters)
                      <span className="ml-1 text-sm text-slate-500">{formData.radius}m</span>
                    </Label>
                    <Input
                      id="location-radius"
                      name="radius"
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={formData.radius}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-slate-500">
                      This defines how close members need to be to this location to track study hours.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingLocation(null)
                      setFormData({
                        name: "",
                        address: "",
                        radius: 100,
                      })
                      setShowAddLocationDialog(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-rose-700 hover:bg-rose-800"
                    onClick={editingLocation ? handleUpdateLocation : handleAddLocation}
                  >
                    {editingLocation ? "Update Location" : "Add Location"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="track" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="track">Track Study</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="track" className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Study Tracking
              </CardTitle>
              <CardDescription>Track your study hours at approved locations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nearestLocation ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">You're at {nearestLocation.name}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Distance: {Math.round(nearestLocation.distance)}m from center
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Not at a study location</span>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">
                    Move closer to a designated study location to start tracking.
                  </p>
                </div>
              )}

              {currentSession && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">Current Session</p>
                      <p className="text-sm text-blue-700">
                        {currentSession.location_name} • Started at {formatTime(currentSession.start_time)}
                      </p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {formatDuration(getCurrentSessionDuration())}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isTracking ? (
                        <Button size="sm" variant="outline" onClick={pauseStudySession}>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button size="sm" onClick={resumeStudySession}>
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={endStudySession}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        End
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {!currentSession && (
                  <Button
                    onClick={startStudySession}
                    disabled={!nearestLocation}
                    className="bg-rose-700 hover:bg-rose-800"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Study Session
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress</CardTitle>
              <CardDescription>Your study hours for this week.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Study Hours</span>
                  <span>
                    {getWeeklyStudyHours()} / {studyRequirement} hours
                  </span>
                </div>
                <Progress value={(getWeeklyStudyHours() / studyRequirement) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {studyRequirement - getWeeklyStudyHours() > 0
                    ? `${studyRequirement - getWeeklyStudyHours()} hours remaining this week`
                    : "Weekly goal completed! 🎉"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle>Study Locations Map</CardTitle>
              <CardDescription>Find nearby study locations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] rounded-lg overflow-hidden">
                <MapComponent userLocation={userLocation} studyLocations={studyLocations} useAppleMaps={false} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Study Locations</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Manage locations where members can track study hours."
                  : "View locations where you can track study hours."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studyLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-500">
                        No study locations have been added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    studyLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>{location.address || "N/A"}</TableCell>
                        <TableCell>
                          {location.isBox ? (
                            <div className="flex items-center gap-1">
                              <Square className="h-3 w-3 text-green-600" />
                              <span className="text-sm">Study Zone</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-600" />
                              <span className="text-sm">Radius: {location.radius}m</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(location.createdAt)}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditLocation(location)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteLocation(location.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {!isAdmin && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Need a New Study Location?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contact your chapter administrators to request new study locations be added.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Study History</CardTitle>
              <CardDescription>Your completed study sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studyHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No study sessions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    studyHistory
                      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
                      .map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.location_name}</TableCell>
                          <TableCell>{formatDate(session.start_time)}</TableCell>
                          <TableCell>{formatTime(session.start_time)}</TableCell>
                          <TableCell>{formatDuration(session.duration / 60)}</TableCell>
                          <TableCell>
                            <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                              {session.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
