// Import types dynamically to handle different ChromaDB versions
type ChromaApi = any
type Collection = any
type OpenAIEmbeddingFunction = any

// Dynamic import for feature extraction to handle server-side only
async function getFeatureExtraction() {
  try {
    // Only import on server-side
    if (typeof window === 'undefined') {
      const featureModule = await import('./feature-extraction')
      return featureModule
    } else {
      // Use fallback for client-side
      const fallbackModule = await import('./feature-extraction-fallback')
      return fallbackModule
    }
  } catch (error) {
    console.warn('Feature extraction not available, using fallback:', error.message)
    const fallbackModule = await import('./feature-extraction-fallback')
    return fallbackModule
  }
}

// ChromaDB client
let chromaClient: ChromaApi | null = null
let imageCollection: Collection | null = null
let textCollection: Collection | null = null

// Initialize ChromaDB client
async function getChromaClient() {
  if (!chromaClient) {
    try {
      const chromaModule = await import('chromadb')
      // Try different import patterns for different ChromaDB versions
      const ChromaClient = chromaModule.ChromaApi || chromaModule.default || chromaModule.ChromaClient
      
      if (!ChromaClient) {
        throw new Error('ChromaDB client not found in module')
      }
      
      chromaClient = new ChromaClient({
        path: "http://localhost:8000", // Default ChromaDB local server
      })
    } catch (error) {
      console.warn('ChromaDB client initialization failed:', error.message)
      throw new Error('ChromaDB not available')
    }
  }
  return chromaClient
}

// Initialize collections
async function initializeCollections() {
  const client = await getChromaClient()
  
  try {
    // Image vectors collection
    imageCollection = await client.getOrCreateCollection({
      name: "product_images",
      metadata: { description: "Product image feature vectors" }
    })
    
    // Text embeddings collection - use simple embedding if no OpenAI key
    let embeddingFunction = undefined
    
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "fake-key") {
      try {
        const chromaModule = await import('chromadb')
        const OpenAIEmbeddingFunction = chromaModule.OpenAIEmbeddingFunction
        
        if (OpenAIEmbeddingFunction) {
          embeddingFunction = new OpenAIEmbeddingFunction({
            openai_api_key: process.env.OPENAI_API_KEY,
            openai_model: "text-embedding-ada-002"
          })
        }
      } catch (error) {
        console.warn('OpenAI embedding function not available:', error.message)
      }
    }
    
    textCollection = await client.getOrCreateCollection({
      name: "product_text",
      embeddingFunction,
      metadata: { description: "Product text embeddings" }
    })
    
    return { imageCollection, textCollection }
  } catch (error) {
    console.error("Error initializing ChromaDB collections:", error)
    throw error
  }
}

