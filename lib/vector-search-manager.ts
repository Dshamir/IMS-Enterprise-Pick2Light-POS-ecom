// Smart Vector Search Manager - Seamless Hybrid Approach

type ChromaStatus = 'available' | 'unavailable' | 'checking'

class VectorSearchManager {
  private chromaStatus: ChromaStatus = 'checking'
  private lastHealthCheck = 0
  private healthCheckInterval = 30000 // 30 seconds
  private chromaClient: any = null
  private imageCollection: any = null
  private textCollection: any = null

  // Check ChromaDB availability with caching
  private async checkChromaHealth(): Promise<boolean> {
    const now = Date.now()
    
    // Use cached status if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.chromaStatus !== 'checking') {
      return this.chromaStatus === 'available'
    }

    this.chromaStatus = 'checking'
    this.lastHealthCheck = now

    try {
      // Quick connection test
      const response = await fetch('http://localhost:8000/api/v1/heartbeat', {
        method: 'GET',
        timeout: 2000 // 2 second timeout
      })
      
      if (response.ok) {
        this.chromaStatus = 'available'
        return true
      }
    } catch (error) {
      // Silent failure - this is expected when ChromaDB isn't running
    }

    this.chromaStatus = 'unavailable'
    return false
  }

  // Initialize ChromaDB client only when available
  private async initializeChromaClient() {
    if (this.chromaClient) return this.chromaClient

    try {
      const chromaModule = await import('chromadb')
      const ChromaClient = chromaModule.ChromaApi || chromaModule.default || chromaModule.ChromaClient
      
      if (!ChromaClient) {
        throw new Error('ChromaDB client not found')
      }
      
      this.chromaClient = new ChromaClient({
        path: "http://localhost:8000"
      })

      // Initialize collections
      await this.initializeCollections()
      
      return this.chromaClient
    } catch (error) {
      this.chromaStatus = 'unavailable'
      throw error
    }
  }

  // Initialize collections
  private async initializeCollections() {
    if (!this.chromaClient) return

    try {
      // Image vectors collection
      this.imageCollection = await this.chromaClient.getOrCreateCollection({
        name: "product_images",
        metadata: { description: "Product image feature vectors" }
      })
      
      // Text embeddings collection
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
          // Use default embedding if OpenAI not available
        }
      }
      
      this.textCollection = await this.chromaClient.getOrCreateCollection({
        name: "product_text",
        embeddingFunction,
        metadata: { description: "Product text embeddings" }
      })
    } catch (error) {
      this.chromaStatus = 'unavailable'
      throw error
    }
  }

  // Public method: Smart image search
  async searchByImage(imageBuffer: Buffer, category?: string, limit: number = 10) {
    const isChromaAvailable = await this.checkChromaHealth()
    
    if (isChromaAvailable) {
      try {
        await this.initializeChromaClient()
        
        if (this.imageCollection) {
          // Use vector search
          const { extractImageFeatures, normalizeVector } = await this.getFeatureExtraction()
          const searchFeatures = await extractImageFeatures(imageBuffer)
          const normalizedSearchFeatures = normalizeVector(searchFeatures)
          
          const results = await this.imageCollection.query({
            queryEmbeddings: [normalizedSearchFeatures],
            nResults: limit
          })
          
          return {
            products: results.metadatas[0]?.map((metadata, index) => ({
              id: metadata?.id,
              name: metadata?.name,
              category: metadata?.category,
              image_url: metadata?.image_url,
              similarity: 1 - (results.distances?.[0]?.[index] || 0),
              source: 'vector_image'
            })) || [],
            method: 'vector'
          }
        }
      } catch (error) {
        // Silent fallback to traditional search
        this.chromaStatus = 'unavailable'
      }
    }

    // Fallback to traditional image search (SQLite)
    return this.traditionalImageSearch(category, limit)
  }

  // Public method: Smart text search
  async searchByText(query: string, category?: string, limit: number = 10) {
    const isChromaAvailable = await this.checkChromaHealth()
    
    if (isChromaAvailable) {
      try {
        await this.initializeChromaClient()
        
        if (this.textCollection) {
          // Use vector search
          const results = await this.textCollection.query({
            queryTexts: [query],
            nResults: limit
          })
          
          return {
            products: results.metadatas[0]?.map((metadata, index) => ({
              id: metadata?.id,
              name: metadata?.name,
              category: metadata?.category,
              similarity: 1 - (results.distances?.[0]?.[index] || 0),
              source: 'vector_text'
            })) || [],
            method: 'vector'
          }
        }
      } catch (error) {
        // Silent fallback to traditional search
        this.chromaStatus = 'unavailable'
      }
    }

    // Fallback to traditional text search (SQLite)
    return this.traditionalTextSearch(query, category, limit)
  }

  // Public method: Add product to index (only if ChromaDB available)
  async addProduct(product: {
    id: string
    name: string
    description?: string
    category: string
    image_url?: string
  }) {
    const isChromaAvailable = await this.checkChromaHealth()
    
    if (!isChromaAvailable) {
      return { success: true, method: 'skipped' }
    }

    try {
      await this.initializeChromaClient()
      
      // Add text embedding
      if (this.textCollection) {
        const textContent = [
          product.name,
          product.description || '',
          product.category
        ].filter(Boolean).join(' ')
        
        await this.textCollection.add({
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
      if (product.image_url && this.imageCollection) {
        try {
          const response = await fetch(product.image_url)
          if (response.ok) {
            const imageBuffer = await response.arrayBuffer()
            const { extractImageFeatures, normalizeVector } = await this.getFeatureExtraction()
            const features = await extractImageFeatures(Buffer.from(imageBuffer))
            const normalizedFeatures = normalizeVector(features)
            
            await this.imageCollection.add({
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
          // Continue without image vector if processing fails
        }
      }
      
      return { success: true, method: 'vector' }
    } catch (error) {
      this.chromaStatus = 'unavailable'
      return { success: true, method: 'skipped' }
    }
  }

  // Public method: Remove product from index
  async removeProduct(productId: string) {
    const isChromaAvailable = await this.checkChromaHealth()
    
    if (!isChromaAvailable) {
      return { success: true, method: 'skipped' }
    }

    try {
      await this.initializeChromaClient()
      
      // Remove from both collections
      if (this.textCollection) {
        try {
          await this.textCollection.delete({ ids: [productId] })
        } catch (error) {
          // Product might not exist in collection
        }
      }
      
      if (this.imageCollection) {
        try {
          await this.imageCollection.delete({ ids: [productId] })
        } catch (error) {
          // Product might not exist in collection
        }
      }
      
      return { success: true, method: 'vector' }
    } catch (error) {
      this.chromaStatus = 'unavailable'
      return { success: true, method: 'skipped' }
    }
  }

  // Public method: Get system status
  getStatus() {
    return {
      chromadb: this.chromaStatus,
      lastCheck: new Date(this.lastHealthCheck).toISOString(),
      collections: {
        images: !!this.imageCollection,
        text: !!this.textCollection
      }
    }
  }

  // Private helper methods
  private async getFeatureExtraction() {
    try {
      if (typeof window === 'undefined') {
        const featureModule = await import('./feature-extraction')
        return featureModule
      } else {
        const fallbackModule = await import('./feature-extraction-fallback')
        return fallbackModule
      }
    } catch (error) {
      const fallbackModule = await import('./feature-extraction-fallback')
      return fallbackModule
    }
  }

  private traditionalImageSearch(category?: string, limit: number = 10) {
    // Return placeholder for traditional image search
    return {
      products: [],
      method: 'traditional'
    }
  }

  private traditionalTextSearch(query: string, category?: string, limit: number = 10) {
    // Return placeholder for traditional text search
    return {
      products: [],
      method: 'traditional'
    }
  }
}

// Export singleton instance
export const vectorSearchManager = new VectorSearchManager()

// Export convenience functions that match the old API
export async function searchProductsByImage(imageBuffer: Buffer, limit: number = 10) {
  return vectorSearchManager.searchByImage(imageBuffer, undefined, limit)
}

export async function searchProductsByText(query: string, limit: number = 10) {
  return vectorSearchManager.searchByText(query, undefined, limit)
}

export async function addProductToVectorSearch(product: {
  id: string
  name: string
  description?: string
  category: string
  image_url?: string
}) {
  return vectorSearchManager.addProduct(product)
}

export async function updateProductInVectorSearch(product: {
  id: string
  name: string
  description?: string
  category: string
  image_url?: string
}) {
  await vectorSearchManager.removeProduct(product.id)
  return vectorSearchManager.addProduct(product)
}

export async function removeProductFromVectorSearch(productId: string) {
  return vectorSearchManager.removeProduct(productId)
}

export async function checkVectorSearchHealth() {
  const status = vectorSearchManager.getStatus()
  return {
    status: status.chromadb === 'available' ? 'healthy' : 'unhealthy',
    message: status.chromadb === 'available' ? 'ChromaDB is running' : 'ChromaDB not available',
    details: status
  }
}

export async function hybridProductSearch(
  query?: string,
  imageBuffer?: Buffer,
  category?: string,
  limit: number = 10
) {
  const results = []
  
  // Vector search results
  if (query) {
    const textResults = await vectorSearchManager.searchByText(query, category, Math.ceil(limit * 1.5))
    results.push(...textResults.products)
  }
  
  if (imageBuffer) {
    const imageResults = await vectorSearchManager.searchByImage(imageBuffer, category, Math.ceil(limit * 1.5))
    results.push(...imageResults.products)
  }
  
  // Deduplicate and combine results by ID
  const combinedResults = new Map()
  
  results.forEach(product => {
    if (product.id) {
      const existing = combinedResults.get(product.id)
      if (existing) {
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
}