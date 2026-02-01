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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { 
  Share, 
  Users, 
  Mail, 
  Link, 
  Copy, 
  Eye, 
  Edit3, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Globe, 
  Lock, 
  UserPlus, 
  Send,
  Download,
  Star,
  Bookmark,
  MoreHorizontal,
  Settings,
  History
} from 'lucide-react'

interface ReportShareSettings {
  id: string
  reportId: string
  reportName: string
  shareType: 'public' | 'private' | 'team' | 'restricted'
  permissions: {
    view: boolean
    edit: boolean
    comment: boolean
    export: boolean
    share: boolean
  }
  collaborators: Collaborator[]
  shareUrl?: string
  expiresAt?: Date
  password?: string
  downloadLimit?: number
  embedCode?: string
  allowComments: boolean
  allowAnnotations: boolean
  trackViews: boolean
}

interface Collaborator {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'viewer' | 'editor' | 'admin'
  joinedAt: Date
  lastActive?: Date
  status: 'pending' | 'active' | 'inactive'
}

interface ReportComment {
  id: string
  reportId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  x?: number
  y?: number
  resolved: boolean
  replies: ReportComment[]
  createdAt: Date
  updatedAt: Date
}

interface ReportActivity {
  id: string
  reportId: string
  userId: string
  userName: string
  action: 'viewed' | 'edited' | 'commented' | 'shared' | 'exported' | 'starred'
  details: string
  timestamp: Date
}

interface ReportSharingProps {
  reportId: string
  reportName: string
  isOwner: boolean
  onShareUpdate: (settings: ReportShareSettings) => void
}

const rolePermissions = {
  viewer: { view: true, edit: false, comment: true, export: false, share: false },
  editor: { view: true, edit: true, comment: true, export: true, share: false },
  admin: { view: true, edit: true, comment: true, export: true, share: true }
}

const shareTypes = [
  { 
    value: 'private', 
    label: 'Private', 
    description: 'Only you can access this report',
    icon: Lock 
  },
  { 
    value: 'restricted', 
    label: 'Restricted', 
    description: 'Specific people with permission',
    icon: Users 
  },
  { 
    value: 'team', 
    label: 'Team', 
    description: 'Anyone in your organization',
    icon: Users 
  },
  { 
    value: 'public', 
    label: 'Public', 
    description: 'Anyone with the link',
    icon: Globe 
  }
]

