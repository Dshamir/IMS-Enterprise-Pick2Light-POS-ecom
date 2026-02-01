"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { generateThemeCSS, injectThemeCSS, type CustomTheme } from '@/lib/theme-generator'

interface NavigationItem {
  id: string
  name: string
  href: string | null
  icon_name: string
  parent_id: string | null
  display_order: number
  is_visible: number
  is_group: number
  badge_key: string | null
  highlight: number | null
  theme: string | null
  theme_variant: string | null
  subRoutes?: NavigationItem[]
}

export function PageThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([])
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch navigation items and custom themes on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch navigation items
        const navResponse = await fetch('/api/navigation')
        if (navResponse.ok) {
          const navData = await navResponse.json()
          setNavigationItems(navData.items || [])
        }

        // Fetch custom themes
        const themesResponse = await fetch('/api/themes')
        if (themesResponse.ok) {
          const themesData = await themesResponse.json()
          const themes = themesData.themes || []
          setCustomThemes(themes)

          // Inject CSS for all custom themes
          themes.forEach((theme: CustomTheme) => {
            if (theme.is_system_theme === 0) {
              const css = generateThemeCSS(theme)
              injectThemeCSS(css, theme.id)
            }
          })
        }
      } catch (error) {
        console.error('Failed to fetch data for theming:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Apply theme based on current pathname
  useEffect(() => {
    if (isLoading || navigationItems.length === 0) return

    // Find matching navigation item for current route
    const matchingItem = findMatchingItem(pathname, navigationItems)

    if (!matchingItem) {
      // No match found, use default theme
      applyTheme('standard', 'light')
      return
    }

    // Apply the theme from the navigation item
    const theme = matchingItem.theme || 'standard'
    const variant = matchingItem.theme_variant || 'light'

    applyTheme(theme, variant)
  }, [pathname, navigationItems, isLoading])

  return <>{children}</>
}

/**
 * Find the navigation item that matches the current pathname
 * Handles both direct matches and sub-route matches
 */
function findMatchingItem(
  pathname: string,
  items: NavigationItem[]
): NavigationItem | null {
  // Try exact match first
  for (const item of items) {
    if (item.href === pathname) {
      return item
    }

    // Check sub-routes if this is a group
    if (item.subRoutes && item.subRoutes.length > 0) {
      const subMatch = findMatchingItem(pathname, item.subRoutes)
      if (subMatch) return subMatch
    }
  }

  // Try prefix match for dynamic routes (e.g., /products/123 matches /products)
  for (const item of items) {
    if (item.href && pathname.startsWith(item.href) && item.href !== '/') {
      return item
    }

    // Check sub-routes
    if (item.subRoutes && item.subRoutes.length > 0) {
      for (const subItem of item.subRoutes) {
        if (subItem.href && pathname.startsWith(subItem.href) && subItem.href !== '/') {
          return subItem
        }
      }
    }
  }

  return null
}

/**
 * Apply the theme and variant to the document element
 */
function applyTheme(theme: string, variant: string) {
  const htmlElement = document.documentElement

  // Remove all existing theme classes
  const themeClasses = [
    'theme-standard',
    'theme-bumblebee',
    'theme-modern-punch',
    'theme-marvel',
  ]

  htmlElement.classList.remove(...themeClasses, 'dark', 'light')

  // Apply new theme class (except for standard which uses default)
  if (theme !== 'standard') {
    htmlElement.classList.add(`theme-${theme}`)
  }

  // Apply variant class
  // For bumblebee, always use dark (no light variant)
  if (theme === 'bumblebee') {
    htmlElement.classList.add('dark')
  } else {
    // For other themes, respect the variant setting
    if (variant === 'dark') {
      htmlElement.classList.add('dark')
    } else if (variant === 'light') {
      htmlElement.classList.add('light')
    } else if (variant === 'auto') {
      // Auto mode: use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      htmlElement.classList.add(prefersDark ? 'dark' : 'light')
    }
  }

  // Store current theme in localStorage for persistence
  try {
    localStorage.setItem('current-page-theme', JSON.stringify({ theme, variant }))
  } catch (error) {
    console.error('Failed to save theme preference:', error)
  }
}
