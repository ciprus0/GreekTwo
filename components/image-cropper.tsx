"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react"

interface ImageCropperProps {
  image: File
  onCropComplete: (croppedFile: File) => void
  onCancel: () => void
}

export default function ImageCropper({ image, onCropComplete, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageUrl, setImageUrl] = useState<string>("")

  // Create image URL when component mounts
  useEffect(() => {
    const url = URL.createObjectURL(image)
    setImageUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [image])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !imageLoaded) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match display size
    const displaySize = 320 // 80 * 4 (w-80 = 320px)
    canvas.width = displaySize
    canvas.height = displaySize

    // Clear canvas
    ctx.clearRect(0, 0, displaySize, displaySize)

    // Save context
    ctx.save()

    // Move to center of canvas
    ctx.translate(displaySize / 2, displaySize / 2)

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180)

    // Calculate base size - make image fill the crop area initially
    const imgAspect = img.naturalWidth / img.naturalHeight
    let baseWidth, baseHeight

    if (imgAspect > 1) {
      // Landscape - fit height
      baseHeight = displaySize
      baseWidth = baseHeight * imgAspect
    } else {
      // Portrait or square - fit width
      baseWidth = displaySize
      baseHeight = baseWidth / imgAspect
    }

    // Apply scale
    const drawWidth = baseWidth * scale
    const drawHeight = baseHeight * scale

    // Draw image centered with position offset
    ctx.drawImage(img, -drawWidth / 2 + position.x, -drawHeight / 2 + position.y, drawWidth, drawHeight)

    // Restore context
    ctx.restore()
  }, [imageLoaded, scale, rotation, position])

  // Redraw canvas when parameters change
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const handleImageLoad = () => {
    setImageLoaded(true)
    // Reset position when image loads
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!isDragging) return

    const touch = e.touches[0]
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)))
  }

  const handleScaleChange = (value: number[]) => {
    setScale(value[0])
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleCrop = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a new canvas for the final crop at 400x400
    const cropCanvas = document.createElement("canvas")
    const cropCtx = cropCanvas.getContext("2d")
    if (!cropCtx) return

    cropCanvas.width = 400
    cropCanvas.height = 400

    // Draw the current canvas content scaled to 400x400
    cropCtx.drawImage(canvas, 0, 0, 400, 400)

    // Convert to blob
    cropCanvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], `cropped-${image.name}`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          })
          onCropComplete(croppedFile)
        }
      },
      "image/jpeg",
      0.9,
    )
  }

  return (
    <div className="space-y-4">
      {/* Hidden image for loading */}
      <img
        ref={imageRef}
        src={imageUrl || "/placeholder.svg"}
        alt="Crop preview"
        className="hidden"
        onLoad={handleImageLoad}
      />

      {/* Crop area */}
      <div className="relative mx-auto">
        <div className="w-80 h-80 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-move touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          />
          {/* Crop overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white rounded-full shadow-lg"></div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Scale control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Zoom</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setScale((prev) => Math.max(0.5, prev - 0.2))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScale((prev) => Math.min(3, prev + 0.2))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Slider value={[scale]} onValueChange={handleScaleChange} min={0.5} max={3} step={0.1} className="w-full" />
        </div>

        {/* Rotation control */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Rotation</label>
          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="h-4 w-4 mr-2" />
            Rotate 90°
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleCrop} disabled={!imageLoaded}>
          Apply Crop
        </Button>
      </div>
    </div>
  )
}
