"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Camera, X, Smartphone, Upload, Loader2 } from "lucide-react"

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onProductsFound?: (products: any[]) => void
  onClose?: () => void
}

export function BarcodeScanner({ onDetected, onProductsFound, onClose }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera')
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [manualInput, setManualInput] = useState("")
  const [error, setError] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startCamera = async () => {
    try {
      setError("")
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
        setIsScanning(true)
        startBarcodeDetection()
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setError('Camera access denied or not available. Please use manual input.')
      setMode('manual')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setIsScanning(false)
  }

  const startBarcodeDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    // Simple barcode detection using pixel analysis
    // This is a basic implementation - for production, consider using a proper barcode library
    scanIntervalRef.current = setInterval(() => {
      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState !== 4) return

        const context = canvas.getContext('2d')
        if (!context) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        // Check if BarcodeDetector is available (experimental API)
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector()
          barcodeDetector.detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes.length > 0) {
                const barcode = barcodes[0].rawValue
                stopCamera()
                onDetected(barcode)
              }
            })
            .catch((err: any) => {
              console.warn('Barcode detection failed:', err)
            })
        }
      } catch (err) {
        console.warn('Scanning error:', err)
      }
    }, 500) // Scan every 500ms
  }

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onDetected(manualInput.trim())
      setManualInput("")
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, searchType: 'barcode' | 'similarity') => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append('image', file)

      if (searchType === 'barcode') {
        // Try barcode detection first
        const barcodeResponse = await fetch('/api/scan/barcode', {
          method: 'POST',
          body: formData
        })

        if (barcodeResponse.ok) {
          const barcodeResult = await barcodeResponse.json()
          
          if (barcodeResult.barcode) {
            onDetected(barcodeResult.barcode)
            return
          }
        }
        
        // If no barcode found, fall back to image search
        console.log('No barcode detected, trying image search...')
      }

      // Try image search for similar products
      const imageResponse = await fetch('/api/search/image', {
        method: 'POST',
        body: formData
      })

      if (!imageResponse.ok) {
        throw new Error('Failed to process image')
      }

      const imageResult = await imageResponse.json()
      
      if (imageResult.error) {
        throw new Error(imageResult.error)
      }

      if (imageResult.products && imageResult.products.length > 0) {
        if (onProductsFound) {
          onProductsFound(imageResult.products)
        } else {
          // If no products found callback, show error
          setError(`Found ${imageResult.products.length} similar products. Use the search page for image search results.`)
        }
      } else {
        setError('No barcode or similar products found in the image. Try a clearer image or different angle.')
      }
    } catch (err: any) {
      console.error('Image upload error:', err)
      setError('Failed to process image. Please try again.')
    } finally {
      setIsProcessing(false)
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleClose = () => {
    stopCamera()
    if (onClose) {
      onClose()
    }
  }

  useEffect(() => {
    if (mode === 'camera') {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [mode])

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Scan Barcode</h3>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1 mb-4">
        <Button
          variant={mode === 'camera' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('camera')}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-1" />
          Camera
        </Button>
        <Button
          variant={mode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('upload')}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('manual')}
          className="flex-1"
        >
          <Smartphone className="h-4 w-4 mr-1" />
          Manual
        </Button>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-4 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      {mode === 'camera' && (
        <div className="space-y-4">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 bg-black rounded-lg object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 border-2 border-white rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-red-500 bg-red-500/10 rounded">
                <div className="text-white text-xs text-center mt-2">
                  {isScanning ? 'Scanning...' : 'Starting camera...'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Point your camera at a barcode to scan it automatically
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <div className="space-y-4">
          <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <h4 className="text-lg font-medium mb-2">Upload Product Image</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upload an image to detect barcodes or find similar products
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'barcode')}
              className="hidden"
              disabled={isProcessing}
            />
            
            <div className="space-y-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full max-w-xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Smart Search (Barcode + Similar)
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Automatically detects barcodes first, then searches for similar products
              </p>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>• Supports JPG, PNG, WEBP formats</p>
            <p>• Detects UPC, EAN, QR codes and more</p>
            <p>• Falls back to visual similarity search</p>
            <p>• Works best with clear, well-lit images</p>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="barcode">Barcode Value</Label>
            <Input
              id="barcode"
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter barcode manually..."
              onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
              autoFocus
            />
          </div>
          
          <Button onClick={handleManualSubmit} className="w-full">
            Submit Barcode
          </Button>
        </div>
      )}
    </div>
  )
}

