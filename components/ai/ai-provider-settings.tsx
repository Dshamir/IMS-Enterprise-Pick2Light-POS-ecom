"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bot, 
  Eye, 
  EyeOff, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Save,
  Plus,
  Loader2
} from "lucide-react"
import { aiService } from "@/lib/ai/ai-service"
import { useToast } from "@/hooks/use-toast"

interface AIProvider {
  id: string
  name: string
  display_name: string
  is_active: boolean
  api_key_encrypted?: string
  default_model: string
  status: 'configured' | 'unconfigured' | 'testing'
}

export function AIProviderSettings() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('openai')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const [isActive, setIsActive] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadProviders()
  }, [])

  useEffect(() => {
    if (providers.length > 0 && selectedProvider) {
      const provider = providers.find(p => p.name === selectedProvider)
      if (provider) {
        setSelectedModel(provider.default_model)
        setTemperature(provider.default_temperature)
        setMaxTokens(provider.default_max_tokens)
        setIsActive(provider.is_active)
        setApiKey('') // Don't show encrypted keys
      }
    }
  }, [selectedProvider, providers])

  const loadProviders = async () => {
    try {
      setIsLoading(true)
      const providersData = await aiService.getProviders()
      setProviders(providersData)
      
      if (providersData.length > 0) {
        setSelectedProvider(providersData[0].name)
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
      toast({
        title: "Error",
        description: "Failed to load AI providers",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const cleanupDuplicates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/cleanup', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Cleanup failed')
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Cleanup Complete",
          description: `Removed ${result.cleanup_results.providers.removed} duplicate providers`,
        })
        
        // Reload providers
        await loadProviders()
      } else {
        throw new Error(result.error || 'Cleanup failed')
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : "Failed to cleanup duplicates",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key before testing",
        variant: "destructive"
      })
      return
    }

    setIsTestingConnection(true)
    try {
      const currentProvider = providers.find(p => p.name === selectedProvider)
      if (!currentProvider) {
        throw new Error('Provider not found')
      }

      console.log('Testing connection for provider:', selectedProvider)

      // First save/update the provider with the new API key
      const saveResult = await aiService.saveProvider({
        name: selectedProvider,
        display_name: currentProvider.display_name,
        api_key: apiKey,
        default_model: selectedModel,
        default_temperature: temperature,
        default_max_tokens: maxTokens,
        is_active: false // Don't activate until test passes
      })

      console.log('Save result:', saveResult)

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save provider')
      }

      const providerId = saveResult.id || currentProvider.id
      console.log('Testing with provider ID:', providerId)

      // Test the connection
      const testResult = await aiService.testProviderConnection(providerId)
      console.log('Test result:', testResult)
      
      if (testResult.success) {
        toast({
          title: "Connection Successful",
          description: `AI provider is working correctly. ${testResult.details?.response_time_ms ? `Response time: ${testResult.details.response_time_ms}ms` : ''}`,
        })
        
        // Update provider status
        await loadProviders()
      } else {
        toast({
          title: "Connection Failed",
          description: testResult.error || "Unable to connect to AI provider",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Test connection error:', error)
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive"
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSaveConfiguration = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const currentProvider = providers.find(p => p.name === selectedProvider)
      if (!currentProvider) return

      const result = await aiService.saveProvider({
        name: selectedProvider,
        display_name: currentProvider.display_name,
        api_key: apiKey,
        default_model: selectedModel,
        default_temperature: temperature,
        default_max_tokens: maxTokens,
        is_active: isActive
      })

      if (result.success) {
        toast({
          title: "Configuration Saved",
          description: "AI provider settings have been saved successfully",
        })
        
        // If provider was activated, auto-assign agents
        if (isActive) {
          try {
            const assignResult = await fetch('/api/ai/agents/auto-assign', {
              method: 'POST'
            })
            
            if (assignResult.ok) {
              const assignData = await assignResult.json()
              if (assignData.success && assignData.agents_updated > 0) {
                toast({
                  title: "Agents Auto-Assigned",
                  description: `${assignData.agents_updated} agents have been assigned to this provider`,
                })
              }
            }
          } catch (error) {
            console.warn('Failed to auto-assign agents:', error)
          }
        }
        
        // Reload providers to get updated data
        await loadProviders()
        setApiKey('') // Clear the API key field
      } else {
        throw new Error(result.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Save configuration error:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Configured</Badge>
      case 'testing':
        return <Badge variant="secondary"><TestTube className="h-3 w-3 mr-1" />Testing</Badge>
      default:
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Not Configured</Badge>
    }
  }

  const currentProvider = providers.find(p => p.name === selectedProvider)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading AI providers...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Show cleanup button if there are duplicate providers */}
      {providers.length > 3 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Found {providers.length} AI providers (expected 3). This may be due to duplicate entries.</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={cleanupDuplicates}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Clean Up Duplicates
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Provider Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {providers.map((provider) => (
          <Card 
            key={provider.id} 
            className={`cursor-pointer transition-colors ${
              selectedProvider === provider.name ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedProvider(provider.name)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  {provider.display_name}
                </CardTitle>
                {getStatusBadge(provider.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Status:</span>
                  <Switch checked={provider.is_active} disabled />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Model:</span>
                  <span className="text-muted-foreground">{provider.default_model}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Provider Configuration */}
      {currentProvider && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Configure {currentProvider.display_name}
            </CardTitle>
            <CardDescription>
              Set up API credentials and configuration for {currentProvider.display_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> API keys are encrypted before storage and never transmitted in plain text.
                You can revoke and rotate keys at any time.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    placeholder={currentProvider.api_key_encrypted ? "••••••••••••••••" : "Enter your API key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Default Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProvider.name === 'openai' && (
                      <>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      </>
                    )}
                    {currentProvider.name === 'anthropic' && (
                      <>
                        <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                        <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                      </>
                    )}
                    {currentProvider.name === 'gemini' && (
                      <>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        <SelectItem value="gemini-pro-vision">Gemini Pro Vision</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min="1"
                  max="4000"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="active">Active</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch 
                    id="active" 
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active" className="text-sm text-muted-foreground">
                    Enable this provider
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={!apiKey || isTestingConnection}
              >
                {isTestingConnection ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                {isTestingConnection ? "Testing..." : "Test Connection"}
              </Button>
              
              <Button 
                onClick={handleSaveConfiguration}
                disabled={!apiKey || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="openai">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
              <TabsTrigger value="gemini">Google</TabsTrigger>
            </TabsList>
            
            <TabsContent value="openai" className="space-y-3 mt-4">
              <div className="text-sm space-y-2">
                <p><strong>1.</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 underline">OpenAI API Keys</a></p>
                <p><strong>2.</strong> Create a new secret key</p>
                <p><strong>3.</strong> Copy the key (starts with sk-...)</p>
                <p><strong>4.</strong> Paste it in the API Key field above</p>
              </div>
            </TabsContent>
            
            <TabsContent value="anthropic" className="space-y-3 mt-4">
              <div className="text-sm space-y-2">
                <p><strong>1.</strong> Visit <a href="https://console.anthropic.com/" target="_blank" className="text-blue-600 underline">Anthropic Console</a></p>
                <p><strong>2.</strong> Navigate to API Keys section</p>
                <p><strong>3.</strong> Generate a new API key</p>
                <p><strong>4.</strong> Copy the key and paste it above</p>
              </div>
            </TabsContent>
            
            <TabsContent value="gemini" className="space-y-3 mt-4">
              <div className="text-sm space-y-2">
                <p><strong>1.</strong> Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 underline">Google AI Studio</a></p>
                <p><strong>2.</strong> Create a new API key</p>
                <p><strong>3.</strong> Copy the generated key</p>
                <p><strong>4.</strong> Paste it in the API Key field above</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}