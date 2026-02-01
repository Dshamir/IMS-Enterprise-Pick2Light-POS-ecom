"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  Zap,
  Brain,
  Box,
  Target,
  Mic,
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react"

interface ConfigEntry {
  id: string
  key: string
  value: string
  value_type: 'string' | 'number' | 'boolean' | 'json'
  description: string
  category: string
}

interface CommandCenterFeature {
  id: string
  feature_key: string
  feature_name: string
  feature_description: string
  is_enabled: boolean
  icon_name: string
}

export function CommandCenterSettings() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, ConfigEntry>>({})
  const [features, setFeatures] = useState<CommandCenterFeature[]>([])

  // Load configuration and features
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      // Fetch config
      const configRes = await fetch('/api/command-center/config')
      if (configRes.ok) {
        const configData = await configRes.json()
        const configMap: Record<string, ConfigEntry> = {}
        configData.forEach((entry: ConfigEntry) => {
          configMap[entry.key] = entry
        })
        setConfig(configMap)
      }

      // Fetch features
      const featuresRes = await fetch('/api/command-center/features')
      if (featuresRes.ok) {
        const featuresData = await featuresRes.json()
        setFeatures(featuresData)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load Command Center settings"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateConfig = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/command-center/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      if (!response.ok) {
        throw new Error('Failed to update configuration')
      }

      // Update local state
      setConfig(prev => ({
        ...prev,
        [key]: { ...prev[key], value }
      }))

      toast({
        title: "Success",
        description: `Updated ${key}`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update configuration"
      })
    }
  }

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/command-center/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_key: featureKey, is_enabled: enabled })
      })

      if (!response.ok) {
        throw new Error('Failed to update feature')
      }

      // Update local state
      setFeatures(prev =>
        prev.map(f =>
          f.feature_key === featureKey ? { ...f, is_enabled: enabled } : f
        )
      )

      toast({
        title: "Success",
        description: `${enabled ? 'Enabled' : 'Disabled'} feature`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update feature"
      })
    }
  }

  const getConfigValue = (key: string): string => {
    return config[key]?.value || ''
  }

  const getConfigBoolean = (key: string): boolean => {
    return config[key]?.value === 'true'
  }

  const getFeatureIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      LayoutDashboard: Settings,
      Box: Box,
      Target: Target,
      Zap: Zap,
      Mic: Mic,
      Brain: Brain
    }
    const Icon = icons[iconName] || Settings
    return <Icon className="h-5 w-5" />
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Master Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Command Center
          </CardTitle>
          <CardDescription>
            Master control for AI Command Center module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Command Center</Label>
              <p className="text-sm text-muted-foreground">
                Activate or deactivate the entire AI Command Center module
              </p>
            </div>
            <Switch
              checked={getConfigBoolean('enabled')}
              onCheckedChange={(checked) => updateConfig('enabled', String(checked))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Features Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Available Features</CardTitle>
          <CardDescription>
            Enable or disable specific Command Center features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getFeatureIcon(feature.icon_name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-base font-semibold">
                        {feature.feature_name}
                      </Label>
                      {feature.is_enabled && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {feature.feature_description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={feature.is_enabled}
                  onCheckedChange={(checked) =>
                    toggleFeature(feature.feature_key, checked)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Settings</CardTitle>
          <CardDescription>
            Configure real-time updates and performance thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Refresh Interval (milliseconds)</Label>
            <Input
              type="number"
              value={getConfigValue('refresh_interval_ms')}
              onChange={(e) => updateConfig('refresh_interval_ms', e.target.value)}
              onBlur={(e) => {
                if (e.target.value && Number(e.target.value) >= 500) {
                  updateConfig('refresh_interval_ms', e.target.value)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              How often real-time data refreshes (minimum 500ms, recommended 1000ms)
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Accuracy Threshold (%)</Label>
            <Input
              type="number"
              value={getConfigValue('accuracy_threshold')}
              onChange={(e) => updateConfig('accuracy_threshold', e.target.value)}
              onBlur={(e) => {
                if (e.target.value && Number(e.target.value) >= 0 && Number(e.target.value) <= 100) {
                  updateConfig('accuracy_threshold', e.target.value)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Minimum acceptable accuracy percentage (0-100)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure autopilot and automation behaviors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Autopilot</Label>
              <p className="text-sm text-muted-foreground">
                Allow automated actions without manual approval
              </p>
            </div>
            <Switch
              checked={getConfigBoolean('autopilot_enabled')}
              onCheckedChange={(checked) => updateConfig('autopilot_enabled', String(checked))}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Max Concurrent Automations</Label>
            <Input
              type="number"
              value={getConfigValue('max_concurrent_automations')}
              onChange={(e) => updateConfig('max_concurrent_automations', e.target.value)}
              onBlur={(e) => {
                if (e.target.value && Number(e.target.value) >= 1) {
                  updateConfig('max_concurrent_automations', e.target.value)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of automation rules that can execute simultaneously
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice & AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Voice & AI Settings
          </CardTitle>
          <CardDescription>
            Configure voice commands and AI integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Voice Commands</Label>
              <p className="text-sm text-muted-foreground">
                Activate voice control using Web Speech API
              </p>
            </div>
            <Switch
              checked={getConfigBoolean('voice_commands_enabled')}
              onCheckedChange={(checked) => updateConfig('voice_commands_enabled', String(checked))}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable 3D View</Label>
              <p className="text-sm text-muted-foreground">
                Show 3D warehouse visualization
              </p>
            </div>
            <Switch
              checked={getConfigBoolean('3d_view_enabled')}
              onCheckedChange={(checked) => updateConfig('3d_view_enabled', String(checked))}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>AI Agent ID</Label>
            <Input
              type="text"
              value={getConfigValue('ai_agent_id')}
              onChange={(e) => updateConfig('ai_agent_id', e.target.value)}
              placeholder="Leave blank for default agent"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Specify a custom AI agent for Command Center analysis
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Alert Email</Label>
            <Input
              type="email"
              value={getConfigValue('alert_email')}
              onChange={(e) => updateConfig('alert_email', e.target.value)}
              placeholder="email@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Email address for critical Command Center alerts
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={loadSettings} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload Settings
        </Button>
      </div>
    </div>
  )
}
