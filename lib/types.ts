// Add or update this file to include the ProductImage type
export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  is_primary: boolean
  display_order: number
  created_at: string
}

