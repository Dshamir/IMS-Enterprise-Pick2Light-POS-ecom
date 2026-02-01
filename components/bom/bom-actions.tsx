'use client'

import { Button } from "@/components/ui/button"
import { Plus, FileText, Upload, Download } from "lucide-react"
import { useState } from "react"
import { BOMAssemblyDialog } from "./bom-assembly-dialog"

export function BOMActions() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create BOM
        </Button>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Templates
        </Button>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <BOMAssemblyDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  )
}