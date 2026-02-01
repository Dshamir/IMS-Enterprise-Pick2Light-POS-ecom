"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Camera, 
  X, 
  RotateCcw, 
  SwitchCamera, 
  Upload,
  Loader2,
  Download
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface UniversalCameraProps {
  onCapture: (file: File) => void
  onClose?: () => void
  mode?: 'photo' | 'scan'
  className?: string
}

export function UniversalCamera({ 
  onCapture, 
  onClose, 
  mode = 'photo',
  className 
}: UniversalCameraProps) {
  const isMobile = useIsMobile()
  const [isCamera, setIsCamera] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if camera is available
  const checkCameraAvailability = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.some(device => device.kind === 'videoinput')
    } catch {
      return false
    }
  }, [])

  // Start camera stream
  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
      
      setIsCamera(true)
    } catch (err: any) {
      console.error('Camera access error:', err)
      setError('Camera access denied or not available')
    } finally {
      setIsLoading(false)
    }
  }, [facingMode])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCamera(false)
  }, [stream])

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    stopCamera()
  }, [stopCamera])

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }, [onCapture, stopCamera])

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onCapture(file)
    }
  }, [onCapture])

  // Start camera when component mounts and user wants camera
  useEffect(() => {
    if (isCamera && !stream) {
      startCamera()
    }
  }, [isCamera, stream, startCamera])

  // Switch camera when facing mode changes
  useEffect(() => {
    if (isCamera && stream) {
      startCamera()
    }
  }, [facingMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Mobile-first approach: show native camera input by default on mobile
  if (isMobile && !isCamera) {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {mode === 'scan' ? 'Scan Barcode' : 'Take Photo'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {mode === 'scan' 
                  ? 'Use your camera to scan product barcodes'
                  : 'Take a photo of your product'
                }
              </p>
            </div>

            {/* Mobile native camera input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="space-y-2">
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 text-base"
                size="lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                Open Camera
              </Button>

              <Button 
                variant="outline"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture')
                    fileInputRef.current.click()
                  }
                }}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose from Gallery
              </Button>

              {/* Desktop camera option on mobile */}
              <Button 
                variant="outline"
                onClick={async () => {
                  const hasCamera = await checkCameraAvailability()
                  if (hasCamera) {
                    setIsCamera(true)
                  } else {
                    setError('Camera not available')
                  }
                }}
                className="w-full"
              >
                <SwitchCamera className="h-4 w-4 mr-2" />
                Use Web Camera
              </Button>
            </div>

            {onClose && (
              <Button variant="ghost" onClick={onClose} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Desktop camera interface
  if (isCamera) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Camera controls */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {mode === 'scan' ? 'Barcode Scanner' : 'Camera'}
              </h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={switchCamera}>
                  <SwitchCamera className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={stopCamera}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Camera preview */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[60vh] object-cover"
              />
              
              {mode === 'scan' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-red-500 bg-red-500/20 rounded-lg w-64 h-32" />
                </div>
              )}
              
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Camera actions */}
            <div className="flex justify-center space-x-4">
              <Button
                onClick={capturePhoto}
                disabled={isLoading || !stream}
                size="lg"
                className="h-12"
              >
                <Camera className="h-5 w-5 mr-2" />
                {mode === 'scan' ? 'Scan' : 'Capture'}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>
    )
  }

  // Desktop file upload interface
  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              {mode === 'scan' ? 'Scan Barcode' : 'Add Photo'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {mode === 'scan' 
                ? 'Use your camera to scan barcodes or upload an image'
                : 'Take a photo with your camera or upload an image'
              }
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="space-y-2">
            <Button 
              onClick={async () => {
                const hasCamera = await checkCameraAvailability()
                if (hasCamera) {
                  setIsCamera(true)
                } else {
                  setError('Camera not available')
                }
              }}
              className="w-full h-12 text-base"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Camera className="h-5 w-5 mr-2" />
              )}
              Open Camera
            </Button>

            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>

          {onClose && (
            <Button variant="ghost" onClick={onClose} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}