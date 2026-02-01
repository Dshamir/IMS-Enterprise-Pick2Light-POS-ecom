"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save, RotateCcw, Plus, Trash2, DollarSign, Barcode, Hash, Type, FileText, Database, RefreshCw, Zap, Cpu, CheckCircle2, XCircle, FileScan } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CacheStats {
  embedding: {
    hits: number
    misses: number
    size: number
    hitRate: number
    hitRateFormatted: string
    evictions: number
  }
  results: {
    hits: number
    misses: number
    size: number
    hitRate: number
    hitRateFormatted: string
    evictions: number
  }
  answer: {
    hits: number
    misses: number
    size: number
    hitRate: number
    hitRateFormatted: string
    evictions: number
  }
  version: number
  savings: {
    embeddingCallsSaved: number
    totalEmbeddingCalls: number
    estimatedTokensSaved: number
    estimatedCostSaved: string
    costSavingsRate: string
    answerCallsSaved: number
    totalAnswerCalls: number
    answerCacheRate: string
  }
}

interface KBAISettings {
  // General
  default_model: string
  auto_approve_threshold: number
  validation_enabled: boolean
  // Price
  price_system_prompt: string
  price_model: string
  price_temperature: number
  price_max_tokens: number
  price_high_confidence: number
  price_medium_confidence: number
  price_kb_search_limit: number
  // Name Generation
  name_system_prompt: string
  name_model: string
  name_temperature: number
  name_max_tokens: number
  name_kb_search_limit: number
  name_max_length: number
  name_banned_words: string[]
  // Description Enhancement
  description_system_prompt: string
  description_model: string
  description_temperature: number
  description_max_tokens: number
  description_kb_search_limit: number
  description_short_max_length: number
  description_long_max_length: number
  // Barcode
  barcode_category_prefixes: Record<string, string>
  barcode_format: string
  barcode_kb_search_limit: number
  barcode_alternatives_count: number
  // Part Number
  part_kb_search_limit: number
  part_return_count: number
  part_high_confidence: number
  part_medium_confidence: number
  // PDF Summarization
  pdf_system_prompt: string
  pdf_model: string
  pdf_temperature: number
  pdf_max_tokens: number
}

