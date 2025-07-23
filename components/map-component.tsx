"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export default function MapComponent({
  userLocation,
  studyLocations,
  onMapClick,
  onMapMove,
  clickMode,
  drawingBox,
  drawingCircle,
  useAppleMaps = false,
  isMovingShape = false,
  isResizingShape = false,
  mapRef,
  isTracking = false,
}) {
  const containerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const locationMarkersRef = useRef([])
  const locationCirclesRef = useRef([])
  const locationBoxesRef = useRef([])
  const drawingBoxRef = useRef(null)
  const drawingCircleRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState(null)
  const [currentMousePos, setCurrentMousePos] = useState(null)

  useEffect(() => {
    // Fix Leaflet's default icon issue
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    })

    // Clean up any existing map instance
    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
    }

    // Initialize map if it doesn't exist
    if (!leafletMapRef.current && containerRef.current) {
      // Default to NYC if no user location
      const defaultLocation =
        userLocation && userLocation.lat && userLocation.lng
          ? { lat: userLocation.lat, lng: userLocation.lng }
          : { lat: 40.7128, lng: -74.006 }

      // Use Apple Maps tiles for iOS devices if requested
      if (useAppleMaps) {
        leafletMapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([defaultLocation.lat, defaultLocation.lng], 15)

        // Add Apple Maps-like tile layer
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(leafletMapRef.current)
      } else {
        leafletMapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([defaultLocation.lat, defaultLocation.lng], 15)

        // Add OpenStreetMap tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(leafletMapRef.current)
      }

      // Add click handler for adding new locations
      leafletMapRef.current.on("click", (e) => {
        if (onMapClick && clickMode) {
          onMapClick(e)
        }
      })

      // Add mousemove handler for drawing and moving shapes
      leafletMapRef.current.on("mousemove", (e) => {
        setCurrentMousePos(e.latlng)
        if (onMapMove && (drawingBox?.isDrawing || isDragging || isMovingShape || isResizingShape)) {
          onMapMove(e)
        }
      })

      // Add mousedown handler for starting drag operations
      leafletMapRef.current.on("mousedown", (e) => {
        if ((drawingBoxRef.current || drawingCircleRef.current) && (isMovingShape || isResizingShape)) {
          setIsDragging(true)
          setDragStartPos(e.latlng)

          // Prevent map dragging while resizing shapes
          leafletMapRef.current.dragging.disable()
        }
      })

      // Add mouseup handler for ending drag operations
      leafletMapRef.current.on("mouseup", () => {
        if (isDragging) {
          setIsDragging(false)
          setDragStartPos(null)
          // Re-enable map dragging
          leafletMapRef.current.dragging.enable()
        }
      })

      setMapLoaded(true)
    }

    // Update map when user location changes
    if (leafletMapRef.current && userLocation && userLocation.lat && userLocation.lng && mapLoaded) {
      // Center map on user location if it's the first time
      if (!userMarkerRef.current) {
        leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 15)
      }

      // Add or update user marker
      if (userMarkerRef.current) {
        // Only update the marker position, don't redraw the entire map
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
      } else {
        // Create a blue marker for user
        const blueIcon = new L.Icon({
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
          className: "user-location-marker",
        })

        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: blueIcon,
        }).addTo(leafletMapRef.current)
        userMarkerRef.current.bindPopup("Your location")
      }
    }

    // Update study locations on the map - only do this when not tracking to prevent flashing
    if (leafletMapRef.current && studyLocations && Array.isArray(studyLocations) && mapLoaded && !isTracking) {
      // Clear existing markers, circles, and boxes
      locationMarkersRef.current.forEach((marker) => marker.remove())
      locationCirclesRef.current.forEach((circle) => circle.remove())
      locationBoxesRef.current.forEach((box) => box.remove())
      locationMarkersRef.current = []
      locationCirclesRef.current = []
      locationBoxesRef.current = []

      // Add new markers and shapes for each study location
      studyLocations.forEach((location) => {
        // Validate location has required properties
        console.log("MapComponent: Processing studyLocation for map display:", JSON.parse(JSON.stringify(location)))
        if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
          console.warn("Invalid location data:", location)
          return
        }

        // Create a red icon for study locations
        const redIcon = new L.Icon({
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
          className: "study-location-marker",
        })

        // Create a marker for study location
        const marker = L.marker([location.lat, location.lng], {
          icon: redIcon,
        }).addTo(leafletMapRef.current)

        console.log("MapComponent: Processing studyLocation for map:", location)
        if (location.is_box && location.box_coordinates) {
          // Validate box coordinates
          if (
            location.box_coordinates.nw &&
            location.box_coordinates.se &&
            typeof location.box_coordinates.nw.lat === "number" &&
            typeof location.box_coordinates.nw.lng === "number" &&
            typeof location.box_coordinates.se.lat === "number" &&
            typeof location.box_coordinates.se.lng === "number"
          ) {
            marker.bindPopup(`<b>${location.name || "Study Location"}</b><br>${location.address || ""}`)

            // Create a rectangle to represent the study zone
            const bounds = [
              [location.box_coordinates.nw.lat, location.box_coordinates.nw.lng],
              [location.box_coordinates.se.lat, location.box_coordinates.se.lng],
            ]

            const rectangle = L.rectangle(bounds, {
              color: "#8B1538", // garnet
              weight: 2,
              fillColor: "#FDF2F8", // rose-50
              fillOpacity: 0.2,
            }).addTo(leafletMapRef.current)

            console.log("MapComponent: Drew RECTANGLE for", location.name, "with bounds:", bounds)
            locationBoxesRef.current.push(rectangle)
          }
        } else if (typeof location.radius === "number" && location.radius > 0) {
          marker.bindPopup(
            `<b>${location.name || "Study Location"}</b><br>${location.address || ""}<br>Radius: ${location.radius}m`,
          )

          // Create a circle to represent the study area radius
          const circle = L.circle([location.lat, location.lng], {
            radius: location.radius,
            color: "#8B1538", // garnet
            fillColor: "#FDF2F8", // rose-50
            fillOpacity: 0.2,
            weight: 2,
          }).addTo(leafletMapRef.current)

          console.log(
            "MapComponent: Drew CIRCLE for",
            location.name,
            "with center:",
            [location.lat, location.lng],
            "radius:",
            location.radius,
          )
          locationCirclesRef.current.push(circle)
        }

        locationMarkersRef.current.push(marker)
      })
    }

    // Handle drawing box with real-time mouse following
    if (leafletMapRef.current && drawingBox && mapLoaded) {
      // Remove existing drawing box
      if (drawingBoxRef.current) {
        drawingBoxRef.current.remove()
        drawingBoxRef.current = null
      }

      // Validate drawing box coordinates
      if (
        drawingBox.nw &&
        drawingBox.se &&
        typeof drawingBox.nw.lat === "number" &&
        typeof drawingBox.nw.lng === "number" &&
        typeof drawingBox.se.lat === "number" &&
        typeof drawingBox.se.lng === "number"
      ) {
        if (drawingBox.isDrawing) {
          // Draw a rectangle from first click to current mouse position
          const bounds = [
            [drawingBox.nw.lat, drawingBox.nw.lng],
            [drawingBox.se.lat, drawingBox.se.lng],
          ]

          drawingBoxRef.current = L.rectangle(bounds, {
            color: "#8B1538", // garnet
            weight: 2,
            fillColor: "#FDF2F8", // rose-50
            fillOpacity: 0.3,
            dashArray: "5, 5", // Dashed line for drawing mode
          }).addTo(leafletMapRef.current)
        } else {
          // Draw a completed rectangle
          const bounds = [
            [drawingBox.nw.lat, drawingBox.nw.lng],
            [drawingBox.se.lat, drawingBox.se.lng],
          ]

          drawingBoxRef.current = L.rectangle(bounds, {
            color: "#8B1538", // garnet
            weight: 2,
            fillColor: "#FDF2F8", // rose-50
            fillOpacity: 0.4,
            interactive: true,
          }).addTo(leafletMapRef.current)

          // Make the rectangle interactive for dragging/resizing
          drawingBoxRef.current.on("mousedown", (e) => {
            if (isMovingShape || isResizingShape) {
              setIsDragging(true)
              setDragStartPos(e.latlng)
              L.DomEvent.stopPropagation(e)
            }
          })
        }
      }
    }

    // Handle drawing circle with real-time mouse following
    if (leafletMapRef.current && drawingCircle && mapLoaded) {
      // Remove existing drawing circle
      if (drawingCircleRef.current) {
        drawingCircleRef.current.remove()
        drawingCircleRef.current = null
      }

      // Validate drawing circle coordinates
      if (
        drawingCircle.center &&
        typeof drawingCircle.center.lat === "number" &&
        typeof drawingCircle.center.lng === "number" &&
        typeof drawingCircle.radius === "number" &&
        drawingCircle.radius > 0
      ) {
        // Draw a circle at the selected location
        drawingCircleRef.current = L.circle([drawingCircle.center.lat, drawingCircle.center.lng], {
          radius: drawingCircle.radius,
          color: "#8B1538", // garnet
          fillColor: "#FDF2F8", // rose-50
          fillOpacity: isResizingShape ? 0.3 : 0.4,
          weight: 2,
          interactive: true,
          dashArray: isResizingShape ? "5, 5" : "",
        }).addTo(leafletMapRef.current)

        // Make the circle interactive for dragging/resizing
        drawingCircleRef.current.on("mousedown", (e) => {
          if (isMovingShape || isResizingShape) {
            setIsDragging(true)
            setDragStartPos(e.latlng)
            L.DomEvent.stopPropagation(e)
          }
        })
      }
    }

    // Cleanup function
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        userMarkerRef.current = null
        locationMarkersRef.current = []
        locationCirclesRef.current = []
        locationBoxesRef.current = []
        drawingBoxRef.current = null
        drawingCircleRef.current = null
        setMapLoaded(false)
      }

      // Remove global event listeners
      document.removeEventListener("mouseup", () => {
        setIsDragging(false)
        setDragStartPos(null)
      })
    }
  }, [
    userLocation,
    studyLocations,
    onMapClick,
    onMapMove,
    clickMode,
    drawingBox,
    drawingCircle,
    useAppleMaps,
    isMovingShape,
    isResizingShape,
    mapLoaded,
    isDragging,
    mapRef,
    isTracking,
  ])

  // Add a new click handler for confirming shape edits
  useEffect(() => {
    if (leafletMapRef.current && (isMovingShape || isResizingShape)) {
      const handleMapClickForShapeEdit = (e) => {
        if (isMovingShape || isResizingShape) {
          // Call the onMapClick function with a special flag to indicate shape edit confirmation
          onMapClick({ ...e, confirmShapeEdit: true })
        }
      }

      leafletMapRef.current.on("click", handleMapClickForShapeEdit)

      return () => {
        if (leafletMapRef.current) {
          leafletMapRef.current.off("click", handleMapClickForShapeEdit)
        }
      }
    }
  }, [isMovingShape, isResizingShape, onMapClick])

  // Invalidate map size when container size changes
  useEffect(() => {
    if (leafletMapRef.current) {
      setTimeout(() => {
        leafletMapRef.current.invalidateSize()
      }, 100)
    }
  }, [containerRef.current?.clientWidth, containerRef.current?.clientHeight])

  return (
    <>
      <style jsx global>{`
        .user-location-marker {
          filter: hue-rotate(0deg);
        }
        
        .study-location-marker {
          filter: hue-rotate(140deg);
        }
        
        .leaflet-interactive {
          cursor: ${isMovingShape ? "move" : isResizingShape ? "nwse-resize" : "pointer"};
        }
        
        .leaflet-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          border-radius: 8px;
        }
        
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        .leaflet-control-zoom a {
          border-radius: 4px !important;
          margin-bottom: 4px;
        }
      `}</style>
      <div ref={containerRef} className="map-container w-full h-full" />
    </>
  )
}
