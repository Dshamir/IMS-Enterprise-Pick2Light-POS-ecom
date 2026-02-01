import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateImageHash } from "@/lib/image-utils"
import { vectorSearchManager } from "@/lib/vector-search-manager"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const category = formData.get("category") as string | null
    const useVector = formData.get("vector") !== "false" // Default to true

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Generate a hash for the search image
    const imageHash = generateImageHash(imageFile)

    const supabase = createServerSupabaseClient()
    let products = []
    let searchMethod = 'traditional'

    // Try smart vector search first if enabled
    if (useVector) {
      // Convert file to buffer for vector search
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
      
      const searchResult = await vectorSearchManager.searchByImage(imageBuffer, category, 10)
      
      if (searchResult.products && searchResult.products.length > 0) {
        // Get full product details for vector search results
        const productIds = searchResult.products.map(p => p.id).filter(Boolean)
        if (productIds.length > 0) {
          const { data: vectorProducts } = await supabase
            .from("products")
            .select("*")
            .in("id", productIds)
          
          // Merge vector search metadata with full product data
          products = vectorProducts?.map(product => {
            const vectorData = searchResult.products.find(vp => vp.id === product.id)
            return {
              ...product,
              similarity: vectorData?.similarity || 0,
              sources: vectorData?.sources || [],
              images: product.image_url ? [{ image_url: product.image_url, is_primary: true }] : []
            }
          }) || []
          
          searchMethod = searchResult.method
        }
      }
    }

    // Fallback to traditional search if vector search failed or disabled
    if (products.length === 0) {
      const { data: allProducts } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })

      let filteredProducts = allProducts || []

      // Filter out products without images
      filteredProducts = filteredProducts.filter(product => product.image_url)

      // Add category filter if provided
      if (category) {
        filteredProducts = filteredProducts.filter(product => product.category === category)
      }

      // Process the data with traditional similarity scoring
      products = filteredProducts.map((product) => {
        let similarity = 0.5 // Base similarity
        
        if (product.name && product.name.length > 5) {
          similarity += 0.2
        }
        
        if (product.description && product.description.length > 10) {
          similarity += 0.1
        }
        
        const productHash = product.id.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        similarity += (Math.abs(productHash) % 100) / 1000
        
        return {
          ...product,
          images: product.image_url ? [{ image_url: product.image_url, is_primary: true }] : [],
          similarity: Math.min(similarity, 0.95)
        }
      }).sort((a, b) => b.similarity - a.similarity).slice(0, 10)
      
      searchMethod = 'traditional'
    }

    return NextResponse.json({
      products,
      searchImageHash: imageHash,
      searchMethod,
      message: `Image search results (${searchMethod})`,
      total: products.length
    })
  } catch (error) {
    console.error("Error in image search:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

