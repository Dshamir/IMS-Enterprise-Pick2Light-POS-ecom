// This is a simplified image comparison utility
// In a production environment, you would use more sophisticated techniques

export async function getImageDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")

      if (!context) {
        reject(new Error("Could not get canvas context"))
        return
      }

      const width = img.width
      const height = img.height

      canvas.width = width
      canvas.height = height

      context.drawImage(img, 0, 0, width, height)

      try {
        const imageData = context.getImageData(0, 0, width, height)
        const data = imageData.data

        let r = 0,
          g = 0,
          b = 0

        // Sample pixels (for performance, don't check every pixel)
        const pixelCount = data.length / 4
        const sampleSize = Math.max(1, Math.floor(pixelCount / 1000))

        let sampleCount = 0
        for (let i = 0; i < data.length; i += 4 * sampleSize) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          sampleCount++
        }

        // Average the colors
        r = Math.floor(r / sampleCount)
        g = Math.floor(g / sampleCount)
        b = Math.floor(b / sampleCount)

        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
        resolve(hex)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = (error) => {
      reject(error)
    }

    img.src = imageUrl
  })
}

export function getColorDistance(color1: string, color2: string): number {
  // Convert hex to RGB
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return Number.POSITIVE_INFINITY

  // Calculate Euclidean distance between colors
  const rDiff = rgb1.r - rgb2.r
  const gDiff = rgb1.g - rgb2.g
  const bDiff = rgb1.b - rgb2.b

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}

// Generate a simple hash for an image URL or blob
export function generateImageHash(imageData: string | Blob): string {
  if (typeof imageData === "string") {
    // For URLs, use a simple hash of the URL
    return hashString(imageData)
  } else {
    // For Blobs, use the size and last modified date if available
    const blob = imageData as Blob
    return `blob-${blob.size}-${Date.now()}`
  }
}

// Simple string hashing function
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36) // Convert to base36 for shorter strings
}

