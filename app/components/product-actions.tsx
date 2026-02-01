"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle, FileSpreadsheet } from "lucide-react"

export function ProductActions() {
  return (
    <div className="flex flex-col md:flex-row gap-2">
      <Button asChild>
        <Link href="/products/new">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Product
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/products/import-export">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import/Export
        </Link>
      </Button>
    </div>
  )
}

