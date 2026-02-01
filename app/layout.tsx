import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { PageThemeProvider } from "@/components/page-theme-provider"
import { Toaster } from "sonner"
import { MainNavigation } from "./components/main-navigation"
import { ScanFAB } from "./components/scan-fab"
import { MobileNavigation } from "@/components/mobile-navigation"
import { getLowStockProducts } from "./actions/inventory-transactions"
import { AIChatWidget } from "@/components/ai/ai-chat-widget"

// Force CSS to load by importing it multiple ways
import "../app/globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Inventory Management System",
  description: "A comprehensive inventory management system",
  generator: 'v0.dev'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get low stock count for navigation badge
  const { products: lowStockProducts } = await getLowStockProducts()
  const lowStockCount = lowStockProducts?.length || 0

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PageThemeProvider>
            <div className="flex min-h-screen">
              {/* Desktop Sidebar */}
              <div className="w-64 border-r p-4 hidden md:block">
                <div className="text-xl font-bold mb-6">Inventory System</div>
                <MainNavigation lowStockCount={lowStockCount} />
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-auto">
                <MobileNavigation lowStockCount={lowStockCount} />
                <main className="pb-16 md:pb-0">{children}</main>
              </div>
            </div>

            {/* Desktop FAB (hidden on mobile) */}
            <div className="hidden md:block">
              <ScanFAB />
            </div>

            <Toaster position="top-right" />

            {/* Global AI Chat Widget */}
            <AIChatWidget />
          </PageThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

