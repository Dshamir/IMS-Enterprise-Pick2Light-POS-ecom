"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  AlertTriangle,
  BarChart3,
  Barcode,
  Bot,
  Wrench,
  ChevronRight,
  ChevronDown,
  Image,
  Home,
  Network,
  BookOpen,
  Factory,
  Hash,
  Search,
  Zap,
} from "lucide-react"
import * as LucideIcons from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"

interface MainNavigationProps {
  lowStockCount?: number
}

interface Route {
  name: string
  href: string
  icon: any
  active: boolean
  highlight?: boolean
  badge?: number
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  subRoutes?: Route[]
}

export function MainNavigation({ lowStockCount = 0 }: MainNavigationProps) {
  const pathname = usePathname()
  const [aiMenuExpanded, setAiMenuExpanded] = useState(pathname.startsWith("/ai-assistant"))
  const [settingsMenuExpanded, setSettingsMenuExpanded] = useState(pathname.startsWith("/settings"))

  // Fallback routes (original hardcoded navigation) - memoized to prevent re-creation
  const fallbackRoutes: Route[] = useMemo(() => [
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
      name: "Orders",
      href: "/orders",
      icon: ShoppingCart,
      active: pathname.startsWith("/orders"),
    },
    {
      name: "Manufacturing",
      href: "/manufacturing",
      icon: Factory,
      active: pathname.startsWith("/manufacturing"),
    },
    {
      name: "Serial Numbers",
      href: "/serial-numbers",
      icon: Hash,
      active: pathname.startsWith("/serial-numbers"),
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
      name: "Inventory Alerts",
      href: "/inventory/alerts",
      icon: AlertTriangle,
      active: pathname.startsWith("/inventory/alerts"),
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      name: "AI Assistant",
      href: "/ai-assistant",
      icon: Bot,
      active: pathname === "/ai-assistant",
      expandable: true,
      expanded: aiMenuExpanded,
      onToggle: () => setAiMenuExpanded(!aiMenuExpanded),
      subRoutes: [
        {
          name: "Custom AI Agents",
          href: "/ai-assistant/custom-agents",
          icon: Wrench,
          active: pathname === "/ai-assistant/custom-agents",
        },
        {
          name: "AI Settings",
          href: "/ai-assistant/settings",
          icon: Settings,
          active: pathname === "/ai-assistant/settings",
        }
      ]
    },
    {
      name: "Documentation",
      href: "/docs",
      icon: BookOpen,
      active: pathname.startsWith("/docs"),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
      expandable: true,
      expanded: settingsMenuExpanded,
      onToggle: () => setSettingsMenuExpanded(!settingsMenuExpanded),
      subRoutes: [
        {
          name: "Network Settings",
          href: "/settings/network",
          icon: Network,
          active: pathname === "/settings/network",
        }
      ]
    },
  ], [pathname, lowStockCount, aiMenuExpanded, setAiMenuExpanded, settingsMenuExpanded, setSettingsMenuExpanded])

  // Dynamic navigation state
  const [routes, setRoutes] = useState<Route[]>(fallbackRoutes)
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '/ai-assistant': pathname.startsWith("/ai-assistant"),
    '/settings': pathname.startsWith("/settings")
  })

  // Map icon name to icon component
  const getIcon = useCallback((iconName: string) => {
    return (LucideIcons as any)[iconName] || (LucideIcons as any).Link
  }, [])

  // Toggle group expansion
  const toggleGroup = useCallback((href: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [href]: !prev[href]
    }))
  }, [])

  // Transform navigation data from API to component format
  const transformNavigationData = useCallback((items: any[]): Route[] => {
    return items.map((item: any) => {
      const icon = getIcon(item.icon_name)
      const isGroup = item.is_group === 1
      const isExpanded = expandedGroups[item.href] || false

      // Handle badge_key for dynamic badges
      let badge: number | undefined = undefined
      if (item.badge_key === 'lowStockCount' && lowStockCount > 0) {
        badge = lowStockCount
      }

      const route: Route = {
        name: item.name,
        href: item.href || '#',
        icon,
        active: item.href === pathname || pathname.startsWith(item.href + '/'),
        highlight: item.highlight === 1,
        badge,
      }

      // Add group-specific props
      if (isGroup && item.subRoutes) {
        route.expandable = true
        route.expanded = isExpanded
        route.onToggle = () => toggleGroup(item.href)
        route.subRoutes = item.subRoutes.map((subItem: any) => ({
          name: subItem.name,
          href: subItem.href,
          icon: getIcon(subItem.icon_name),
          active: subItem.href === pathname
        }))
      }

      return route
    })
  }, [pathname, lowStockCount, expandedGroups, getIcon, toggleGroup])

  // Load navigation from API
  useEffect(() => {
    async function loadNavigation() {
      try {
        const response = await fetch('/api/navigation')
        if (response.ok) {
          const data = await response.json()
          const transformed = transformNavigationData(data.items || [])
          setRoutes(transformed)
        } else {
          console.error('Failed to load navigation, using fallback')
          setRoutes(fallbackRoutes)
        }
      } catch (error) {
        console.error('Error loading navigation:', error)
        setRoutes(fallbackRoutes)
      } finally {
        setLoading(false)
      }
    }

    loadNavigation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update active states when pathname changes
  useEffect(() => {
    setRoutes(prevRoutes =>
      prevRoutes.map(route => ({
        ...route,
        active: route.href === pathname || pathname.startsWith(route.href + '/'),
        subRoutes: route.subRoutes?.map(sub => ({
          ...sub,
          active: sub.href === pathname
        }))
      }))
    )
  }, [pathname])

  if (loading) {
    return (
      <nav className="space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
        ))}
      </nav>
    )
  }

  return (
    <nav className="space-y-1">
      {routes.map((route) => (
        <div key={route.href}>
          {route.expandable ? (
            <>
              <div className="flex items-center">
                <Link
                  href={route.href}
                  className={cn(
                    "flex items-center flex-1 px-3 py-2 text-sm rounded-md rounded-r-none",
                    route.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <route.icon className="h-4 w-4 mr-2" />
                  <span>{route.name}</span>
                  {route.badge && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                      {route.badge}
                    </span>
                  )}
                </Link>
                <button
                  onClick={route.onToggle}
                  className={cn(
                    "px-2 py-2 text-sm rounded-md rounded-l-none border-l",
                    route.active || (route.subRoutes && route.subRoutes.some(sub => sub.active))
                      ? "bg-primary text-primary-foreground border-primary-foreground/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted border-border",
                  )}
                >
                  {route.expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {route.expanded && route.subRoutes && (
                <div className="ml-6 mt-1 space-y-1">
                  {route.subRoutes.map((subRoute) => (
                    <Link
                      key={subRoute.href}
                      href={subRoute.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm rounded-md",
                        subRoute.active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <subRoute.icon className="h-4 w-4 mr-2" />
                      <span>{subRoute.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Link
              href={route.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md",
                route.active
                  ? "bg-primary text-primary-foreground"
                  : route.highlight
                    ? "text-primary hover:text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <route.icon className="h-4 w-4 mr-2" />
              <span>{route.name}</span>
              {route.badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                  {route.badge}
                </span>
              )}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
