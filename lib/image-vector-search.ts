import { ChromaApi, OpenAIEmbeddingFunction } from 'chromadb'

let client: ChromaApi | null = null
let embeddingFunction: OpenAIEmbeddingFunction | null = null
let collection: any = null

const COLLECTION_NAME = 'image_embeddings'

export async function initializeImageVectorSearch() {
  try {
    // Initialize ChromaDB client with correct import
    const chromadb = await import('chromadb')
    client = new chromadb.ChromaApi({
      host: 'localhost',
      port: 8000,
      path: '/api/v1'
    })

    // Initialize OpenAI embedding function
    embeddingFunction = new chromadb.OpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY || ''
    })

    // Get or create collection for image embeddings
    try {
      collection = await client.getCollection({
        name: COLLECTION_NAME,
        embeddingFunction
      })
      console.log('✅ Connected to existing image embeddings collection')
    } catch (error) {
      // Collection doesn't exist, create it
      collection = await client.createCollection({
        name: COLLECTION_NAME,
        embeddingFunction,
        metadata: {
          description: 'Vector embeddings for product images',
          created_at: new Date().toISOString()
        }
      })
      console.log('✅ Created new image embeddings collection')
    }

    return { client, collection }
  } catch (error) {
    console.error('❌ Failed to initialize image vector search:', error)
    return { client: null, collection: null }
  }
}

export async function addImageEmbedding(imageId: string, metadata: {
  filename: string
  extractedText: string
  description: string
  objects: string[]
  confidence: number
  imageUrl: string
}) {
  try {
    if (!collection) {
      const result = await initializeImageVectorSearch()
      if (!result.collection) {
        throw new Error('Failed to initialize ChromaDB collection')
      }
    }

    // Create a comprehensive text representation for embedding
    const textForEmbedding = [
      metadata.extractedText,
      metadata.description,
      ...metadata.objects,
      metadata.filename
    ].filter(Boolean).join(' ')

    // Add to ChromaDB collection
    await collection.add({
      ids: [imageId],
      documents: [textForEmbedding],
      metadatas: [{
        filename: metadata.filename,
        extractedText: metadata.extractedText,
        description: metadata.description,
        objects: JSON.stringify(metadata.objects),
        confidence: metadata.confidence,
        imageUrl: metadata.imageUrl,
        addedAt: new Date().toISOString()
      }]
    })

    console.log('✅ Added image embedding for:', imageId)
    return true
  } catch (error) {
    console.error('❌ Failed to add image embedding:', error)
    return false
  }
}

export async function searchSimilarImages(query: string, limit: number = 10) {
  try {
    if (!collection) {
      const result = await initializeImageVectorSearch()
      if (!result.collection) {
        throw new Error('Failed to initialize ChromaDB collection')
      }
    }

    const results = await collection.query({
      queryTexts: [query],
      nResults: limit
    })

    return {
      success: true,
      images: results.ids[0]?.map((id: string, index: number) => ({
        id,
        distance: results.distances?.[0]?.[index] || 0,
        metadata: results.metadatas?.[0]?.[index] || {},
        document: results.documents?.[0]?.[index] || ''
      })) || []
    }
  } catch (error) {
    console.error('❌ Failed to search similar images:', error)
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function findSimilarImagesByImage(imageId: string, limit: number = 5) {
  try {
    if (!collection) {
      const result = await initializeImageVectorSearch()
      if (!result.collection) {
        throw new Error('Failed to initialize ChromaDB collection')
      }
    }

    // Get the document for the given image ID
    const imageData = await collection.get({
      ids: [imageId]
    })

    if (!imageData.documents || imageData.documents.length === 0) {
      return {
        success: false,
        images: [],
        error: 'Image not found in vector database'
      }
    }

    // Search for similar images using the document text
    const results = await collection.query({
      queryTexts: [imageData.documents[0]],
      nResults: limit + 1, // +1 because it will include the original image
      where: { $ne: { id: imageId } } // Exclude the original image
    })

    return {
      success: true,
      images: results.ids[0]?.map((id: string, index: number) => ({
        id,
        distance: results.distances?.[0]?.[index] || 0,
        metadata: results.metadatas?.[0]?.[index] || {},
        document: results.documents?.[0]?.[index] || ''
      })) || []
    }
  } catch (error) {
    console.error('❌ Failed to find similar images:', error)
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function removeImageEmbedding(imageId: string) {
  try {
    if (!collection) {
      const result = await initializeImageVectorSearch()
      if (!result.collection) {
        throw new Error('Failed to initialize ChromaDB collection')
      }
    }

    await collection.delete({
      ids: [imageId]
    })

    console.log('✅ Removed image embedding for:', imageId)
    return true
  } catch (error) {
    console.error('❌ Failed to remove image embedding:', error)
    return false
  }
}

export async function getCollectionStats() {
  try {
    if (!collection) {
      const result = await initializeImageVectorSearch()
      if (!result.collection) {
        throw new Error('Failed to initialize ChromaDB collection')
      }
    }

    const count = await collection.count()
    
    return {
      success: true,
      totalImages: count,
      collectionName: COLLECTION_NAME
    }
  } catch (error) {
    console.error('❌ Failed to get collection stats:', error)
    return {
      success: false,
      totalImages: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}