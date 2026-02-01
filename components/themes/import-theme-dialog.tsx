"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'

interface ImportThemeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ImportThemeDialog({ open, onOpenChange, onSuccess }: ImportThemeDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [themeName, setThemeName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fileContent, setFileContent] = useState('')
  const [detectedFormat, setDetectedFormat] = useState<string>('')

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = async (selectedFile: File) => {
    // Validate file type
    const validExtensions = ['.js', '.json', '.theme']
    const fileName = selectedFile.name.toLowerCase()
    const isValid = validExtensions.some(ext => fileName.endsWith(ext))

    if (!isValid) {
      toast.error('Invalid file type. Please upload .js, .json, or .theme files')
      return
    }

    // Validate file size (100KB max)
    if (selectedFile.size > 100 * 1024) {
      toast.error('File too large. Maximum size is 100KB')
      return
    }

    setFile(selectedFile)

    // Read file content
    try {
      const content = await selectedFile.text()
      setFileContent(content)

      // Auto-detect format
      if (content.includes('export const theme') || content.includes('export default')) {
        setDetectedFormat('Warehouse Theme (JavaScript)')
        setThemeName('warehouse-command')
        setDisplayName('Warehouse Command Center')
        setDescription('AI-powered warehouse management interface theme')
      } else if (content.trim().startsWith('{')) {
        setDetectedFormat('JSON Theme')
        try {
          const json = JSON.parse(content)
          if (json.theme_name) {
            setThemeName(json.theme_slug || json.theme_name.toLowerCase().replace(/\s+/g, '-'))
            setDisplayName(json.display_name || json.theme_name)
            setDescription(json.description || '')
          }
        } catch (error) {
          setDetectedFormat('JSON (Unknown format)')
        }
      } else {
        setDetectedFormat('Unknown format')
      }
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Failed to read file')
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import')
      return
    }

    if (!themeName || !displayName) {
      toast.error('Please enter theme name and display name')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('theme_name', themeName)
      formData.append('display_name', displayName)
      formData.append('description', description)

      const response = await fetch('/api/themes/import', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Theme "${displayName}" imported successfully!`)
        onOpenChange(false)
        onSuccess()
        // Reset form
        setFile(null)
        setThemeName('')
        setDisplayName('')
        setDescription('')
        setFileContent('')
        setDetectedFormat('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to import theme')
      }
    } catch (error) {
      console.error('Error importing theme:', error)
      toast.error('Failed to import theme')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Theme
          </DialogTitle>
          <DialogDescription>
            Upload a theme file (.js, .json, .theme) to import into your theme library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  {detectedFormat && (
                    <p className="text-sm text-blue-600 mt-2">
                      Detected: {detectedFormat}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setFileContent('')
                    setDetectedFormat('')
                  }}
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium mb-1">Drag & drop theme file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <div>
                  <input
                    type="file"
                    id="theme-file-input"
                    className="hidden"
                    accept=".js,.json,.theme"
                    onChange={handleFileInput}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('theme-file-input')?.click()}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: .js, .json, .theme (Max 100KB)
                </p>
              </div>
            )}
          </div>

          {/* Theme Details (shown when file selected) */}
          {file && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2">
                <Label htmlFor="import-name">Theme Name *</Label>
                <Input
                  id="import-name"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="warehouse-command"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-display">Display Name *</Label>
                <Input
                  id="import-display"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Warehouse Command Center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-description">Description</Label>
                <Textarea
                  id="import-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this theme..."
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? 'Importing...' : 'Import Theme'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
