import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, Settings, Bell, Database, Shield, Router, Zap, Menu, Palette } from "lucide-react"
import { SettingsForm } from "@/components/settings-form"
import { DatabaseManagement } from "@/components/database-management"
import { WLEDDeviceManager } from "@/components/wled/wled-device-manager"
import { CommandCenterSettings } from "@/components/command-center/command-center-settings"
import { NavigationEditor } from "@/components/navigation/navigation-editor"
import { ThemeManager } from "@/components/themes/theme-manager"
import { getSettings } from "@/app/actions/settings"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your inventory management system</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Navigation
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="command-center" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Command Center
          </TabsTrigger>
          <TabsTrigger value="led-devices" className="flex items-center gap-2">
            <Router className="h-4 w-4" />
            LED Devices
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <SettingsForm 
            type="general" 
            initialSettings={settings}
            title="General Settings"
            description="Configure basic application settings"
            icon={<Settings className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <SettingsForm
            type="notifications"
            initialSettings={settings}
            title="Notification Settings"
            description="Configure when and how you receive alerts"
            icon={<Bell className="h-5 w-5" />}
          />
        </TabsContent>

        <TabsContent value="navigation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Navigation Menu Editor
              </CardTitle>
              <CardDescription>
                Drag and drop to reorder, create groups, and customize your navigation menu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NavigationEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Management
              </CardTitle>
              <CardDescription>
                Create, edit, and manage custom color themes for your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="command-center">
          <CommandCenterSettings />
        </TabsContent>

        <TabsContent value="led-devices">
          <WLEDDeviceManager />
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Management
              </CardTitle>
              <CardDescription>
                Manage database configuration, backups, and monitor connection status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DatabaseManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <SettingsForm 
            type="security" 
            initialSettings={settings}
            title="Security Settings"
            description="Configure security and access controls"
            icon={<Shield className="h-5 w-5" />}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}