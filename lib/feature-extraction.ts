import * as tf from "@tensorflow/tfjs-node"

// Cache the model to avoid reloading it for each request
let mobilenetModel: tf.LayersModel | null = null
let featureExtractor: tf.LayersModel | null = null

/**
 * Loads the MobileNet model and creates a feature extractor
 */
async function loadModel() {
  if (mobilenetModel && featureExtractor) {
    return { mobilenetModel, featureExtractor }
  }

  // Load pre-trained MobileNet model
  mobilenetModel = await tf.loadLayersModel(
    "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json",
  )

  // Create a feature extractor by removing the classification layer
  // We'll use the global average pooling layer which outputs a 512-dimensional vector
  featureExtractor = tf.model({
    inputs: mobilenetModel.inputs,
    outputs: mobilenetModel.getLayer("global_average_pooling2d_1").output,
  })

  return { mobilenetModel, featureExtractor }
}

/**
 * Extracts feature vector from an image buffer
 */
export async function extractImageFeatures(imageBuffer: Buffer): Promise<number[]> {
  try {
    // Load the model
    const { featureExtractor } = await loadModel()

    // Decode and preprocess the image
    const imageTensor = tf.node.decodeImage(imageBuffer, 3)

    // Resize, normalize, and expand dimensions to match model input
    const processedImage = tf.image
      .resizeBilinear(imageTensor as tf.Tensor3D, [224, 224])
      .div(255)
      .expandDims()

    // Extract features
    const features = featureExtractor.predict(processedImage) as tf.Tensor

    // Convert to regular array
    const featureArray = await features.data()

    // Clean up tensors to prevent memory leaks
    tf.dispose([imageTensor, processedImage, features])

    return Array.from(featureArray)
  } catch (error) {
    console.error("Error extracting image features:", error)
    throw new Error("Failed to extract image features")
  }
}

/**
 * Normalizes a feature vector to have unit length (for cosine similarity)
 */
export function normalizeVector(vector: number[]): number[] {
  // Calculate the magnitude of the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))

  // Normalize each component
  return vector.map((val) => val / magnitude)
}

