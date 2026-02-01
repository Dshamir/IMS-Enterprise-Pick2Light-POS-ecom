'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, User, Edit, Trash2, Plus, Briefcase } from "lucide-react"
import { ProjectDialog } from "./project-dialog"

interface Project {
  id: string
  name: string
  description: string
  client: string
  start_date: string
  end_date: string
  status: string
  budget: number
  notes: string
  image_url: string | null
  created_at: string
  updated_at: string
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch projects:', response.status)
        setProjects([])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setProjects(projects.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setIsEditDialogOpen(true)
  }

  const handleProjectUpdate = () => {
    fetchProjects()
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setEditingProject(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'completed': return 'secondary'
      case 'on_hold': return 'outline'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">Manage one-off manufacturing projects</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8">
          <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Projects</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project to start managing manufacturing BOMs.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex gap-4 items-start">
                  {/* Image Thumbnail */}
                  {project.image_url ? (
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={project.image_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <Badge variant={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    {project.client && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <User className="h-3 w-3" />
                        <span>{project.client}</span>
                      </div>
                    )}
                    <CardDescription className="text-sm">
                      {project.description || 'No description'}
                    </CardDescription>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Start: {formatDate(project.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>End: {formatDate(project.end_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(project.budget)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleProjectUpdate}
      />

      <ProjectDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        project={editingProject}
        onSave={handleProjectUpdate}
      />
    </>
  )
}