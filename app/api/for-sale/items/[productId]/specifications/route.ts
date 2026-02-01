import { NextResponse } from "next/server"
import {
  getForSaleByProductId,
  getSpecifications,
  saveSpecifications,
} from "@/lib/services/forsale-service"

interface Props {
  params: Promise<{ productId: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { productId } = await params

    // Get the for-sale record first
    const forSaleItem = getForSaleByProductId(productId)

    if (!forSaleItem) {
      return NextResponse.json({ specifications: [] })
    }

    const specifications = getSpecifications(forSaleItem.id)

    return NextResponse.json({ specifications })
  } catch (error) {
    console.error("Error fetching specifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch specifications" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: Props) {
  try {
    const { productId } = await params
    const body = await request.json()

    const { specifications } = body

    if (!Array.isArray(specifications)) {
      return NextResponse.json(
        { error: "specifications must be an array" },
        { status: 400 }
      )
    }

    // Get the for-sale record
    const forSaleItem = getForSaleByProductId(productId)

    if (!forSaleItem) {
      return NextResponse.json(
        { error: "Product is not marked for sale" },
        { status: 404 }
      )
    }

    // Save specifications
    const savedSpecs = saveSpecifications(
      forSaleItem.id,
      specifications.map((spec: any, index: number) => ({
        spec_key: spec.spec_key,
        spec_value: spec.spec_value,
        confidence: spec.confidence ?? 1.0,
        sort_order: spec.sort_order ?? index,
      }))
    )

    return NextResponse.json({ specifications: savedSpecs, success: true })
  } catch (error) {
    console.error("Error saving specifications:", error)
    return NextResponse.json(
      { error: "Failed to save specifications" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: Props) {
  // POST redirects to PUT for convenience
  return PUT(request, { params })
}
