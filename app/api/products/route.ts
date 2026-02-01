import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { addProductToVectorSearch, hybridProductSearch, vectorSearchManager } from "@/lib/vector-search-manager"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { getDatabase } from "@/lib/database/sqlite"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const search = searchParams.get("search") 
    const barcode = searchParams.get("barcode")
    const category = searchParams.get("category")
    const manufactured = searchParams.get("manufactured") // Filter for manufactured products
    const useVector = searchParams.get("vector") !== "false" // Default to true

    const supabase = createServerSupabaseClient()
    
    let products = []
    let vectorResults = []

    // Handle barcode-specific lookup first (highest priority)
    if (barcode && barcode.trim() !== "") {
      const product = sqliteHelpers.getProductByBarcode(barcode.trim())
      if (product) {
        products = [{ ...product, isVectorResult: false }]
      }
      // For barcode lookups, return immediately (don't fall through to other search methods)
      const processedData = await Promise.all(products.map(async (product) => {
        // Fetch assigned images from product_images table
        const db = getDatabase()
        const assignedImages = db.prepare(`
          SELECT pi.id as image_id, pi.image_url, pi.is_primary, pi.display_order, pi.created_at as assigned_at, 
                 proc.objects, proc.extracted_text, proc.description, proc.confidence
          FROM product_images pi
          LEFT JOIN processed_images proc ON pi.image_url = proc.image_url
          WHERE pi.product_id = ?
          ORDER BY pi.display_order ASC
        `).all(product.id)

        // Get unit information for the product
        const unit = product.unit_id ? sqliteHelpers.getUnitById(product.unit_id) : null

        return {
          ...product,
          unit,
          images: assignedImages.length > 0 ? assignedImages : 
                 (product.image_url ? [{ image_url: product.image_url, is_primary: true }] : [])
        }
      }))

      return NextResponse.json(processedData)
    }

    // Combine query and search parameters for consistency
    const searchQuery = query || search

    // Try smart vector search first if query exists
    if (searchQuery && searchQuery.trim() !== "" && useVector) {
      const searchResult = await vectorSearchManager.searchByText(searchQuery, category, 20)
      
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
              isVectorResult: searchResult.method === 'vector'
            }
          }) || []
        }
      }
    }

    // If no vector results or vector search disabled, use traditional SQLite search
    if (products.length === 0) {
      // Use SQLite instead of Supabase
      const allProducts = sqliteHelpers.getAllProducts()

      let filteredProducts = allProducts || []

      // Apply category filter if provided
      if (category) {
        filteredProducts = filteredProducts.filter(product => product.category === category)
      }

      // Apply manufactured filter if provided
      if (manufactured === 'true') {
        filteredProducts = filteredProducts.filter(product => product.is_manufactured === 1)
      } else if (manufactured === 'false') {
        filteredProducts = filteredProducts.filter(product => product.is_manufactured === 0)
      }

      // Apply enhanced text search if query parameter exists
      if (searchQuery && searchQuery.trim() !== "") {
        const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 0)
        
        filteredProducts = filteredProducts.filter(product => {
          const searchableText = [
            product.name,
            product.description,
            product.category,
            product.barcode
          ].filter(Boolean).join(' ').toLowerCase()
          
          const matches = searchTerms.filter(term => searchableText.includes(term))
          return matches.length > 0
        })
        
        // Sort by relevance
        filteredProducts.sort((a, b) => {
          const aName = a.name.toLowerCase()
          const bName = b.name.toLowerCase()
          const queryLower = searchQuery.toLowerCase()
          
          if (aName === queryLower && bName !== queryLower) return -1
          if (bName === queryLower && aName !== queryLower) return 1
          if (aName.startsWith(queryLower) && !bName.startsWith(queryLower)) return -1
          if (bName.startsWith(queryLower) && !aName.startsWith(queryLower)) return 1
          
          const aMatches = searchTerms.filter(term => 
            [a.name, a.description, a.category].filter(Boolean).join(' ').toLowerCase().includes(term)
          ).length
          const bMatches = searchTerms.filter(term => 
            [b.name, b.description, b.category].filter(Boolean).join(' ').toLowerCase().includes(term)
          ).length
          
          return bMatches - aMatches
        })
      }

      products = filteredProducts.map(product => ({
        ...product,
        isVectorResult: false
      }))
    }

    // Get product images for each product
    const processedData = await Promise.all(products.map(async (product) => {
      // Fetch assigned images from product_images table
      const db = getDatabase()
      const assignedImages = db.prepare(`
        SELECT pi.id as image_id, pi.image_url, pi.is_primary, pi.display_order, pi.created_at as assigned_at, 
               proc.objects, proc.extracted_text, proc.description, proc.confidence
        FROM product_images pi
        LEFT JOIN processed_images proc ON pi.image_url = proc.image_url
        WHERE pi.product_id = ?
        ORDER BY pi.display_order ASC
      `).all(product.id)

      // Unit information is now included in the getAllProducts query
      const unit = product.unit_id ? {
        id: product.unit_id,
        name: product.unit_name,
        display_name: product.unit_display_name,
        symbol: product.unit_symbol
      } : null

      return {
        ...product,
        unit,
        unit_name: product.unit_display_name,
        unit_symbol: product.unit_symbol,
        images: assignedImages.length > 0 ? assignedImages : 
               (product.image_url ? [{ image_url: product.image_url, is_primary: true }] : [])
      }
    }))

    return NextResponse.json({ 
      products: processedData,
      searchMethod: products.length > 0 && products[0].isVectorResult ? 'vector' : 'traditional',
      total: processedData.length
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const productData = await request.json()

    // Extract images array if present
    const { images, ...product } = productData

    // Insert the product using SQLite
    const result = sqliteHelpers.createProduct(product)

    if (!result || !result.lastInsertRowid) {
      console.error("Database error: Failed to create product")
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }

    // Get the created product
    const createdProduct = sqliteHelpers.getProductById(result.lastInsertRowid.toString())

    if (!createdProduct) {
      console.error("Database error: Failed to retrieve created product")
      return NextResponse.json({ error: "Failed to retrieve created product" }, { status: 500 })
    }

    // Add to vector search index
    try {
      await addProductToVectorSearch({
        id: createdProduct.id,
        name: createdProduct.name,
        description: createdProduct.description,
        category: createdProduct.category,
        image_url: createdProduct.image_url
      })
    } catch (vectorError) {
      console.warn("Failed to add product to vector search:", vectorError)
      // Don't fail the whole request if vector indexing fails
    }

    return NextResponse.json(createdProduct, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

