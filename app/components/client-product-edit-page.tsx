"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createProduct, updateProduct } from "@/app/actions/products"
import { ProductImageUpload } from "./product-image-upload"
import { ProductImageGallery } from "./product-image-gallery"
import { ensureStorageBucket } from "../actions/product-images"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, {
    message: "Price must be at least 0.01.",
  }),
  stock_quantity: z.coerce.number().min(0, {
    message: "Stock quantity must be at least 0.",
  }),
  category: z.string().min(1, {
    message: "Please select a category.",
  }),
  image_url: z.string().optional(),
  barcode: z.string().optional(),
})

interface ProductEditPageProps {
  product?: {
    id: string
    name: string
    description: string | null
    price: number
    stock_quantity: number
    category: string
    image_url: string | null
    barcode: string | null
  } | null
  categories: string[]
}

export function ClientProductEditPage({ product, categories }: ProductEditPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [refreshImages, setRefreshImages] = useState(0)

  // Initialize storage bucket when component mounts
  useEffect(() => {
    if (product?.id) {
      ensureStorageBucket().catch(console.error)
    }
  }, [product?.id])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      stock_quantity: product?.stock_quantity || 0,
      category: product?.category || "",
      image_url: product?.image_url || "",
      barcode: product?.barcode || "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      if (product?.id) {
        // Update existing product
        const result = await updateProduct(product.id, values)
        if (result.error) {
          throw new Error(result.error)
        }
        toast.success("Product updated successfully")
        router.push(`/products/${product.id}`)
      } else {
        // Create new product
        const result = await createProduct(values)
        if (result.error) {
          throw new Error(result.error)
        }
        toast.success("Product created successfully")
        router.push(`/products/${result.id}`)
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUploadSuccess = () => {
    setRefreshImages((prev) => prev + 1)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">Product Details</TabsTrigger>
          {product?.id && <TabsTrigger value="images">Images</TabsTrigger>}
        </TabsList>

        <TabsContent value="details">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Product description" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product barcode" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>Enter the product barcode for scanning functionality</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for the product image or use the Images tab to upload images
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : product ? "Update Product" : "Create Product"}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="images">
          {product?.id ? (
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>
                  Upload and manage images for this product. The primary image will be displayed in product listings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ProductImageUpload productId={product.id} onSuccess={handleImageUploadSuccess} />

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Image Gallery</h3>
                  <ProductImageGallery productId={product.id} key={`gallery-${refreshImages}`} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Save the product first to manage images</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

