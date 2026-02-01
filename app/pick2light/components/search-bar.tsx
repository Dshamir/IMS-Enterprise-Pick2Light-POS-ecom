"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, Loader2, X, Camera, Image as ImageIcon, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SearchBarProps {
  onSearch: (query: string) => void
  onBarcodeSearch?: (file: File) => void
  onImageSearch?: (file: File) => void
  placeholder?: string
  debounceMs?: number
  isSearching?: boolean
}

export function SearchBar({
  onSearch,
  onBarcodeSearch,
  onImageSearch,
  placeholder = "Search by name, part number, barcode, manufacturer...",
  debounceMs = 300,
  isSearching = false
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState("")
  const [showCamera, setShowCamera] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barcodeFileInputRef = useRef<HTMLInputElement>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onSearch(inputValue.trim())
    }, debounceMs)

    // Cleanup on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [inputValue, debounceMs, onSearch])

  // Handle clear button
  const handleClear = () => {
    setInputValue("")
    onSearch("")
  }

  // Camera handlers
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
        setIsCameraActive(true)
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      alert('Camera access denied or not available.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraActive(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0)

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob && onBarcodeSearch) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
        onBarcodeSearch(file)
        setShowCamera(false)
        stopCamera()
      }
    }, 'image/jpeg', 0.95)
  }

  const handleBarcodeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onBarcodeSearch) {
      onBarcodeSearch(file)
    }
    e.target.value = '' // Reset input
  }

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImageSearch) {
      onImageSearch(file)
    }
    e.target.value = '' // Reset input
  }

  // Cleanup camera on unmount or dialog close
  useEffect(() => {
    if (!showCamera) {
      stopCamera()
    } else if (showCamera && !isCameraActive) {
      startCamera()
    }
  }, [showCamera])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <>
      <div className="space-y-3">
        {/* Text Search Bar */}
        <div className="relative w-full">
          {/* Search Icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </div>

          {/* Input Field */}
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-6 text-base bg-[#1a1a1a] border-[#212529] text-white placeholder:text-gray-500 focus:border-[#ffd60a] focus:ring-[#ffd60a]"
          />

          {/* Clear Button */}
          {inputValue && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Search Mode Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCamera(true)}
            disabled={!onBarcodeSearch}
            className="flex-1 bg-[#1a1a1a] border-[#212529] text-white hover:bg-[#212529] hover:text-[#ffd60a]"
          >
            <Camera className="h-4 w-4 mr-2" />
            Scan Barcode
          </Button>

          <input
            ref={barcodeFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBarcodeFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => barcodeFileInputRef.current?.click()}
            disabled={!onBarcodeSearch}
            className="flex-1 bg-[#1a1a1a] border-[#212529] text-white hover:bg-[#212529] hover:text-[#ffd60a]"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Upload Barcode
          </Button>

          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => imageFileInputRef.current?.click()}
            disabled={!onImageSearch}
            className="flex-1 bg-[#1a1a1a] border-[#212529] text-white hover:bg-[#212529] hover:text-[#ffd60a]"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Search by Image
          </Button>
        </div>
      </div>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-2xl bg-[#1a1a1a] border-[#212529] text-white">
          <DialogHeader>
            <DialogTitle>Scan Barcode or QR Code</DialogTitle>
            <DialogDescription className="text-gray-400">
              Position the barcode or QR code within the frame and capture
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-96 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning overlay */}
              <div className="absolute inset-0 border-2 border-white rounded-lg pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-32 border-4 border-[#ffd60a] bg-[#ffd60a]/10 rounded-lg">
                  <div className="text-white text-xs text-center mt-2">
                    {isCameraActive ? 'Position barcode here' : 'Starting camera...'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={captureImage}
                disabled={!isCameraActive}
                className="flex-1 bg-[#ffd60a] text-black hover:bg-[#ffd60a]/90"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture & Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCamera(false)}
                className="border-[#212529] text-white hover:bg-[#212529]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
