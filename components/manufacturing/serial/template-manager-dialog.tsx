'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Settings,
  Search,
  Eye,
  Star,
  Power,
  PowerOff
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { TemplateEditorDialog } from "./template-editor-dialog"
import { type SerialNumberTemplate } from "@/lib/batch-serial-generator"

interface TemplateManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTemplateSelect?: (template: SerialNumberTemplate) => void
  selectMode?: boolean
}

export function TemplateManagerDialog({ 
  open, 
  onOpenChange,
  onTemplateSelect,
  selectMode = false
}: TemplateManagerDialogProps) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<SerialNumberTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredTemplates, setFilteredTemplates] = useState<SerialNumberTemplate[]>([])
  
  // Dialog states
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SerialNumberTemplate | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<SerialNumberTemplate | null>(null)

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/serial-number-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch templates:', response.status)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load templates",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = [...templates]
    
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.product_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.format_template.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Sort by: default first, then active, then by name
    filtered.sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    
    setFilteredTemplates(filtered)
  }

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setShowEditor(true)
  }

  const handleEdit = (template: SerialNumberTemplate) => {
    setEditingTemplate(template)
    setShowEditor(true)
  }

  const handleDuplicate = async (template: SerialNumberTemplate) => {
    const duplicatedTemplate = {
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
      is_default: false
    }
    setEditingTemplate(duplicatedTemplate as SerialNumberTemplate)
    setShowEditor(true)
  }

  const handleDelete = (template: SerialNumberTemplate) => {
    setDeletingTemplate(template)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deletingTemplate) return

    try {
      const response = await fetch(`/api/serial-number-templates/${deletingTemplate.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Template "${deletingTemplate.name}" deleted successfully!`,
        })
        fetchTemplates()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to delete template",
        })
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete template",
      })
    }

    setShowDeleteDialog(false)
    setDeletingTemplate(null)
  }

  const handleToggleActive = async (template: SerialNumberTemplate) => {
    try {
      const response = await fetch(`/api/serial-number-templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...template,
          is_active: !template.is_active
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Template ${template.is_active ? 'deactivated' : 'activated'} successfully!`,
        })
        fetchTemplates()
      } else {
        throw new Error('Failed to update template')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update template status",
      })
    }
  }

  const handleSetDefault = async (template: SerialNumberTemplate) => {
    try {
      const response = await fetch(`/api/serial-number-templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...template,
          is_default: true
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `"${template.name}" set as default template!`,
        })
        fetchTemplates()
      } else {
        throw new Error('Failed to update template')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default template",
      })
    }
  }

  const handleTemplateSaved = (savedTemplate: SerialNumberTemplate) => {
    fetchTemplates()
    setShowEditor(false)
    setEditingTemplate(null)
  }

  const handleTemplateSelect = (template: SerialNumberTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template)
      onOpenChange(false)
    }
  }

  const getStatusBadge = (template: SerialNumberTemplate) => {
    if (template.is_default) {
      return <Badge className="bg-blue-100 text-blue-800">Default</Badge>
    }
    if (template.is_active) {
      return <Badge variant="secondary">Active</Badge>
    }
    return <Badge variant="outline">Inactive</Badge>
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {selectMode ? 'Select Template' : 'Manage Templates'}
            </DialogTitle>
            <DialogDescription>
              {selectMode 
                ? 'Choose a template for serial number generation'
                : 'Create, edit, and manage serial number templates'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {!selectMode && (
                <Button onClick={handleCreateNew} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              )}
            </div>

            {/* Templates Table */}
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="text-center py-8">Loading templates...</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No templates match your search' : 'No templates found'}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Product Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map((template) => (
                          <TableRow 
                            key={template.id} 
                            className={selectMode ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={selectMode ? () => handleTemplateSelect(template) : undefined}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{template.name}</div>
                                {template.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {template.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {template.format_template}
                              </code>
                            </TableCell>
                            <TableCell>{template.product_type || 'General'}</TableCell>
                            <TableCell>{getStatusBadge(template)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {selectMode ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTemplateSelect(template)
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <>
                                    {!template.is_default && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSetDefault(template)}
                                        title="Set as default"
                                      >
                                        <Star className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleActive(template)}
                                      title={template.is_active ? "Deactivate" : "Activate"}
                                    >
                                      {template.is_active ? (
                                        <Power className="h-4 w-4" />
                                      ) : (
                                        <PowerOff className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(template)}
                                      title="Edit template"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDuplicate(template)}
                                      title="Duplicate template"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(template)}
                                      title="Delete template"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{templates.length}</div>
                  <div className="text-sm text-muted-foreground">Total Templates</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {templates.filter(t => t.is_active).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {templates.filter(t => t.is_default).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Default</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <TemplateEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        template={editingTemplate}
        onSave={handleTemplateSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deletingTemplate?.name}"?
              This action cannot be undone and may affect existing production runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}