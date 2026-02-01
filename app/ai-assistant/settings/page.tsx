import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, Bot, Settings, Shield } from "lucide-react"
import { AIProviderSettings } from "@/components/ai/ai-provider-settings"
import { AIAgentSettings } from "@/components/ai/ai-agent-settings"

export const dynamic = "force-dynamic"

export default function AISettingsPage() {
  return (
    <main className="container mx-auto py-4 px-4 md:py-8 md:max-w-none md:w-[90%]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ai-assistant">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to AI Assistant
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            AI Settings
          </h1>
          <p className="text-muted-foreground">Configure AI providers, agents, and system preferences</p>
        </div>
      </div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            AI Agents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider Configuration</CardTitle>
              <CardDescription>
                Configure your AI service providers to enable intelligent features. At least one active provider is required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIProviderSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Agent Management</CardTitle>
              <CardDescription>
                Configure and manage AI agents that automate tasks and provide intelligent insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIAgentSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}