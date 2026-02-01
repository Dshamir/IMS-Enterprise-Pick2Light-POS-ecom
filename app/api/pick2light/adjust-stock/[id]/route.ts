import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'
import { getDatabase } from '@/lib/database/sqlite'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { delta } = body

    if (!delta || (delta !== 1 && delta !== -1)) {
      return NextResponse.json(
        { error: 'delta must be 1 or -1' },
        { status: 400 }
      )
    }

    // Get current product
    const product = sqliteHelpers.getProductById(id)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const previousQuantity = product.stock_quantity
    const newQuantity = Math.max(0, previousQuantity + delta)

    // Update product stock
    sqliteHelpers.updateProduct(id, {
      stock_quantity: newQuantity
    })

    // Create inventory transaction
    sqliteHelpers.createInventoryTransaction({
      product_id: id,
      transaction_type: delta > 0 ? 'addition' : 'reduction',
      quantity: Math.abs(delta),
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reason: 'Pick2Light stock adjustment',
      notes: `Stock adjusted via Pick2Light interface`
    })

    // Update physical LED colors based on new stock level
    try {
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      const host = request.headers.get('host') || 'localhost:3000'
      const baseUrl = `${protocol}://${host}`

      await fetch(`${baseUrl}/api/pick2light/update-stock-leds/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
    } catch (ledError) {
      // Don't fail the entire request if LED update fails
      console.warn('Failed to update physical LEDs:', ledError)
    }

    // Get updated product
    const updatedProduct = sqliteHelpers.getProductById(id)

    return NextResponse.json({
      success: true,
      product: updatedProduct
    })
  } catch (error: any) {
    console.error('Error adjusting stock:', error)
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}