export function KBSettings() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<KBAISettings | null>(null)
  const [newPrefixKey, setNewPrefixKey] = useState("")
  const [newPrefixValue, setNewPrefixValue] = useState("")

  // Cache stats state
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [isLoadingCache, setIsLoadingCache] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)

  // Model management state
  const [isUpdatingModels, setIsUpdatingModels] = useState(false)
  const [modelUpdateResult, setModelUpdateResult] = useState<{
    success: boolean
    results: Array<{
      provider: string
      added: string[]
      updated: string[]
      errors: string[]
    }>
  } | null>(null)

  // Available models from registry
  const [availableModels, setAvailableModels] = useState<Array<{
    id: string
    modelId: string
    displayName: string
    provider: string
  }>>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchCacheStats()
    fetchAvailableModels()
  }, [])

  const fetchAvailableModels = async () => {
    setIsLoadingModels(true)
    try {
      const response = await fetch('/api/ai/models?available=true')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.models) {
          setAvailableModels(data.models)
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const fetchCacheStats = async () => {
    setIsLoadingCache(true)
    try {
      const response = await fetch('/api/knowledge-base/cache-stats')
      if (response.ok) {
        const data = await response.json()
        setCacheStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
    } finally {
      setIsLoadingCache(false)
    }
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      const response = await fetch('/api/knowledge-base/cache-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      })

      if (response.ok) {
        toast({
          title: "Cache Cleared",
          description: "All caches have been cleared successfully."
        })
        fetchCacheStats()
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear cache"
      })
    } finally {
      setIsClearingCache(false)
    }
  }

  const handleUpdateModels = async () => {
    setIsUpdatingModels(true)
    setModelUpdateResult(null)
    try {
      const response = await fetch('/api/ai/models/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const results = data.details || data.results || []
        setModelUpdateResult({
          success: true,
          results: results
        })
        const totalAdded = data.summary?.totalAdded || results.reduce((sum: number, r: any) => sum + r.added.length, 0)
        const totalUpdated = data.summary?.totalUpdated || results.reduce((sum: number, r: any) => sum + r.updated.length, 0)
        toast({
          title: "Models Updated",
          description: `Added ${totalAdded} new models, updated ${totalUpdated} existing models.`
        })
        // Re-fetch available models to update dropdowns
        fetchAvailableModels()
      } else {
        setModelUpdateResult({
          success: false,
          results: data.details || data.results || []
        })
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: data.error || "Failed to update models"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update AI models"
      })
    } finally {
      setIsUpdatingModels(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/knowledge-base/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load settings"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/knowledge-base/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your AI settings have been updated successfully."
        })
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to save settings"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/knowledge-base/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        toast({
          title: "Settings Reset",
          description: "All settings have been restored to defaults."
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset settings"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: keyof KBAISettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  const addCategoryPrefix = () => {
    if (!settings || !newPrefixKey.trim() || !newPrefixValue.trim()) return

    const updated = {
      ...settings.barcode_category_prefixes,
      [newPrefixKey.toLowerCase().trim()]: newPrefixValue.trim()
    }
    updateSetting('barcode_category_prefixes', updated)
    setNewPrefixKey("")
    setNewPrefixValue("")
  }

  const removeCategoryPrefix = (key: string) => {
    if (!settings) return
    const { [key]: _, ...rest } = settings.barcode_category_prefixes
    updateSetting('barcode_category_prefixes', rest)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load settings. Please refresh the page.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cache Performance Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Cache Performance
              </CardTitle>
              <CardDescription>
                Embedding and search result caching statistics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCacheStats}
                disabled={isLoadingCache}
              >
                {isLoadingCache ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isClearingCache}>
                    {isClearingCache ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Clear Cache"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Caches?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all embedding and result caches. The next searches will need to regenerate embeddings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCache}>Clear Cache</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cacheStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Embedding Cache Stats */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Embedding Cache</h4>
                  <Badge variant={cacheStats.embedding.hitRate >= 60 ? "default" : cacheStats.embedding.hitRate >= 30 ? "secondary" : "outline"}>
                    {cacheStats.embedding.hitRateFormatted} hit rate
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hits</p>
                    <p className="font-medium text-green-600">{cacheStats.embedding.hits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Misses</p>
                    <p className="font-medium text-orange-600">{cacheStats.embedding.misses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{cacheStats.embedding.size.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Evictions</p>
                    <p className="font-medium">{cacheStats.embedding.evictions.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Results Cache Stats */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Results Cache</h4>
                  <Badge variant={cacheStats.results.hitRate >= 60 ? "default" : cacheStats.results.hitRate >= 30 ? "secondary" : "outline"}>
                    {cacheStats.results.hitRateFormatted} hit rate
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hits</p>
                    <p className="font-medium text-green-600">{cacheStats.results.hits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Misses</p>
                    <p className="font-medium text-orange-600">{cacheStats.results.misses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{cacheStats.results.size.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Evictions</p>
                    <p className="font-medium">{cacheStats.results.evictions.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Answer Cache Stats */}
              <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Answer Cache</h4>
                  <Badge variant={cacheStats.answer.hitRate >= 50 ? "default" : cacheStats.answer.hitRate >= 20 ? "secondary" : "outline"}>
                    {cacheStats.answer.hitRateFormatted} hit rate
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hits</p>
                    <p className="font-medium text-green-600">{cacheStats.answer.hits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Misses</p>
                    <p className="font-medium text-orange-600">{cacheStats.answer.misses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{cacheStats.answer.size.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">AI Calls Saved</p>
                    <p className="font-medium text-blue-600">{cacheStats.savings.answerCallsSaved.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Cost Savings */}
              <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">API Cost Savings</h4>
                  <Badge variant="default" className="bg-green-600">
                    {cacheStats.savings.costSavingsRate}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Calls Saved</p>
                    <p className="font-medium text-green-600">{cacheStats.savings.embeddingCallsSaved.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Calls</p>
                    <p className="font-medium">{cacheStats.savings.totalEmbeddingCalls.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tokens Saved</p>
                    <p className="font-medium">{cacheStats.savings.estimatedTokensSaved.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Est. Savings</p>
                    <p className="font-medium text-green-600">{cacheStats.savings.estimatedCostSaved}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : isLoadingCache ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Unable to load cache statistics
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Model Management Card */}
      <Card className="border-2 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-600" />
                AI Model Management
              </CardTitle>
              <CardDescription>
                Update available AI models from OpenAI, Anthropic, and Google (40 models)
              </CardDescription>
            </div>
            <Button
              onClick={handleUpdateModels}
              disabled={isUpdatingModels}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdatingModels ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Update Models
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-green-600">OpenAI</p>
                <p className="text-muted-foreground">17 models</p>
                <p className="text-xs text-muted-foreground mt-1">GPT-5, GPT-4.1, o3, o4-mini</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-orange-600">Anthropic</p>
                <p className="text-muted-foreground">13 models</p>
                <p className="text-xs text-muted-foreground mt-1">Claude 4.5, 4.1, 4, 3.7</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-blue-600">Google</p>
                <p className="text-muted-foreground">10 models</p>
                <p className="text-xs text-muted-foreground mt-1">Gemini 3, 2.5, 2.0</p>
              </div>
            </div>

            {modelUpdateResult && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {modelUpdateResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {modelUpdateResult.success ? 'Update Complete' : 'Update Failed'}
                  </span>
                </div>
                {modelUpdateResult.results.map((result, i) => (
                  <div key={i} className="text-sm pl-6">
                    <span className="font-medium capitalize">{result.provider}:</span>
                    {result.added.length > 0 && (
                      <span className="text-green-600 ml-2">+{result.added.length} added</span>
                    )}
                    {result.updated.length > 0 && (
                      <span className="text-blue-600 ml-2">{result.updated.length} updated</span>
                    )}
                    {result.errors.length > 0 && (
                      <span className="text-red-600 ml-2">{result.errors.length} errors</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Click "Update Models" to sync the latest AI models to your database. This includes GPT-5, Claude 4.5, Gemini 3, and the o-series reasoning models.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Price Lookup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Price Lookup Configuration
          </CardTitle>
          <CardDescription>
            Configure the AI-powered price suggestion system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price_system_prompt">System Prompt</Label>
            <Textarea
              id="price_system_prompt"
              value={settings.price_system_prompt}
              onChange={(e) => updateSetting('price_system_prompt', e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder="Enter the system prompt for price estimation..."
            />
            <p className="text-xs text-muted-foreground">
              This prompt guides the AI in estimating product prices. Include JSON format requirements.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_model">AI Model</Label>
              <Select
                value={settings.price_model}
                onValueChange={(value) => updateSetting('price_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <SelectItem value="__loading__" disabled>Loading models...</SelectItem>
                  ) : availableModels.length > 0 ? (
                    <>
                      {/* OpenAI Models */}
                      {availableModels.filter(m => m.provider === 'openai').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>OpenAI</SelectLabel>
                          {availableModels.filter(m => m.provider === 'openai').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Anthropic Models */}
                      {availableModels.filter(m => m.provider === 'anthropic').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Anthropic</SelectLabel>
                          {availableModels.filter(m => m.provider === 'anthropic').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Gemini Models */}
                      {availableModels.filter(m => m.provider === 'gemini').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Google Gemini</SelectLabel>
                          {availableModels.filter(m => m.provider === 'gemini').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    <>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast, Cheap)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_max_tokens">Max Tokens</Label>
              <Input
                id="price_max_tokens"
                type="number"
                min={50}
                max={4000}
                value={settings.price_max_tokens}
                onChange={(e) => updateSetting('price_max_tokens', parseInt(e.target.value) || 300)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {settings.price_temperature.toFixed(1)}</Label>
            <Slider
              value={[settings.price_temperature]}
              onValueChange={([value]) => updateSetting('price_temperature', value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower = more consistent, Higher = more creative
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>High Confidence Threshold: {(settings.price_high_confidence * 100).toFixed(0)}%</Label>
              <Slider
                value={[settings.price_high_confidence]}
                onValueChange={([value]) => updateSetting('price_high_confidence', value)}
                min={0.5}
                max={0.99}
                step={0.01}
              />
            </div>
            <div className="space-y-2">
              <Label>Medium Confidence Threshold: {(settings.price_medium_confidence * 100).toFixed(0)}%</Label>
              <Slider
                value={[settings.price_medium_confidence]}
                onValueChange={([value]) => updateSetting('price_medium_confidence', value)}
                min={0.3}
                max={0.85}
                step={0.01}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_kb_search_limit">KB Search Limit</Label>
            <Input
              id="price_kb_search_limit"
              type="number"
              min={1}
              max={50}
              value={settings.price_kb_search_limit}
              onChange={(e) => updateSetting('price_kb_search_limit', parseInt(e.target.value) || 5)}
            />
            <p className="text-xs text-muted-foreground">
              Number of KB items to search for price references
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Name Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-orange-600" />
            Name Generation Configuration
          </CardTitle>
          <CardDescription>
            Configure AI-powered product name generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name_system_prompt">System Prompt</Label>
            <Textarea
              id="name_system_prompt"
              value={settings.name_system_prompt}
              onChange={(e) => updateSetting('name_system_prompt', e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder="Enter the system prompt for name generation..."
            />
            <p className="text-xs text-muted-foreground">
              This prompt guides the AI in generating professional product names. Include naming conventions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name_model">AI Model</Label>
              <Select
                value={settings.name_model}
                onValueChange={(value) => updateSetting('name_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <SelectItem value="__loading__" disabled>Loading models...</SelectItem>
                  ) : availableModels.length > 0 ? (
                    <>
                      {/* OpenAI Models */}
                      {availableModels.filter(m => m.provider === 'openai').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>OpenAI</SelectLabel>
                          {availableModels.filter(m => m.provider === 'openai').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Anthropic Models */}
                      {availableModels.filter(m => m.provider === 'anthropic').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Anthropic</SelectLabel>
                          {availableModels.filter(m => m.provider === 'anthropic').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Gemini Models */}
                      {availableModels.filter(m => m.provider === 'gemini').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Google Gemini</SelectLabel>
                          {availableModels.filter(m => m.provider === 'gemini').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    <>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast, Cheap)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_max_tokens">Max Tokens</Label>
              <Input
                id="name_max_tokens"
                type="number"
                min={50}
                max={1000}
                value={settings.name_max_tokens}
                onChange={(e) => updateSetting('name_max_tokens', parseInt(e.target.value) || 200)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {settings.name_temperature?.toFixed(1) || '0.4'}</Label>
            <Slider
              value={[settings.name_temperature || 0.4]}
              onValueChange={([value]) => updateSetting('name_temperature', value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name_max_length">Max Name Length</Label>
              <Input
                id="name_max_length"
                type="number"
                min={20}
                max={200}
                value={settings.name_max_length}
                onChange={(e) => updateSetting('name_max_length', parseInt(e.target.value) || 80)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_kb_search_limit">KB Search Limit</Label>
              <Input
                id="name_kb_search_limit"
                type="number"
                min={1}
                max={50}
                value={settings.name_kb_search_limit}
                onChange={(e) => updateSetting('name_kb_search_limit', parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name_banned_words">Banned Words (comma-separated)</Label>
            <Input
              id="name_banned_words"
              value={settings.name_banned_words?.join(', ') || ''}
              onChange={(e) => updateSetting('name_banned_words', e.target.value.split(',').map(w => w.trim()).filter(Boolean))}
              placeholder="cheap, fake, generic, knockoff"
            />
            <p className="text-xs text-muted-foreground">
              Words that should never appear in generated product names
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Description Enhancement Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Description Enhancement Configuration
          </CardTitle>
          <CardDescription>
            Configure AI-powered description generation and enhancement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description_system_prompt">System Prompt</Label>
            <Textarea
              id="description_system_prompt"
              value={settings.description_system_prompt}
              onChange={(e) => updateSetting('description_system_prompt', e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder="Enter the system prompt for description enhancement..."
            />
            <p className="text-xs text-muted-foreground">
              This prompt guides the AI in enhancing product descriptions. Include compliance requirements.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description_model">AI Model</Label>
              <Select
                value={settings.description_model}
                onValueChange={(value) => updateSetting('description_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <SelectItem value="__loading__" disabled>Loading models...</SelectItem>
                  ) : availableModels.length > 0 ? (
                    <>
                      {/* OpenAI Models */}
                      {availableModels.filter(m => m.provider === 'openai').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>OpenAI</SelectLabel>
                          {availableModels.filter(m => m.provider === 'openai').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Anthropic Models */}
                      {availableModels.filter(m => m.provider === 'anthropic').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Anthropic</SelectLabel>
                          {availableModels.filter(m => m.provider === 'anthropic').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Gemini Models */}
                      {availableModels.filter(m => m.provider === 'gemini').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Google Gemini</SelectLabel>
                          {availableModels.filter(m => m.provider === 'gemini').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    <>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast, Cheap)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_max_tokens">Max Tokens</Label>
              <Input
                id="description_max_tokens"
                type="number"
                min={100}
                max={2000}
                value={settings.description_max_tokens}
                onChange={(e) => updateSetting('description_max_tokens', parseInt(e.target.value) || 800)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {settings.description_temperature?.toFixed(1) || '0.5'}</Label>
            <Slider
              value={[settings.description_temperature || 0.5]}
              onValueChange={([value]) => updateSetting('description_temperature', value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description_short_max_length">Short Desc Max</Label>
              <Input
                id="description_short_max_length"
                type="number"
                min={50}
                max={500}
                value={settings.description_short_max_length}
                onChange={(e) => updateSetting('description_short_max_length', parseInt(e.target.value) || 150)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_long_max_length">Long Desc Max</Label>
              <Input
                id="description_long_max_length"
                type="number"
                min={200}
                max={5000}
                value={settings.description_long_max_length}
                onChange={(e) => updateSetting('description_long_max_length', parseInt(e.target.value) || 1000)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_kb_search_limit">KB Search Limit</Label>
              <Input
                id="description_kb_search_limit"
                type="number"
                min={1}
                max={50}
                value={settings.description_kb_search_limit}
                onChange={(e) => updateSetting('description_kb_search_limit', parseInt(e.target.value) || 15)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barcode Lookup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-blue-600" />
            Barcode Generation Configuration
          </CardTitle>
          <CardDescription>
            Configure barcode generation patterns and category prefixes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode_format">Barcode Format Pattern</Label>
            <Input
              id="barcode_format"
              value={settings.barcode_format}
              onChange={(e) => updateSetting('barcode_format', e.target.value)}
              placeholder="{PREFIX}-{TIMESTAMP}-{RANDOM}"
            />
            <p className="text-xs text-muted-foreground">
              Available placeholders: {'{PREFIX}'}, {'{TIMESTAMP}'}, {'{RANDOM}'}, {'{COUNTER}'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Category Prefixes</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {Object.entries(settings.barcode_category_prefixes).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Input
                    value={key}
                    disabled
                    className="flex-1 bg-muted"
                  />
                  <Input
                    value={value}
                    onChange={(e) => {
                      const updated = { ...settings.barcode_category_prefixes, [key]: e.target.value }
                      updateSetting('barcode_category_prefixes', updated)
                    }}
                    className="w-24"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCategoryPrefix(key)}
                    disabled={key === 'default'}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Category name"
                value={newPrefixKey}
                onChange={(e) => setNewPrefixKey(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Prefix"
                value={newPrefixValue}
                onChange={(e) => setNewPrefixValue(e.target.value)}
                className="w-24"
              />
              <Button variant="outline" onClick={addCategoryPrefix}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode_kb_search_limit">KB Search Limit</Label>
              <Input
                id="barcode_kb_search_limit"
                type="number"
                min={1}
                max={50}
                value={settings.barcode_kb_search_limit}
                onChange={(e) => updateSetting('barcode_kb_search_limit', parseInt(e.target.value) || 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode_alternatives_count">Alternatives to Generate</Label>
              <Input
                id="barcode_alternatives_count"
                type="number"
                min={0}
                max={10}
                value={settings.barcode_alternatives_count}
                onChange={(e) => updateSetting('barcode_alternatives_count', parseInt(e.target.value) || 3)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Part Number Lookup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-purple-600" />
            Part Number Lookup Configuration
          </CardTitle>
          <CardDescription>
            Configure KB-based part number matching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="part_kb_search_limit">KB Search Limit</Label>
              <Input
                id="part_kb_search_limit"
                type="number"
                min={1}
                max={50}
                value={settings.part_kb_search_limit}
                onChange={(e) => updateSetting('part_kb_search_limit', parseInt(e.target.value) || 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="part_return_count">Results to Show</Label>
              <Input
                id="part_return_count"
                type="number"
                min={1}
                max={20}
                value={settings.part_return_count}
                onChange={(e) => updateSetting('part_return_count', parseInt(e.target.value) || 5)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>High Confidence: {(settings.part_high_confidence * 100).toFixed(0)}%</Label>
              <Slider
                value={[settings.part_high_confidence]}
                onValueChange={([value]) => updateSetting('part_high_confidence', value)}
                min={0.5}
                max={0.99}
                step={0.01}
              />
            </div>
            <div className="space-y-2">
              <Label>Medium Confidence: {(settings.part_medium_confidence * 100).toFixed(0)}%</Label>
              <Slider
                value={[settings.part_medium_confidence]}
                onValueChange={([value]) => updateSetting('part_medium_confidence', value)}
                min={0.3}
                max={0.85}
                step={0.01}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Summarization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileScan className="h-5 w-5 text-red-600" />
            PDF Summarization Configuration
          </CardTitle>
          <CardDescription>
            Configure how PDF documents are summarized when attached to products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf_system_prompt">System Prompt</Label>
            <Textarea
              id="pdf_system_prompt"
              value={settings.pdf_system_prompt}
              onChange={(e) => updateSetting('pdf_system_prompt', e.target.value)}
              rows={10}
              className="font-mono text-sm"
              placeholder="Enter the system prompt for PDF summarization..."
            />
            <p className="text-xs text-muted-foreground">
              Available placeholders: {'{pdf_description}'}, {'{product_name}'}, {'{product_description}'}, {'{max_length}'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pdf_model">AI Model</Label>
              <Select
                value={settings.pdf_model}
                onValueChange={(value) => updateSetting('pdf_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <SelectItem value="__loading__" disabled>Loading models...</SelectItem>
                  ) : availableModels.length > 0 ? (
                    <>
                      {/* OpenAI Models */}
                      {availableModels.filter(m => m.provider === 'openai').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>OpenAI</SelectLabel>
                          {availableModels.filter(m => m.provider === 'openai').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Anthropic Models */}
                      {availableModels.filter(m => m.provider === 'anthropic').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Anthropic</SelectLabel>
                          {availableModels.filter(m => m.provider === 'anthropic').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Gemini Models */}
                      {availableModels.filter(m => m.provider === 'gemini').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Google Gemini</SelectLabel>
                          {availableModels.filter(m => m.provider === 'gemini').map(model => (
                            <SelectItem key={model.id} value={model.modelId}>
                              {model.displayName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    <>
                      <SelectItem value="gpt-4o">GPT-4o (Best for PDFs)</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast, Cheap)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf_max_tokens">Max Summary Length</Label>
              <Input
                id="pdf_max_tokens"
                type="number"
                min={100}
                max={2000}
                value={settings.pdf_max_tokens}
                onChange={(e) => updateSetting('pdf_max_tokens', parseInt(e.target.value) || 512)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum characters in generated summary
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {settings.pdf_temperature?.toFixed(1) || '0.3'}</Label>
            <Slider
              value={[settings.pdf_temperature || 0.3]}
              onValueChange={([value]) => updateSetting('pdf_temperature', value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower = more consistent summaries, Higher = more creative
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset All Settings?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore all AI settings to their default values. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetSettings}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
