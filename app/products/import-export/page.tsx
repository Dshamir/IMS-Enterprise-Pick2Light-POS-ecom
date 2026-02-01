import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CSVImportExport } from "@/app/components/csv-import-export"

export default function ImportExportPage() {
  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/products">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Products
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Import & Export Products</h1>
          <p className="text-muted-foreground">Bulk manage your inventory with CSV files</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <CSVImportExport />
      </div>
    </main>
  )
}

