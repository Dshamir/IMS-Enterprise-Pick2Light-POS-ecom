'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye,
  Copy,
  Share,
  Star,
  Tag,
  Users,
  Settings,
  FileText,
  Download,
  Upload
} from 'lucide-react'

interface TemplateDesign {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  query: any
  charts: any[]
  parameters: TemplateParameter[]
  metadata: {
    version: string
    author: string
    createdAt: Date
    updatedAt: Date
    isPublic: boolean
    isActive: boolean
    usageCount: number
    rating: number
    complexity: 'low' | 'medium' | 'high'
    estimatedRows: number
  }
}

interface TemplateParameter {
  id: string
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'multi-select'
  required: boolean
  defaultValue?: any
  options?: string[]
  description?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

interface TemplateDesignerProps {
  query?: any
  charts?: any[]
  onSave: (template: TemplateDesign) => void
  onLoad: (template: TemplateDesign) => void
  initialTemplate?: TemplateDesign
}

const categories = [
  'inventory',
  'manufacturing',
  'sales',
  'finance',
  'operations',
  'quality',
  'maintenance',
  'custom'
]

const complexityLevels = [
  { value: 'low', label: 'Low', description: 'Simple queries with minimal processing' },
  { value: 'medium', label: 'Medium', description: 'Moderate complexity with joins and aggregations' },
  { value: 'high', label: 'High', description: 'Complex queries with multiple joins and advanced features' }
]

export default function TemplateDesigner({ 
  query, 
  charts = [], 
  onSave, 
  onLoad, 
  initialTemplate 
}: TemplateDesignerProps) {
  const [templates, setTemplates] = useState<TemplateDesign[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<TemplateDesign | null>(initialTemplate || null)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('browse')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const { toast } = useToast()

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'custom',
    tags: [] as string[],
    isPublic: false,
    isActive: true,
    complexity: 'medium' as const,
    estimatedRows: 1000
  })