export default function ReportSharing({ 
  reportId, 
  reportName, 
  isOwner, 
  onShareUpdate 
}: ReportSharingProps) {
  const [shareSettings, setShareSettings] = useState<ReportShareSettings>({
    id: `share_${reportId}`,
    reportId,
    reportName,
    shareType: 'private',
    permissions: rolePermissions.viewer,
    collaborators: [],
    allowComments: true,
    allowAnnotations: true,
    trackViews: true
  })
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [comments, setComments] = useState<ReportComment[]>([])
  const [activities, setActivities] = useState<ReportActivity[]>([])
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('')
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [newComment, setNewComment] = useState('')
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadShareSettings()
    loadCollaborators()
    loadComments()
    loadActivities()
  }, [reportId])

  const loadShareSettings = async () => {
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}`)
      const data = await response.json()
      
      if (response.ok && data.settings) {
        setShareSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading share settings:', error)
    }
  }

  const loadCollaborators = async () => {
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}/collaborators`)
      const data = await response.json()
      
      if (response.ok) {
        setCollaborators(data.collaborators || [])
      }
    } catch (error) {
      console.error('Error loading collaborators:', error)
    }
  }

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}/comments`)
      const data = await response.json()
      
      if (response.ok) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const loadActivities = async () => {
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}/activities`)
      const data = await response.json()
      
      if (response.ok) {
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const updateShareSettings = async (newSettings: Partial<ReportShareSettings>) => {
    try {
      setIsLoading(true)
      const updatedSettings = { ...shareSettings, ...newSettings }
      
      const response = await fetch(`/api/reports/sharing/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
      
      if (response.ok) {
        setShareSettings(updatedSettings)
        onShareUpdate(updatedSettings)
        toast({
          title: 'Share Settings Updated',
          description: 'Your sharing preferences have been saved successfully'
        })
      } else {
        throw new Error('Failed to update share settings')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update share settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addCollaborator = async () => {
    if (!newCollaboratorEmail.trim()) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/reports/sharing/${reportId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newCollaboratorEmail,
          role: newCollaboratorRole
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCollaborators([...collaborators, data.collaborator])
        setNewCollaboratorEmail('')
        toast({
          title: 'Collaborator Added',
          description: `Invitation sent to ${newCollaboratorEmail}`
        })
      } else {
        throw new Error('Failed to add collaborator')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add collaborator',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}/collaborators/${collaboratorId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setCollaborators(collaborators.filter(c => c.id !== collaboratorId))
        toast({
          title: 'Collaborator Removed',
          description: 'Access has been revoked successfully'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove collaborator',
        variant: 'destructive'
      })
    }
  }

  const updateCollaboratorRole = async (collaboratorId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}/collaborators/${collaboratorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      
      if (response.ok) {
        setCollaborators(collaborators.map(c => 
          c.id === collaboratorId ? { ...c, role: newRole } : c
        ))
        toast({
          title: 'Role Updated',
          description: 'Collaborator permissions have been updated'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive'
      })
    }
  }

  const generateShareUrl = async () => {
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}/url`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        updateShareSettings({ shareUrl: data.url })
        return data.url
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate share URL',
        variant: 'destructive'
      })
    }
  }

  const copyShareUrl = async () => {
    let url = shareSettings.shareUrl
    if (!url) {
      url = await generateShareUrl()
    }
    
    if (url) {
      navigator.clipboard.writeText(url)
      toast({
        title: 'Link Copied',
        description: 'Share URL has been copied to clipboard'
      })
    }
  }

  const addComment = async () => {
    if (!newComment.trim()) return
    
    try {
      const response = await fetch(`/api/reports/sharing/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          userId: 'current-user', // TODO: Get from auth context
          userName: 'Current User'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setComments([...comments, data.comment])
        setNewComment('')
        toast({
          title: 'Comment Added',
          description: 'Your comment has been posted'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive'
      })
    }
  }

  const getShareTypeIcon = (type: string) => {
    const shareType = shareTypes.find(t => t.value === type)
    return shareType ? shareType.icon : Lock
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'viewed': return Eye
      case 'edited': return Edit3
      case 'commented': return MessageSquare
      case 'shared': return Share
      case 'exported': return Download
      case 'starred': return Star
      default: return Clock
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Sharing & Collaboration</h2>
          <p className="text-muted-foreground">
            Manage access, collect feedback, and collaborate on {reportName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyShareUrl} variant="outline">
            <Link className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogTrigger asChild>
              <Button>
                <Share className="h-4 w-4 mr-2" />
                Share Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Share "{reportName}"</DialogTitle>
                <DialogDescription>
                  Control who can access and collaborate on this report
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Share Type</Label>
                  <Select
                    value={shareSettings.shareType}
                    onValueChange={(value) => updateShareSettings({ shareType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shareTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Collaboration Settings</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Allow Comments</span>
                      <Switch
                        checked={shareSettings.allowComments}
                        onCheckedChange={(checked) => updateShareSettings({ allowComments: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Allow Annotations</span>
                      <Switch
                        checked={shareSettings.allowAnnotations}
                        onCheckedChange={(checked) => updateShareSettings({ allowAnnotations: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Track Views</span>
                      <Switch
                        checked={shareSettings.trackViews}
                        onCheckedChange={(checked) => updateShareSettings({ trackViews: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="collaborators" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="collaborators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Collaborators</CardTitle>
              <CardDescription>
                Invite team members to view, edit, or manage this report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={newCollaboratorRole} onValueChange={setNewCollaboratorRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addCollaborator} disabled={isLoading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {collaborators.map(collaborator => (
                  <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback>
                          {collaborator.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{collaborator.name}</div>
                        <div className="text-sm text-muted-foreground">{collaborator.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={collaborator.status === 'active' ? 'default' : 'secondary'}>
                        {collaborator.status}
                      </Badge>
                      <Select
                        value={collaborator.role}
                        onValueChange={(role) => updateCollaboratorRole(collaborator.id, role as any)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCollaborator(collaborator.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comments & Feedback</CardTitle>
              <CardDescription>
                Discuss and provide feedback on this report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button onClick={addComment}>
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </Button>
              </div>
              
              <div className="space-y-3">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>
                        {comment.userName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {comment.createdAt.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Track interactions and changes to this report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map(activity => {
                  const ActivityIcon = getActivityIcon(activity.action)
                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-2">
                      <div className="p-2 rounded-full bg-muted">
                        <ActivityIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium">{activity.userName}</span> {activity.details}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Sharing Settings</CardTitle>
              <CardDescription>
                Configure advanced permissions and security options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Share URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={shareSettings.shareUrl || 'Generate a share URL first'}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={copyShareUrl} variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Access Expiration</Label>
                <Input
                  type="datetime-local"
                  value={shareSettings.expiresAt?.toISOString().slice(0, 16) || ''}
                  onChange={(e) => updateShareSettings({ 
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined 
                  })}
                />
              </div>
              
              <div>
                <Label>Download Limit</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={shareSettings.downloadLimit || ''}
                  onChange={(e) => updateShareSettings({ 
                    downloadLimit: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}