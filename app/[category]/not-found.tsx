import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CategoryNotFound() {
  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Category Not Found</CardTitle>
            <CardDescription>
              The category you're looking for doesn't exist in the inventory system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This might happen if:
            </p>
            <ul className="text-left text-muted-foreground space-y-2 max-w-md mx-auto">
              <li>• The category name was mistyped in the URL</li>
              <li>• The category was recently deleted</li>
              <li>• You followed an old or invalid link</li>
            </ul>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  View All Categories
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/products">
                  View All Products
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}