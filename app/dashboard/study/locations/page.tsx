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
  Maximize2,
  X,
  Check,
  Pencil,
  Trash2,
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
  const [drawingMode, setDrawingMode] = useState<"circle" | "box" | "resize" | "move" | null>(null)
  const [drawingBox, setDrawingBox] = useState(null)
  const [drawingCircle, setDrawingCircle] = useState(null)
  const [isMovingShape, setIsMovingShape] = useState(false)
  const [isResizingShape, setIsResizingShape] = useState(false)
  const [showLocationForm, setShowLocationForm] = useState(false)
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
        // First click - start drawing circle
        setDrawingCircle({
          center: { lat: e.latlng.lat, lng: e.latlng.lng },
          radius: 100,
          isDrawing: true,
        })
      } else if (drawingCircle.isDrawing) {
        // Second click - finish drawing circle
        setDrawingCircle({
          ...drawingCircle,
          isDrawing: false,
        })
        setClickMode(false)
        setDrawingMode(null)
        // Show form to enter name and address
        setShowLocationForm(true)
      }
    } else if (clickMode && drawingMode === "box") {
      if (!drawingBox) {
        // First click - start drawing box
        setDrawingBox({
          nw: { lat: e.latlng.lat, lng: e.latlng.lng },
          se: { lat: e.latlng.lat, lng: e.latlng.lng },
          isDrawing: true,
        })
      } else if (drawingBox.isDrawing) {
        // Second click - finish drawing box
        setDrawingBox({
          ...drawingBox,
          se: { lat: e.latlng.lat, lng: e.latlng.lng },
          isDrawing: false,
        })
        setClickMode(false)
        setDrawingMode(null)
        // Show form to enter name and address
        setShowLocationForm(true)
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
    setShowLocationForm(false)
    setFormData({
      name: "",
      address: "",
      radius: 100,
      size: 100,
    })
  }

  const handleLocationFormSubmit = async () => {
    if (!validateForm()) return

    try {
      const locationData = {
        name: formData.name,
        address: formData.address,
        organization_id: user.organizationId,
        created_by: user.id,
      }

      if (drawingCircle) {
        locationData.lat = drawingCircle.center.lat
        locationData.lng = drawingCircle.center.lng
        locationData.radius = drawingCircle.radius
        locationData.is_box = false
      } else if (drawingBox) {
        locationData.lat = (drawingBox.nw.lat + drawingBox.se.lat) / 2
        locationData.lng = (drawingBox.nw.lng + drawingBox.se.lng) / 2
        locationData.box_coordinates = drawingBox
        locationData.is_box = true
      }

      const newLocation = await api.createStudyLocation(locationData)
      setStudyLocations((prev) => [...prev, newLocation])
      
      // Clear everything and close dialog
      clearDrawing()
      setShowCreateDialog(false)
      
      toast({
        title: "Location Created",
        description: "Study location has been created successfully.",
      })
    } catch (error) {
      console.error("Failed to create location:", error)
      toast({
        title: "Error",
        description: "Could not create study location.",
        variant: "destructive",
      })
    }
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

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Study Locations</h1>
          <p className={`text-muted-foreground ${getMutedTextColor()}`}>Manage locations where members can track study hours.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-700 mx-auto mb-4"></div>
              <p className={`${getSecondaryTextColor()}`}>Loading study locations...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Study Locations Table */}
            <div className={`${getCardClasses()} overflow-hidden`}>
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-semibold ${getTextColor()}`}>Study Locations</h2>
                  <p className={`text-sm ${getSecondaryTextColor()}`}>Manage locations where members can track study hours.</p>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className={`${getButtonClasses("default")}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Study Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={`${getCardClasses()} sm:max-w-[900px] max-h-[90vh] overflow-y-auto shadow-2xl`}>
                    <DialogHeader>
                      <DialogTitle className={getTextColor()}>Create New Study Location</DialogTitle>
                      <DialogDescription className={getSecondaryTextColor()}>
                        {showLocationForm 
                          ? "Enter the details for your study location."
                          : "Draw a shape on the map and fill in the details to create a new study location."
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!showLocationForm ? (
                        <>
                          {/* Drawing Controls */}
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
                              variant={drawingMode === "resize" ? "default" : "outline"}
                              size="sm"
                              onClick={toggleResizeMode}
                              className={
                                drawingMode === "resize"
                                  ? "bg-rose-700 hover:bg-rose-800 text-white"
                                  : `${getButtonClasses("outline")}`
                              }
                            >
                              <Resize className="mr-2 h-4 w-4" /> Resize
                            </Button>
                            <Button
                              variant={drawingMode === "move" ? "default" : "outline"}
                              size="sm"
                              onClick={toggleMoveMode}
                              className={
                                drawingMode === "move"
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
                              <X className="mr-2 h-4 w-4" /> Clear
                            </Button>
                          </div>

                          {/* Map */}
                          <div className="h-[500px] rounded-lg overflow-hidden border">
                            <MapComponent
                              userLocation={userLocation}
                              studyLocations={studyLocations}
                              onMapClick={handleMapClick}
                              onMapMove={handleMapMove}
                              clickMode={clickMode}
                              drawingBox={drawingBox}
                              drawingCircle={drawingCircle}
                              isMovingShape={isMovingShape}
                              isResizingShape={isResizingShape}
                              mapRef={mapRef}
                            />
                          </div>

                          {/* Instructions */}
                          {clickMode && (
                            <div className={`p-3 rounded-lg ${getCardClasses()}`}>
                              <p className={`text-sm ${getSecondaryTextColor()}`}>
                                {drawingMode === "circle" && !drawingCircle
                                  ? "Click on the map to place the center of your circle, then drag to resize."
                                  : drawingMode === "circle" && drawingCircle?.isDrawing
                                  ? "Drag to resize the circle, then click to finish."
                                  : drawingMode === "box" && !drawingBox
                                  ? "Click on the map to place the corner of your box, then drag to resize."
                                  : drawingMode === "box" && drawingBox?.isDrawing
                                  ? "Drag to resize the box, then click to finish."
                                  : "Click on the map to interact with the shape."
                                }
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Location Form */}
                          <div className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="name" className={getTextColor()}>
                                Location Name *
                              </Label>
                              <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g., Library Study Room"
                                className="glass-input"
                              />
                              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="address" className={getTextColor()}>
                                Address
                              </Label>
                              <Input
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="e.g., 123 Main St, City, State"
                                className="glass-input"
                              />
                              {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
                            </div>
                            
                            {/* Shape Preview */}
                            <div className={`p-3 rounded-lg ${getCardClasses()}`}>
                              <p className={`text-sm font-medium ${getTextColor()}`}>Shape Preview:</p>
                              <p className={`text-sm ${getSecondaryTextColor()}`}>
                                {drawingCircle 
                                  ? `Circle with radius: ${Math.round(drawingCircle.radius)}m`
                                  : drawingBox 
                                  ? `Rectangle from (${drawingBox.nw.lat.toFixed(4)}, ${drawingBox.nw.lng.toFixed(4)}) to (${drawingBox.se.lat.toFixed(4)}, ${drawingBox.se.lng.toFixed(4)})`
                                  : "No shape drawn"
                                }
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
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
                      {showLocationForm && (
                        <Button
                          onClick={handleLocationFormSubmit}
                          className={`${getButtonClasses("default")}`}
                        >
                          Create Location
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${theme === "original" ? "bg-gray-50" : theme === "light" ? "bg-blue-50/50" : "bg-slate-800"}`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getMutedTextColor()}`}>
                        Location Name
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getMutedTextColor()}`}>
                        Address
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getMutedTextColor()}`}>
                        Type
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getMutedTextColor()}`}>
                        Created
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${getMutedTextColor()}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === "original" ? "divide-gray-200" : theme === "light" ? "divide-blue-200/50" : "divide-white/10"}`}>
                    {studyLocations.map((location) => (
                      <tr key={location.id} className={`hover:bg-opacity-50 ${theme === "original" ? "hover:bg-gray-50" : theme === "light" ? "hover:bg-blue-50/30" : "hover:bg-white/5"}`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTextColor()}`}>
                          {location.name}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getSecondaryTextColor()}`}>
                          {location.address || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            <Check className="mr-1 h-3 w-3" />
                            Study Zone
                          </Badge>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getSecondaryTextColor()}`}>
                          {formatDate(location.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLocation(location)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLocation(location.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Map View */}
            <div className={`${getCardClasses()} overflow-hidden`}>
              <div className="p-6 border-b">
                <h2 className={`text-xl font-semibold ${getTextColor()}`}>Map View</h2>
                <p className={`text-sm ${getSecondaryTextColor()}`}>Visual representation of all study locations and your current location.</p>
              </div>
              <div className="h-[500px]">
                {!showCreateDialog && (
                  <MapComponent
                    userLocation={userLocation}
                    studyLocations={studyLocations}
                    mapRef={mapRef}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeWrapper>
  )
}
