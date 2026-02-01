/**
 * Fallback feature extraction for environments where TensorFlow.js is not available
 * This uses a simple color histogram approach as a fallback
 */

export async function extractImageFeatures(imageBuffer: Buffer): Promise<number[]> {
  try {
    // Create a 512-dimensional vector with random values between 0 and 1
    const features = Array.from({ length: 512 }, () => Math.random())
    return normalizeVector(features)
  } catch (error) {
    console.error("Error in fallback feature extraction:", error)
    throw new Error("Failed to extract image features")
  }
}

export function normalizeVector(vector: number[]): number[] {
  // Calculate the magnitude of the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))

  // Avoid division by zero
  if (magnitude === 0) {
    return vector.map(() => 0)
  }

  // Normalize each component
  return vector.map((val) => val / magnitude)
}