  const [parameters, setParameters] = useState<TemplateParameter[]>([])
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    if (initialTemplate) {
      setCurrentTemplate(initialTemplate)
      setTemplateForm({
        name: initialTemplate.name,
        description: initialTemplate.description,
        category: initialTemplate.category,
        tags: initialTemplate.tags,
        isPublic: initialTemplate.metadata.isPublic,
        isActive: initialTemplate.metadata.isActive,
        complexity: initialTemplate.metadata.complexity,
        estimatedRows: initialTemplate.metadata.estimatedRows
      })
      setParameters(initialTemplate.parameters)
    }
  }, [initialTemplate])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/reports/templates')
      const data = await response.json()
      
      if (response.ok) {
        setTemplates(data.templates || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load templates',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!templateForm.name || !query) {
      toast({
        title: 'Error',
        description: 'Please provide a template name and query configuration',
        variant: 'destructive'
      })
      return
    }

    try {
      const template: TemplateDesign = {
        id: currentTemplate?.id || `template_${Date.now()}`,
        name: templateForm.name,
        description: templateForm.description,
        category: templateForm.category,
        tags: templateForm.tags,
        query,
        charts,
        parameters,
        metadata: {
          version: '1.0.0',
          author: 'User', // TODO: Get from auth context
          createdAt: currentTemplate?.metadata.createdAt || new Date(),
          updatedAt: new Date(),
          isPublic: templateForm.isPublic,
          isActive: templateForm.isActive,
          usageCount: currentTemplate?.metadata.usageCount || 0,
          rating: currentTemplate?.metadata.rating || 0,
          complexity: templateForm.complexity,
          estimatedRows: templateForm.estimatedRows
        }
      }

      const response = await fetch('/api/reports/templates', {
        method: currentTemplate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      })

      if (response.ok) {
        const result = await response.json()
        setCurrentTemplate(result.template)
        setTemplates(prev => {
          const existing = prev.find(t => t.id === result.template.id)
          if (existing) {
            return prev.map(t => t.id === result.template.id ? result.template : t)
          } else {
            return [...prev, result.template]
          }
        })
        
        toast({
          title: 'Success',
          description: `Template "${template.name}" saved successfully`
        })
        
        onSave(result.template)
        setShowDialog(false)
        setIsEditing(false)
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      })
    }
  }

  const loadTemplate = (template: TemplateDesign) => {
    setCurrentTemplate(template)
    onLoad(template)
    toast({
      title: 'Template Loaded',
      description: `Template "${template.name}" loaded successfully`
    })
  }

  const duplicateTemplate = (template: TemplateDesign) => {
    const duplicated = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      metadata: {
        ...template.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        rating: 0
      }
    }
    
    setCurrentTemplate(duplicated)
    setTemplateForm({
      name: duplicated.name,
      description: duplicated.description,
      category: duplicated.category,
      tags: duplicated.tags,
      isPublic: duplicated.metadata.isPublic,
      isActive: duplicated.metadata.isActive,
      complexity: duplicated.metadata.complexity,
      estimatedRows: duplicated.metadata.estimatedRows
    })
    setParameters(duplicated.parameters)
    setActiveTab('design')
  }

  const deleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/reports/templates/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id))
        if (currentTemplate?.id === id) {
          setCurrentTemplate(null)
        }
        toast({
          title: 'Success',
          description: 'Template deleted successfully'
        })
      } else {
        throw new Error('Failed to delete template')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      })
    }
  }

  const addParameter = () => {
    const newParam: TemplateParameter = {
      id: `param_${Date.now()}`,
      name: `param${parameters.length + 1}`,
      label: `Parameter ${parameters.length + 1}`,
      type: 'string',
      required: false
    }
    setParameters([...parameters, newParam])
  }

  const updateParameter = (id: string, updates: Partial<TemplateParameter>) => {
    setParameters(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const removeParameter = (id: string) => {
    setParameters(prev => prev.filter(p => p.id !== id))
  }

  const addTag = () => {
    if (newTag && !templateForm.tags.includes(newTag)) {
      setTemplateForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setTemplateForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Designer</h2>
          <p className="text-muted-foreground">Create and manage reusable report templates</p>
        </div>
        <Button onClick={() => setShowDialog(true)} disabled={!query}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Templates</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{template.category}</Badge>
                      {template.metadata.isPublic && <Share className="h-4 w-4 text-blue-500" />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>v{template.metadata.version}</span>
                      <span>by {template.metadata.author}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Badge className={getComplexityColor(template.metadata.complexity)}>
                        {template.metadata.complexity}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{template.metadata.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => loadTemplate(template)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateTemplate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="design" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Configuration</CardTitle>
              <CardDescription>Configure template metadata and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={templateForm.category}
                    onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this template does"
                  rows={3}
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {templateForm.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="cursor-pointer">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeTag(tag)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="complexity">Complexity</Label>
                  <Select
                    value={templateForm.complexity}
                    onValueChange={(value) => setTemplateForm(prev => ({ ...prev, complexity: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {complexityLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="estimated-rows">Estimated Rows</Label>
                  <Input
                    id="estimated-rows"
                    type="number"
                    value={templateForm.estimatedRows}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, estimatedRows: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public-template"
                    checked={templateForm.isPublic}
                    onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, isPublic: checked }))}
                  />
                  <Label htmlFor="public-template">Public Template</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active-template"
                    checked={templateForm.isActive}
                    onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="active-template">Active</Label>
                </div>
              </div>

              <Button onClick={saveTemplate} disabled={!templateForm.name || !query}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parameters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Template Parameters
                <Button onClick={addParameter} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter
                </Button>
              </CardTitle>
              <CardDescription>
                Define parameters that users can customize when using this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {parameters.map(param => (
                  <div key={param.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{param.label}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParameter(param.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Parameter Name</Label>
                        <Input
                          value={param.name}
                          onChange={(e) => updateParameter(param.id, { name: e.target.value })}
                          placeholder="param_name"
                        />
                      </div>
                      <div>
                        <Label>Display Label</Label>
                        <Input
                          value={param.label}
                          onChange={(e) => updateParameter(param.id, { label: e.target.value })}
                          placeholder="Parameter Label"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={param.type}
                          onValueChange={(value) => updateParameter(param.id, { type: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                            <SelectItem value="multi-select">Multi-Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Default Value</Label>
                        <Input
                          value={param.defaultValue || ''}
                          onChange={(e) => updateParameter(param.id, { defaultValue: e.target.value })}
                          placeholder="Default value"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={param.description || ''}
                        onChange={(e) => updateParameter(param.id, { description: e.target.value })}
                        placeholder="Parameter description"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={param.required}
                        onCheckedChange={(checked) => updateParameter(param.id, { required: checked })}
                      />
                      <Label>Required</Label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Save your current query and chart configuration as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quick-name">Template Name</Label>
              <Input
                id="quick-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label htmlFor="quick-description">Description</Label>
              <Textarea
                id="quick-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template does"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveTemplate} disabled={!templateForm.name}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}