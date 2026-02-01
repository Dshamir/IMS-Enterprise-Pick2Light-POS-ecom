"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, Package, Settings, AlertTriangle } from 'lucide-react'

interface ThemePreviewProps {
  themeSlug: string
  variant: 'light' | 'dark'
}

export function ThemePreview({ themeSlug, variant }: ThemePreviewProps) {
  const themeClass = themeSlug === 'standard' ? '' : `theme-${themeSlug}`
  const classes = `${themeClass} ${variant}`.trim()

  return (
    <div className={`${classes} p-6 rounded-lg border-2 min-h-[400px] bg-background text-foreground transition-all duration-300`}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-bold mb-1">Theme Preview</h3>
          <p className="text-muted-foreground text-sm">
            {themeSlug} theme ({variant} mode)
          </p>
        </div>

        {/* Sample Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Card</CardTitle>
            <CardDescription>This shows how cards look in this theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              This is regular body text. The theme defines how all text elements appear across your application.
            </p>

            {/* Sample Buttons */}
            <div className="flex gap-2">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
            </div>

            {/* Sample Badges */}
            <div className="flex gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Error</Badge>
            </div>

            {/* Sample Input */}
            <div className="space-y-2">
              <Input placeholder="Sample input field" />
            </div>
          </CardContent>
        </Card>

        {/* Sample Sidebar Items */}
        <div className="bg-sidebar-background text-sidebar-foreground rounded-md p-3 space-y-2">
          <p className="text-xs font-semibold mb-2">Sidebar Preview</p>
          <div className="flex items-center gap-2 p-2 rounded hover:bg-sidebar-accent">
            <Home className="h-4 w-4" />
            <span className="text-sm">Home</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-sidebar-accent">
            <Package className="h-4 w-4 text-sidebar-primary" />
            <span className="text-sm font-medium">Products</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded hover:bg-sidebar-accent">
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </div>
        </div>

        {/* Alert Example */}
        <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-destructive">Sample Alert</p>
            <p className="text-xs text-muted-foreground">This shows destructive/error styling</p>
          </div>
        </div>
      </div>
    </div>
  )
}
