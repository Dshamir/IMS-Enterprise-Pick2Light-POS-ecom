import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ClientProductPage from "@/components/client-product-page"

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

// Update the ProductPage component to handle the "new" route
export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  
  // If the ID is "new", redirect to the new product page
  if (id === "new") {
    return (
      <div className="container mx-auto md:max-w-none md:w-[90%] py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>

        {/* This will be handled by the app/products/new/page.tsx component */}
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Loading new product form...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto md:max-w-none md:w-[90%] py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <ClientProductPage id={id} />
    </div>
  )
}

