"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { AppSettings } from "@/app/actions/settings"
import { 
  updateGeneralSettings, 
  updateNotificationSettings, 
  updateDatabaseSettings, 
  updateSecuritySettings,
  resetToDefaults
} from "@/app/actions/settings"

interface SettingsFormProps {
  type: "general" | "notifications" | "database" | "security"
  initialSettings: AppSettings
  title: string
  description: string
  icon: React.ReactNode
}

export function SettingsForm({ type, initialSettings, title, description, icon }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      let result
      switch (type) {
        case "general":
          result = await updateGeneralSettings(settings)
          break
        case "notifications":
          result = await updateNotificationSettings(settings)
          break
        case "database":
          result = await updateDatabaseSettings(settings)
          break
        case "security":
          result = await updateSecuritySettings(settings)
          break
        default:
          throw new Error("Invalid settings type")
      }

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const result = await resetToDefaults()
      if (result.success) {
        toast.success(result.message)
        // Reset local state to defaults
        setSettings(initialSettings)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to reset settings")
    } finally {
      setResetting(false)
    }
  }

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const renderGeneralSettings = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input 
            id="company-name" 
            value={settings.companyName}
            onChange={(e) => updateSetting("companyName", e.target.value)}
            placeholder="Enter company name" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Default Currency</Label>
          <Select 
            value={settings.currency} 
            onValueChange={(value) => updateSetting("currency", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
              <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
              <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select 
          value={settings.timezone} 
          onValueChange={(value) => updateSetting("timezone", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC - Coordinated Universal Time</SelectItem>
            <SelectItem value="EST">EST - Eastern Standard Time</SelectItem>
            <SelectItem value="PST">PST - Pacific Standard Time</SelectItem>
            <SelectItem value="CST">CST - Central Standard Time</SelectItem>
            <SelectItem value="MST">MST - Mountain Standard Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="low-stock-threshold">Low Stock Alert Threshold</Label>
        <Input 
          id="low-stock-threshold" 
          type="number"
          value={settings.lowStockThreshold}
          onChange={(e) => updateSetting("lowStockThreshold", parseInt(e.target.value) || 0)}
          placeholder="10" 
        />
        <p className="text-sm text-muted-foreground">
          Products below this quantity will trigger low stock alerts
        </p>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Email Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Receive inventory alerts via email
          </p>
        </div>
        <Switch 
          checked={settings.emailNotifications}
          onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Low Stock Alerts</Label>
          <p className="text-sm text-muted-foreground">
            Get notified when products fall below minimum stock levels
          </p>
        </div>
        <Switch 
          checked={settings.lowStockAlerts}
          onCheckedChange={(checked) => updateSetting("lowStockAlerts", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Daily Reports</Label>
          <p className="text-sm text-muted-foreground">
            Get daily inventory summary reports
          </p>
        </div>
        <Switch 
          checked={settings.dailyReports}
          onCheckedChange={(checked) => updateSetting("dailyReports", checked)}
        />
      </div>
    </div>
  )

  const renderDatabaseSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Auto Backup</Label>
          <p className="text-sm text-muted-foreground">
            Automatically backup database daily
          </p>
        </div>
        <Switch 
          checked={settings.autoBackup}
          onCheckedChange={(checked) => updateSetting("autoBackup", checked)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="backup-retention">Backup Retention (days)</Label>
        <Input 
          id="backup-retention" 
          type="number"
          value={settings.backupRetentionDays}
          onChange={(e) => updateSetting("backupRetentionDays", parseInt(e.target.value) || 30)}
          placeholder="30" 
          className="w-24"
        />
        <p className="text-sm text-muted-foreground">
          How long to keep backup files before automatic deletion
        </p>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Two-Factor Authentication</Label>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>
        <Switch 
          checked={settings.twoFactorAuth}
          onCheckedChange={(checked) => updateSetting("twoFactorAuth", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Session Timeout</Label>
          <p className="text-sm text-muted-foreground">
            Automatically log out after inactivity
          </p>
        </div>
        <Switch 
          checked={settings.sessionTimeout}
          onCheckedChange={(checked) => updateSetting("sessionTimeout", checked)}
        />
      </div>
      {settings.sessionTimeout && (
        <div className="space-y-2">
          <Label htmlFor="session-duration">Session Duration (minutes)</Label>
          <Input 
            id="session-duration" 
            type="number"
            value={settings.sessionDuration}
            onChange={(e) => updateSetting("sessionDuration", parseInt(e.target.value) || 60)}
            placeholder="60" 
            className="w-24"
          />
          <p className="text-sm text-muted-foreground">
            How long before automatic logout due to inactivity
          </p>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (type) {
      case "general":
        return renderGeneralSettings()
      case "notifications":
        return renderNotificationSettings()
      case "database":
        return renderDatabaseSettings()
      case "security":
        return renderSecuritySettings()
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderContent()}
        
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? "Resetting..." : "Reset to Defaults"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}