// Add product to vector search indexes
export async function addProductToVectorSearch(product: {
  id: string
  name: string
  description?: string
  category: string
  image_url?: string
}) {
  // Skip vector search if disabled
  if (process.env.DISABLE_VECTOR_SEARCH === 'true') {
    return { success: true, skipped: true }
  }
  
  try {
    await initializeCollections()
    
    // Add text embedding
    if (textCollection) {
      const textContent = [
        product.name,
        product.description || '',
        product.category
      ].filter(Boolean).join(' ')
      
      await textCollection.add({
        ids: [product.id],
        documents: [textContent],
        metadatas: [{
          name: product.name,
          category: product.category,
          id: product.id
        }]
      })
    }
    
    // Add image vector if image exists
    if (product.image_url && imageCollection) {
      try {
        // Fetch image and extract features
        const response = await fetch(product.image_url)
        if (response.ok) {
          const imageBuffer = await response.arrayBuffer()
          const { extractImageFeatures, normalizeVector } = await getFeatureExtraction()
          const features = await extractImageFeatures(Buffer.from(imageBuffer))
          const normalizedFeatures = normalizeVector(features)
          
          await imageCollection.add({
            ids: [product.id],
            embeddings: [normalizedFeatures],
            metadatas: [{
              name: product.name,
              category: product.category,
              image_url: product.image_url,
              id: product.id
            }]
          })
        }
      } catch (imageError) {
        console.error("Error processing image for product", product.id, imageError)
        // Continue without image vector if image processing fails
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error adding product to vector search:", error)
    return { error: error.message }
  }
}

// Search products by text
export async function searchProductsByText(query: string, limit: number = 10) {
  try {
    await initializeCollections()
    
    if (!textCollection) {
      throw new Error("Text collection not initialized")
    }
    
    const results = await textCollection.query({
      queryTexts: [query],
      nResults: limit
    })
    
    return {
      products: results.metadatas[0]?.map((metadata, index) => ({
        id: metadata?.id,
        name: metadata?.name,
        category: metadata?.category,
        similarity: 1 - (results.distances?.[0]?.[index] || 0), // Convert distance to similarity
        source: 'vector_text'
      })) || []
    }
  } catch (error) {
    console.error("Error in text vector search:", error)
    return { products: [], error: error.message }
  }
}

// Search products by image
export async function searchProductsByImage(imageBuffer: Buffer, limit: number = 10) {
  try {
    await initializeCollections()
    
    if (!imageCollection) {
      throw new Error("Image collection not initialized")
    }
    
    // Extract features from search image
    const { extractImageFeatures, normalizeVector } = await getFeatureExtraction()
    const searchFeatures = await extractImageFeatures(imageBuffer)
    const normalizedSearchFeatures = normalizeVector(searchFeatures)
    
    const results = await imageCollection.query({
      queryEmbeddings: [normalizedSearchFeatures],
      nResults: limit
    })
    
    return {
      products: results.metadatas[0]?.map((metadata, index) => ({
        id: metadata?.id,
        name: metadata?.name,
        category: metadata?.category,
        image_url: metadata?.image_url,
        similarity: 1 - (results.distances?.[0]?.[index] || 0), // Convert distance to similarity
        source: 'vector_image'
      })) || []
    }
  } catch (error) {
    console.error("Error in image vector search:", error)
    return { products: [], error: error.message }
  }
}

// Update product in vector search
export async function updateProductInVectorSearch(product: {
  id: string
  name: string
  description?: string
  category: string
  image_url?: string
}) {
  // Skip vector search if disabled
  if (process.env.DISABLE_VECTOR_SEARCH === 'true') {
    return { success: true, skipped: true }
  }
  
  try {
    // Remove existing entries
    await removeProductFromVectorSearch(product.id)
    
    // Add updated entries
    return await addProductToVectorSearch(product)
  } catch (error) {
    console.error("Error updating product in vector search:", error)
    return { error: error.message }
  }
}

// Remove product from vector search
export async function removeProductFromVectorSearch(productId: string) {
  // Skip vector search if disabled
  if (process.env.DISABLE_VECTOR_SEARCH === 'true') {
    return { success: true, skipped: true }
  }
  
  try {
    await initializeCollections()
    
    // Remove from text collection
    if (textCollection) {
      try {
        await textCollection.delete({
          ids: [productId]
        })
      } catch (error) {
        console.log("Product not found in text collection:", productId)
      }
    }
    
    // Remove from image collection
    if (imageCollection) {
      try {
        await imageCollection.delete({
          ids: [productId]
        })
      } catch (error) {
        console.log("Product not found in image collection:", productId)
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error removing product from vector search:", error)
    return { error: error.message }
  }
}

// Hybrid search combining SQLite and vector results
export async function hybridProductSearch(
  query?: string,
  imageBuffer?: Buffer,
  category?: string,
  limit: number = 10
) {
  try {
    const results = []
    
    // Vector search results
    if (query) {
      const textResults = await searchProductsByText(query, Math.ceil(limit * 1.5))
      results.push(...textResults.products)
    }
    
    if (imageBuffer) {
      const imageResults = await searchProductsByImage(imageBuffer, Math.ceil(limit * 1.5))
      results.push(...imageResults.products)
    }
    
    // Deduplicate and combine results by ID
    const combinedResults = new Map()
    
    results.forEach(product => {
      if (product.id) {
        const existing = combinedResults.get(product.id)
        if (existing) {
          // Boost similarity if product appears in multiple searches
          existing.similarity = Math.max(existing.similarity, product.similarity) + 0.1
          existing.sources = [...(existing.sources || [existing.source]), product.source]
        } else {
          combinedResults.set(product.id, {
            ...product,
            sources: [product.source]
          })
        }
      }
    })
    
    // Convert back to array and sort by similarity
    const finalResults = Array.from(combinedResults.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
    
    return {
      products: finalResults,
      total: finalResults.length
    }
  } catch (error) {
    console.error("Error in hybrid search:", error)
    return { products: [], error: error.message }
  }
}

// Health check for ChromaDB
export async function checkVectorSearchHealth() {
  try {
    const client = await getChromaClient()
    await client.heartbeat()
    return { status: 'healthy', message: 'ChromaDB is running' }
  } catch (error) {
    return { status: 'unhealthy', message: error.message }
  }
}