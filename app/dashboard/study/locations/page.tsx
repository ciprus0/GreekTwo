"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  ArrowLeft,
  Edit,
  Trash,
  MapPin,
  Square,
  Circle,
  RotateCcw,
  Move,
  ScalingIcon as Resize,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import dynamic from "next/dynamic"
import { api } from "@/lib/supabase-api"
import type { StudyLocation } from "@/types"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-slate-600 dark:text-slate-300">Loading map...</div>
    </div>
  ),
})

export default function StudyLocationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const mapRef = useRef(null)
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studyLocations, setStudyLocations] = useState<StudyLocation[]>([])
  const [userLocation, setUserLocation] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingLocation, setEditingLocation] = useState<StudyLocation | null>(null)
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
  const [showEditDialog, setShowEditDialog] = useState(false)

  const { getTextColor, getSecondaryTextColor, getMutedTextColor } = useTextColors()
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

  // Get theme-aware input classes
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

  // Get theme-aware button classes
  const getButtonClasses = (variant: "default" | "outline" | "ghost" | "link") => {
    switch (theme) {
      case "original":
        return variant === "default" ? "original-button" : "original-button-outline"
      case "light":
        return variant === "default" ? "light-glass-button" : "light-glass-button-outline"
      case "dark":
      default:
        return variant === "default" ? "glass-button" : "glass-button-outline"
    }
  }

  // Get theme-aware dialog classes (solid colors for dark theme to avoid lag)
  const getDialogClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border border-gray-200 shadow-lg"
      case "light":
        return "bg-white/95 backdrop-blur-sm border border-blue-200/60 shadow-lg"
      case "dark":
      default:
        return "bg-slate-800 border border-slate-700 shadow-lg"
    }
  }

  // Effect to load user from localStorage
  useEffect(() => {
    console.log("StudyLocationsPage: Initializing component.")
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting user location:", error)
          setUserLocation({ lat: 41.8781, lng: -87.6298 }) // Default
        },
      )
    } else {
      setUserLocation({ lat: 41.8781, lng: -87.6298 }) // Default
    }

    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      console.log("StudyLocationsPage (localStorage effect): User data loaded:", JSON.parse(JSON.stringify(parsedUser)))
      setUser(parsedUser)
      const adminRoles = ["Group Owner", "President", "Treasurer"]
      setIsAdmin(parsedUser.roles && parsedUser.roles.some((role) => adminRoles.includes(role)))
    } else {
      console.warn("StudyLocationsPage (localStorage effect): No user data found in localStorage.")
      setLoading(false)
    }
  }, [])

  // Effect to fetch locations when user object is available/updated
  useEffect(() => {
    const fetchLocations = async () => {
      if (!user) {
        console.log("StudyLocationsPage (fetch effect): User object not yet available. Skipping fetch.")
        return
      }

      const orgId = user.organizationId || user.organization_id
      console.log("StudyLocationsPage (fetch effect): Current user for fetch:", JSON.parse(JSON.stringify(user)))
      console.log("StudyLocationsPage (fetch effect): Using organizationId:", orgId)

      if (!orgId) {
        console.warn("StudyLocationsPage (fetch effect): organizationId is missing. Cannot fetch locations.")
        setStudyLocations([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        console.log("StudyLocationsPage (fetch effect): Calling api.getStudyLocationsByOrganization with orgId:", orgId)
        const orgLocationsData = await api.getStudyLocationsByOrganization(orgId)
        console.log("StudyLocationsPage (fetch effect): Received locations from API:", orgLocationsData)
        setStudyLocations(orgLocationsData || [])
      } catch (error) {
        console.error("StudyLocationsPage (fetch effect): Failed to fetch study locations:", error)
        toast({ title: "Error", description: "Failed to load study locations.", variant: "destructive" })
        setStudyLocations([])
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [user, toast])

  const handleMapClick = (e) => {
    // Handle different event structures - the map component passes latlng directly
    const latlng = e.latlng || e
    
    if (isMovingShape) {
      if (drawingCircle) {
        setDrawingCircle({
          ...drawingCircle,
          center: { lat: latlng.lat, lng: latlng.lng },
        })
      } else if (drawingBox) {
        const latDiff = drawingBox.se.lat - drawingBox.nw.lat
        const lngDiff = drawingBox.se.lng - drawingBox.nw.lng
        setDrawingBox({
          ...drawingBox,
          nw: { lat: latlng.lat, lng: latlng.lng },
          se: { lat: latlng.lat + latDiff, lng: latlng.lng + lngDiff },
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
          center: { lat: latlng.lat, lng: latlng.lng },
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
          nw: { lat: latlng.lat, lng: latlng.lng },
          se: { lat: latlng.lat, lng: latlng.lng },
          isDrawing: true,
        })
      } else if (drawingBox.isDrawing) {
        setDrawingBox({
          ...drawingBox,
          se: { lat: latlng.lat, lng: latlng.lng },
          isDrawing: false,
        })
        setClickMode(false)
      }
    }
  }

  const handleMapMove = (e) => {
    // Handle different event structures - the map component passes latlng directly
    const latlng = e.latlng || e
    
    if (drawingBox && drawingBox.isDrawing) {
      setDrawingBox({
        ...drawingBox,
        se: { lat: latlng.lat, lng: latlng.lng },
      })
    } else if (drawingCircle && drawingCircle.isDrawing) {
      const distance = calculateDistance(drawingCircle.center, { lat: latlng.lat, lng: latlng.lng })
      setDrawingCircle({
        ...drawingCircle,
        radius: Math.max(50, Math.min(500, distance)),
      })
    } else if (isResizingShape && drawingCircle) {
      const distance = calculateDistance(drawingCircle.center, { lat: latlng.lat, lng: latlng.lng })
      setDrawingCircle({
        ...drawingCircle,
        radius: Math.max(50, Math.min(500, distance)),
      })
    } else if (isResizingShape && drawingBox) {
      setDrawingBox({
        ...drawingBox,
        se: { lat: latlng.lat, lng: latlng.lng },
      })
    }
  }

  const calculateDistance = (point1, point2) => {
    const R = 6371000
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const startDrawingCircle = () => {
    setDrawingMode("circle")
    setClickMode(true)
    setDrawingBox(null)
    setIsMovingShape(false)
    setIsResizingShape(false)
    toast({
      title: "Circle Mode",
      description: "Click and drag to draw a circular study area.",
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
      description: "Click and drag to draw a rectangular study zone.",
    })
  }

  const startResizing = () => {
    if (!drawingCircle && !drawingBox) {
      toast({
        title: "No Shape Selected",
        description: "Please draw a shape first before resizing.",
        variant: "destructive",
      })
      return
    }
    setIsResizingShape(true)
    setClickMode(true)
    setIsMovingShape(false)
    if (drawingCircle) setDrawingCircle({ ...drawingCircle, isDrawing: true })
    else if (drawingBox) setDrawingBox({ ...drawingBox, isDrawing: true })
    toast({
      title: "Resize Mode",
      description: "Move your mouse to resize the shape, then click to confirm.",
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
    // Don't clear drawing state when typing in form inputs
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
    console.log("StudyLocationsPage (handleSaveLocation): Starting save...")
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please check form fields.", variant: "destructive" })
      return
    }

    const currentUserId = user?.id
    const currentOrgId = user?.organizationId || user?.organization_id

    console.log("StudyLocationsPage (handleSaveLocation): User ID:", currentUserId, "Org ID:", currentOrgId)

    if (!user || !currentUserId || !currentOrgId) {
      console.error("StudyLocationsPage (handleSaveLocation): User data missing or incomplete.")
      toast({ title: "User Error", description: "User data unavailable. Please log in.", variant: "destructive" })
      return
    }

    let locationData: Omit<StudyLocation, "id" | "created_at">

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

    console.log("StudyLocationsPage (handleSaveLocation): Location data to save:", locationData)

    try {
      const newLocation = await api.createStudyLocation(locationData)
      if (!newLocation || !newLocation.id) throw new Error("Failed to save location to DB.")
      console.log("StudyLocationsPage (handleSaveLocation): Location saved, newLocation:", newLocation)
      setStudyLocations((prev) => [...prev, newLocation])
      setFormData({ name: "", address: "", radius: 100, size: 100 })
      clearDrawing()
      setShowCreateDialog(false)
      toast({ title: "Location Added", description: "Study location added successfully." })
    } catch (error) {
      console.error("StudyLocationsPage (handleSaveLocation): Error saving location:", error)
      toast({ title: "Error Saving", description: `Could not save location. ${error.message}`, variant: "destructive" })
    }
  }

  const handleEditLocation = (location: StudyLocation) => {
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

    const updates: Partial<StudyLocation> = {
      name: formData.name,
      address: formData.address || undefined,
    }
    if (!editingLocation.is_box) {
      updates.radius = Number(formData.radius)
    }

    try {
      const updatedLocation = await api.updateStudyLocation(editingLocation.id, updates)
      if (!updatedLocation) throw new Error("Failed to update location in DB")
      setStudyLocations((prev) => prev.map((loc) => (loc.id === editingLocation.id ? updatedLocation : loc)))
      setShowEditDialog(false)
      setEditingLocation(null)
      toast({ title: "Location Updated", description: "Study location updated successfully." })
    } catch (error) {
      console.error("Failed to update location:", error)
      toast({ title: "Error", description: "Could not update study location.", variant: "destructive" })
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    try {
      const success = await api.deleteStudyLocation(locationId)
      if (!success) throw new Error("Failed to delete location from DB")
      setStudyLocations((prev) => prev.filter((loc) => loc.id !== locationId))
      toast({ title: "Location Deleted", description: "Study location deleted successfully." })
    } catch (error) {
      console.error("Failed to delete location:", error)
      toast({ title: "Error", description: "Could not delete study location.", variant: "destructive" })
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
      <ThemeWrapper>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-700 mx-auto mb-4"></div>
            <p className={getSecondaryTextColor()}>Loading study locations...</p>
          </div>
        </div>
      </ThemeWrapper>
    )
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Study Locations</h1>
            <p className={`text-muted-foreground ${getMutedTextColor()}`}>
              Manage locations where members can track study hours.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()} className="glass-button-outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {isAdmin && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-rose-700 hover:bg-rose-800 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Study Location
                  </Button>
                </DialogTrigger>
                <DialogContent className={`sm:max-w-[900px] max-h-[90vh] overflow-y-auto shadow-2xl ${getDialogClasses()}`}>
                  <DialogHeader>
                    <DialogTitle className={getTextColor()}>Create New Study Location</DialogTitle>
                    <DialogDescription className={getSecondaryTextColor()}>
                      Draw a shape on the map and fill in the details to create a new study location.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant={drawingMode === "circle" ? "default" : "outline"}
                        size="sm"
                        onClick={startDrawingCircle}
                      >
                        <Circle className="mr-2 h-4 w-4" /> Circle
                      </Button>
                      <Button
                        variant={drawingMode === "box" ? "default" : "outline"}
                        size="sm"
                        onClick={startDrawingBox}
                      >
                        <Square className="mr-2 h-4 w-4" /> Square
                      </Button>
                      <Button
                        variant={isResizingShape ? "default" : "outline"}
                        size="sm"
                        onClick={startResizing}
                        disabled={!drawingCircle && !drawingBox}
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
                        onClick={startMoving}
                        disabled={!drawingCircle && !drawingBox}
                      >
                        <Move className="mr-2 h-4 w-4" /> Move
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearDrawing}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" /> Clear
                      </Button>
                    </div>
                    <div className="h-[400px] rounded-lg overflow-hidden border">
                      <MapComponent
                        userLocation={userLocation}
                        studyLocations={studyLocations}
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
                    
                    {/* Show form once a shape is drawn - always show if shape exists */}
                    {(drawingCircle || drawingBox) ? (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="location-name">
                            Location Name
                          </Label>
                          <Input
                            id="location-name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g., University Library"
                            className={`${getInputClasses()} ${errors.name ? "border-red-500" : ""}`}
                          />
                          {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="location-address">
                            Address (Optional)
                          </Label>
                          <Input
                            id="location-address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="e.g., 123 University Ave"
                            className={getInputClasses()}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleSaveLocation}
                            className={getButtonClasses("default")}
                          >
                            Save Location
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              clearDrawing()
                              setShowCreateDialog(false)
                            }}
                            className={getButtonClasses("outline")}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          Click on the map to start drawing a location, or use the drawing tools above.
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

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
                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8">
                      No study locations have been added yet for this organization.
                    </TableCell>
                  </TableRow>
                ) : (
                  studyLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.address || "N/A"}</TableCell>
                      <TableCell>
                        {location.is_box ? (
                          <Badge variant="secondary">
                            <Square className="mr-1 h-3 w-3" /> Study Zone
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Circle className="mr-1 h-3 w-3" /> {location.radius}m radius
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(location.created_at)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEditLocation(location)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className={`sm:max-w-[500px] shadow-2xl ${getDialogClasses()}`}>
                                <DialogHeader>
                                  <DialogTitle className={getTextColor()}>Edit Study Location</DialogTitle>
                                  <DialogDescription className={getSecondaryTextColor()}>
                                    Update the details of this study location.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-location-name">
                                      Location Name
                                    </Label>
                                    <Input
                                      id="edit-location-name"
                                      name="name"
                                      value={formData.name}
                                      onChange={handleInputChange}
                                      className={`${getInputClasses()} ${errors.name ? "border-red-500" : ""}`}
                                    />
                                    {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-location-address">
                                      Address
                                    </Label>
                                    <Input
                                      id="edit-location-address"
                                      name="address"
                                      value={formData.address}
                                      onChange={handleInputChange}
                                      className={getInputClasses()}
                                    />
                                  </div>
                                  {!editingLocation?.is_box && (
                                    <div className="grid gap-2">
                                      <Label htmlFor="edit-location-radius">
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
                                    className={getButtonClasses("outline")}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleUpdateLocation}
                                    className={getButtonClasses("default")}
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
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Map View</CardTitle>
            <CardDescription>
              Visual representation of all study locations and your current location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              {!showCreateDialog && (
                <MapComponent userLocation={userLocation} studyLocations={studyLocations} useAppleMaps={false} />
              )}
            </div>
          </CardContent>
        </Card>

        {!isAdmin && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <MapPin className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Need a New Study Location?</h3>
                <p className="text-sm mb-4">
                  Contact your chapter administrators to request new study locations be added.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ThemeWrapper>
  )
}
