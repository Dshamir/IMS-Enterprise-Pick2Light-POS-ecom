'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wifi, 
  Globe, 
  Shield, 
  Settings, 
  RefreshCw, 
  Copy, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info,
  Network,
  Lock,
  Smartphone
} from 'lucide-react'

interface NetworkInfo {
  wslIP: string
  windowsIP: string
  localURLs: string[]
  lanURLs: string[]
  wanURL?: string
  ngrokStatus: 'disconnected' | 'connected' | 'error'
  lastUpdated: string
}

interface NgrokConfig {
  authToken: string
  region: string
  subdomain: string
  domain: string
  basicAuth: string
  enabled: boolean
}

export default function NetworkSettingsPage() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    wslIP: '172.17.255.193',
    windowsIP: '192.168.0.40',
    localURLs: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    lanURLs: ['http://192.168.0.40:3000'],
    ngrokStatus: 'disconnected',
    lastUpdated: new Date().toLocaleString()
  })
  
  const [ngrokConfig, setNgrokConfig] = useState<NgrokConfig>({
    authToken: '2xp5CFLpEd0Xi8KLjZ69h0lx19p_43UGFKD5EwyHYgW13KTev',
    region: 'us',
    subdomain: '',
    domain: '',
    basicAuth: 'admin:devpass123',
    enabled: false
  })
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const refreshNetworkInfo = async () => {
    setIsRefreshing(true)
    // Simulate network detection (in real implementation, this would call an API)
    setTimeout(() => {
      setNetworkInfo(prev => ({
        ...prev,
        lastUpdated: new Date().toLocaleString()
      }))
      setIsRefreshing(false)
    }, 1000)
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(label)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Network Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure development server access, IP settings, and ngrok tunnels
          </p>
        </div>
        <Button 
          onClick={refreshNetworkInfo}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Network className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="lan">
            <Wifi className="h-4 w-4 mr-2" />
            LAN Access
          </TabsTrigger>
          <TabsTrigger value="wan">
            <Globe className="h-4 w-4 mr-2" />
            WAN Access
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* System Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">WSL2 IP Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{networkInfo.wslIP}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(networkInfo.wslIP, 'WSL IP')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Windows IP Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{networkInfo.windowsIP}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(networkInfo.windowsIP, 'Windows IP')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                  <p className="text-sm text-gray-500 mt-1">{networkInfo.lastUpdated}</p>
                </div>
              </CardContent>
            </Card>

            {/* Local Access */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-5 w-5" />
                  Local Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {networkInfo.localURLs.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <code className="text-sm bg-blue-100 px-2 py-1 rounded flex-1">{url}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(url, 'Local URL')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Badge variant="outline" className="w-fit">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Always Available
                </Badge>
              </CardContent>
            </Card>

            {/* ngrok Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5" />
                  ngrok Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(networkInfo.ngrokStatus)}
                  <Badge className={getStatusColor(networkInfo.ngrokStatus)}>
                    {networkInfo.ngrokStatus.toUpperCase()}
                  </Badge>
                </div>
                {networkInfo.wanURL ? (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Public URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-green-100 px-2 py-1 rounded flex-1">{networkInfo.wanURL}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(networkInfo.wanURL!, 'WAN URL')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No active tunnel</p>
                )}
                <div className="pt-2">
                  <Button size="sm" variant="outline" className="w-full">
                    <Settings className="h-3 w-3 mr-2" />
                    Configure ngrok
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {copySuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {copySuccess} copied to clipboard!
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* LAN Access Tab */}
        <TabsContent value="lan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                LAN (Local Network) Access
              </CardTitle>
              <p className="text-sm text-gray-600">
                Access your development server from devices on the same network
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Command:</strong> <code>npm run dev:mobile</code> - Enables LAN access for mobile devices and other computers on your network
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Available LAN URLs</Label>
                  <div className="space-y-2 mt-2">
                    {networkInfo.lanURLs.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                        <code className="flex-1 text-sm">{url}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(url, 'LAN URL')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="font-medium">Mobile Device Setup</Label>
                  <div className="space-y-2 mt-2 text-sm text-gray-600">
                    <p>1. Connect your mobile device to the same WiFi network</p>
                    <p>2. Open a web browser on your mobile device</p>
                    <p>3. Navigate to: <code className="bg-gray-100 px-1 rounded">{networkInfo.lanURLs[0]}</code></p>
                    <p>4. Bookmark the URL for easy access</p>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> If connection fails, check Windows Firewall settings or run the Windows setup script as Administrator: <code>run-wsl-setup-fixed.bat</code>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WAN Access Tab */}
        <TabsContent value="wan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                WAN (Internet) Access via ngrok
              </CardTitle>
              <p className="text-sm text-gray-600">
                Expose your development server to the internet using ngrok tunnels
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security Warning:</strong> WAN access exposes your development server to the internet. Only use for development/testing purposes.
                </AlertDescription>
              </Alert>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Command:</strong> <code>npm run dev:wan_dev</code> - Starts development server with ngrok tunnel for internet access
                </AlertDescription>
              </Alert>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Authentication Issue?</strong> If ngrok fails with authentication errors, your authtoken may be expired. 
                  Visit <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" className="underline text-blue-600">ngrok dashboard</a> to get a fresh token, 
                  then run: <code className="bg-white px-1 py-0.5 rounded border">./ngrok config add-authtoken YOUR_NEW_TOKEN</code>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="font-medium">ngrok Configuration</Label>
                  <div className="space-y-3 mt-3">
                    <div>
                      <Label className="text-sm">Region</Label>
                      <Input 
                        value={ngrokConfig.region} 
                        onChange={(e) => setNgrokConfig(prev => ({ ...prev, region: e.target.value }))}
                        placeholder="us, eu, ap, au, sa, jp, in"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Basic Auth (username:password)</Label>
                      <Input 
                        value={ngrokConfig.basicAuth} 
                        onChange={(e) => setNgrokConfig(prev => ({ ...prev, basicAuth: e.target.value }))}
                        placeholder="admin:devpass123"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Subdomain (Paid plans only)</Label>
                      <Input 
                        value={ngrokConfig.subdomain} 
                        onChange={(e) => setNgrokConfig(prev => ({ ...prev, subdomain: e.target.value }))}
                        placeholder="myapp"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Free plan uses random URLs</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="font-medium">Environment Variables</Label>
                  <div className="space-y-2 mt-3 text-sm font-mono bg-gray-50 p-3 rounded">
                    <p>NGROK_REGION={ngrokConfig.region}</p>
                    <p>NGROK_AUTH={ngrokConfig.basicAuth}</p>
                    {ngrokConfig.subdomain && <p>NGROK_SUBDOMAIN={ngrokConfig.subdomain}</p>}
                  </div>
                  
                  <div className="mt-4">
                    <Label className="font-medium">Usage Examples</Label>
                    <div className="space-y-1 mt-2 text-sm font-mono bg-gray-50 p-3 rounded">
                      <p>npm run dev:wan_dev</p>
                      <p>NGROK_REGION=eu npm run dev:wan_dev</p>
                      <p>NGROK_AUTH=user:password123 npm run dev:wan_dev</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="font-medium">Quick Actions</Label>
                <div className="flex gap-3 mt-3">
                  <Button>
                    <Globe className="h-4 w-4 mr-2" />
                    Start WAN Server
                  </Button>
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    ngrok Dashboard
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Tunnel Inspector
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <p className="text-sm text-gray-600">
                Configure security measures for development server access
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> These are development security measures. Never use development servers in production environments.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="font-medium">LAN Security</Label>
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Windows Firewall</p>
                        <p className="text-sm text-gray-600">Controls network access</p>
                      </div>
                      <Badge variant="outline">System Level</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Port Forwarding</p>
                        <p className="text-sm text-gray-600">WSL2 to Windows bridging</p>
                      </div>
                      <Badge variant="outline">Configured</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="font-medium">WAN Security</Label>
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Basic Authentication</p>
                        <p className="text-sm text-gray-600">Username/password protection</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Security Headers</p>
                        <p className="text-sm text-gray-600">XSS, CSRF protection</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">HTTPS Only</p>
                        <p className="text-sm text-gray-600">ngrok provides SSL</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Enforced</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="font-medium">Security Best Practices</Label>
                <div className="space-y-2 mt-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>Always use basic authentication for WAN access</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>Monitor ngrok dashboard for suspicious activity</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>Use unique, strong passwords for authentication</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>Never expose production data via development servers</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p>Stop tunnels when not actively developing</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}