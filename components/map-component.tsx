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
  const [uniqueId] = useState(() => `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Cleanup function to properly destroy map
  const cleanupMap = () => {
    if (leafletMapRef.current) {
      // Remove all layers
      leafletMapRef.current.eachLayer((layer) => {
        leafletMapRef.current.removeLayer(layer)
      })
      
      // Destroy the map
      leafletMapRef.current.remove()
      leafletMapRef.current = null
    }
    
    // Clear refs
    userMarkerRef.current = null
    locationMarkersRef.current = []
    locationCirclesRef.current = []
    locationBoxesRef.current = []
    drawingBoxRef.current = null
    drawingCircleRef.current = null
    setMapLoaded(false)
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Clean up any existing map first
    cleanupMap()

    // Create unique container for this map instance
    const container = containerRef.current
    container.id = uniqueId

    // Initialize map with unique container
    const map = L.map(uniqueId, {
      center: userLocation ? [userLocation.lat, userLocation.lng] : [41.8781, -87.6298],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    })

    leafletMapRef.current = map

    // Add tile layer
    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }
    )
    tileLayer.addTo(map)

    // Add user location marker
    if (userLocation) {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: "user-marker",
          html: '<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      })
      userMarker.addTo(map)
      userMarkerRef.current = userMarker
    }

    // Add study location markers and shapes
    studyLocations.forEach((location) => {
      if (location.lat && location.lng) {
        // Add marker
        const marker = L.marker([location.lat, location.lng], {
          icon: L.divIcon({
            className: "location-marker",
            html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        })
        
        // Add popup with location name
        marker.bindPopup(`<b>${location.name || "Study Location"}</b><br>${location.address || ""}`)
        marker.addTo(map)
        locationMarkersRef.current.push(marker)

        // Add shape if exists
        if (location.is_box && location.box_coordinates) {
          // Handle box coordinates
          const bounds = [
            [location.box_coordinates.nw.lat, location.box_coordinates.nw.lng],
            [location.box_coordinates.se.lat, location.box_coordinates.se.lng],
          ]
          const rectangle = L.rectangle(bounds, {
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.1,
            weight: 2,
          })
          rectangle.bindPopup(`<b>${location.name || "Study Zone"}</b><br>${location.address || ""}`)
          rectangle.addTo(map)
          locationBoxesRef.current.push(rectangle)
        } else if (location.radius && location.radius > 0) {
          // Handle circle coordinates
          const circle = L.circle([location.lat, location.lng], {
            radius: location.radius,
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.1,
            weight: 2,
          })
          circle.bindPopup(`<b>${location.name || "Study Zone"}</b><br>${location.address || ""}<br>Radius: ${location.radius}m`)
          circle.addTo(map)
          locationCirclesRef.current.push(circle)
        }
      }
    })

    // Handle map events
    if (onMapClick) {
      map.on("click", (e) => {
        if (clickMode) {
          onMapClick(e.latlng)
        }
      })
    }

    if (onMapMove) {
      map.on("moveend", () => {
        onMapMove(map.getCenter())
      })
    }

    setMapLoaded(true)

    // Cleanup on unmount
    return () => {
      cleanupMap()
    }
  }, [userLocation, studyLocations, clickMode, onMapClick, onMapMove, uniqueId])

  // Handle drawing modes
  useEffect(() => {
    if (!leafletMapRef.current || !mapLoaded) return

    const map = leafletMapRef.current

    // Clear existing drawing
    if (drawingBoxRef.current) {
      map.removeLayer(drawingBoxRef.current)
      drawingBoxRef.current = null
    }
    if (drawingCircleRef.current) {
      map.removeLayer(drawingCircleRef.current)
      drawingCircleRef.current = null
    }

    // Add new drawing
    if (drawingBox && drawingBox.bounds) {
      const bounds = [
        [drawingBox.bounds.south, drawingBox.bounds.west],
        [drawingBox.bounds.north, drawingBox.bounds.east],
      ]
      const box = L.rectangle(bounds, {
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.2,
        weight: 2,
      })
      box.addTo(map)
      drawingBoxRef.current = box
    }

    if (drawingCircle && drawingCircle.center && drawingCircle.radius) {
      const circle = L.circle([drawingCircle.center.lat, drawingCircle.center.lng], {
        radius: drawingCircle.radius,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.2,
        weight: 2,
      })
      circle.addTo(map)
      drawingCircleRef.current = circle
    }
  }, [drawingBox, drawingCircle, mapLoaded])

  return (
    <div
      ref={containerRef}
      id={uniqueId}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: "400px" }}
    />
  )
}
