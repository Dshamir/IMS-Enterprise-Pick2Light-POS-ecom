'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  GitBranch, 
  Clock, 
  User, 
  Plus,
  CheckCircle,
  Circle
} from "lucide-react"

interface BOMVersion {
  id: string
  assembly_id: string
  version_number: string
  description: string
  is_current: boolean
  effective_date: string
  created_by: string
  created_at: string
}

interface BOMVersionManagerProps {
  assemblyId: string
  onVersionChange?: (versionId: string) => void
}

export function BOMVersionManager({ assemblyId, onVersionChange }: BOMVersionManagerProps) {
  const [versions, setVersions] = useState<BOMVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newVersion, setNewVersion] = useState({
    version_number: '',
    description: '',
    created_by: 'system'
  })

  useEffect(() => {
    fetchVersions()
  }, [assemblyId])

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/bom/assemblies/${assemblyId}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data)
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createVersion = async () => {
    try {
      const response = await fetch(`/api/bom/assemblies/${assemblyId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVersion),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        setNewVersion({
          version_number: '',
          description: '',
          created_by: 'system'
        })
        fetchVersions()
      }
    } catch (error) {
      console.error('Error creating version:', error)
    }
  }

  const setCurrentVersion = async (versionId: string) => {
    try {
      const response = await fetch(`/api/bom/assemblies/${assemblyId}/versions/${versionId}/set-current`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchVersions()
        onVersionChange?.(versionId)
      }
    } catch (error) {
      console.error('Error setting current version:', error)
    }
  }

  const suggestNextVersion = () => {
    if (versions.length === 0) return '1.0'
    
    const sortedVersions = versions
      .map(v => v.version_number)
      .sort((a, b) => {
        const aParts = a.split('.').map(Number)
        const bParts = b.split('.').map(Number)
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aNum = aParts[i] || 0
          const bNum = bParts[i] || 0
          if (aNum !== bNum) return bNum - aNum
        }
        return 0
      })

    const latestVersion = sortedVersions[0]
    const parts = latestVersion.split('.')
    const major = parseInt(parts[0]) || 1
    const minor = parseInt(parts[1]) || 0
    
    return `${major}.${minor + 1}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading versions...</div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version History
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New BOM Version</DialogTitle>
                <DialogDescription>
                  Create a new version of this BOM assembly to track changes over time.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="version_number" className="text-right">
                    Version
                  </Label>
                  <Input
                    id="version_number"
                    value={newVersion.version_number}
                    onChange={(e) => setNewVersion(prev => ({ ...prev, version_number: e.target.value }))}
                    className="col-span-3"
                    placeholder={suggestNextVersion()}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newVersion.description}
                    onChange={(e) => setNewVersion(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-3"
                    placeholder="What changed in this version?"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="created_by" className="text-right">
                    Created By
                  </Label>
                  <Input
                    id="created_by"
                    value={newVersion.created_by}
                    onChange={(e) => setNewVersion(prev => ({ ...prev, created_by: e.target.value }))}
                    className="col-span-3"
                    placeholder="Your name or system"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createVersion}>Create Version</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No versions created yet. Create your first version to start tracking changes.
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border ${
                  version.is_current ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {version.is_current ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="font-semibold text-lg">v{version.version_number}</span>
                    </div>
                    
                    {version.is_current && (
                      <Badge className="bg-green-100 text-green-800">Current</Badge>
                    )}
                  </div>
                  
                  {!version.is_current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentVersion(version.id)}
                    >
                      Set as Current
                    </Button>
                  )}
                </div>
                
                {version.description && (
                  <p className="text-sm text-gray-600 mt-2">{version.description}</p>
                )}
                
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(version.effective_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{version.created_by}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}