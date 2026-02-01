"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  AlertTriangle,
  BarChart3,
  Barcode,
  Menu,
  X,
  Search,
  Camera,
  Bot,
  Home,
  Image,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface MobileNavigationProps {
  lowStockCount?: number
}

export function MobileNavigation({ lowStockCount = 0 }: MobileNavigationProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)

  const routes = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      active: pathname === "/",
    },
    {
      name: "AI Command Center",
      href: "/command-center",
      icon: Zap,
      active: pathname.startsWith("/command-center"),
      highlight: true,
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      name: "Products",
      href: "/products",
      icon: Package,
      active: pathname.startsWith("/products"),
    },
    {
      name: "AI Image Cataloging",
      href: "/image-cataloging",
      icon: Image,
      active: pathname.startsWith("/image-cataloging"),
    },
    {
      name: "Scan Barcode",
      href: "/scan",
      icon: Barcode,
      active: pathname === "/scan",
      highlight: true,
    },
    {
      name: "Pick2Light Search",
      href: "/pick2light",
      icon: Search,
      active: pathname.startsWith("/pick2light"),
    },
    {
      name: "Search",
      href: "/search",
      icon: Camera,
      active: pathname === "/search",
    },
    {
      name: "Orders",
      href: "/orders",
      icon: ShoppingCart,
      active: pathname.startsWith("/orders"),
    },
    {
      name: "Customers",
      href: "/customers",
      icon: Users,
      active: pathname.startsWith("/customers"),
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart3,
      active: pathname.startsWith("/reports"),
    },
    {
      name: "AI Assistant",
      href: "/ai-assistant",
      icon: Bot,
      active: pathname.startsWith("/ai-assistant"),
    },
    {
      name: "Inventory Alerts",
      href: "/inventory/alerts",
      icon: AlertTriangle,
      active: pathname.startsWith("/inventory/alerts"),
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ]

  // Close mobile nav on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  if (!isMobile) return null

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="container flex h-14 items-center px-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Inventory System</h1>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/scan">
                  <Barcode className="h-5 w-5" />
                  <span className="sr-only">Scan</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/search">
                  <Camera className="h-5 w-5" />
                  <span className="sr-only">Camera Search</span>
                </Link>
              </Button>
            </div>

            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              
              <nav className="mt-6">
                <div className="space-y-1">
                  {routes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-3 text-base rounded-lg transition-colors",
                        route.active
                          ? "bg-primary text-primary-foreground"
                          : route.highlight
                            ? "text-primary hover:text-primary-foreground hover:bg-primary/90"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <route.icon className="h-5 w-5 mr-3" />
                      <span className="flex-1">{route.name}</span>
                      {route.badge && (
                        <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-1">
                          {route.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="grid grid-cols-5 gap-1 p-1">
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors",
              pathname === "/"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5 mb-1" />
            <span>Home</span>
          </Link>
          
          <Link
            href="/products"
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors",
              pathname.startsWith("/products")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Package className="h-5 w-5 mb-1" />
            <span>Products</span>
          </Link>
          
          <Link
            href="/scan"
            className="flex flex-col items-center justify-center py-2 px-1 text-xs text-primary"
          >
            <div className="bg-primary text-primary-foreground rounded-full p-2 mb-1">
              <Barcode className="h-5 w-5" />
            </div>
            <span>Scan</span>
          </Link>
          
          <Link
            href="/search"
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors",
              pathname === "/search"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-5 w-5 mb-1" />
            <span>Search</span>
          </Link>
          
          <Link
            href="/inventory/alerts"
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors relative",
              pathname.startsWith("/inventory/alerts")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-5 w-5 mb-1" />
            <span>Alerts</span>
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </>
  )
}