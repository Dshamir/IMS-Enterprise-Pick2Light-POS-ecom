"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, ChevronDown, ChevronUp, Tag, Building, DollarSign, Filter } from "lucide-react"

interface FilterValue {
  name: string
  count: number
}

interface PriceBucket {
  label: string
  min: number
  max: number | null
  count: number
}

interface SearchFiltersData {
  categories: FilterValue[]
  manufacturers: FilterValue[]
  priceRange: {
    min: number
    max: number
    avg: number
    itemsWithPrice: number
  }
  priceBuckets: PriceBucket[]
  totalFilters: {
    categories: number
    manufacturers: number
  }
}

export interface ActiveFilters {
  categories: string[]
  manufacturers: string[]
  priceRange: { min: number; max: number } | null
}

interface SearchFiltersProps {
  onFiltersChange: (filters: ActiveFilters) => void
  activeFilters: ActiveFilters
}

export function SearchFilters({ onFiltersChange, activeFilters }: SearchFiltersProps) {
  const [filtersData, setFiltersData] = useState<SearchFiltersData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<{
    categories: boolean
    manufacturers: boolean
    price: boolean
  }>({
    categories: true,
    manufacturers: false,
    price: false
  })

  useEffect(() => {
    fetchFilters()
  }, [])

  const fetchFilters = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/knowledge-base/search/filters')
      if (response.ok) {
        const data = await response.json()
        setFiltersData(data)
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    const newCategories = activeFilters.categories.includes(category)
      ? activeFilters.categories.filter(c => c !== category)
      : [...activeFilters.categories, category]

    onFiltersChange({
      ...activeFilters,
      categories: newCategories
    })
  }

  const toggleManufacturer = (manufacturer: string) => {
    const newManufacturers = activeFilters.manufacturers.includes(manufacturer)
      ? activeFilters.manufacturers.filter(m => m !== manufacturer)
      : [...activeFilters.manufacturers, manufacturer]

    onFiltersChange({
      ...activeFilters,
      manufacturers: newManufacturers
    })
  }

  const setPriceRange = (bucket: PriceBucket | null) => {
    onFiltersChange({
      ...activeFilters,
      priceRange: bucket ? { min: bucket.min, max: bucket.max || 999999 } : null
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      manufacturers: [],
      priceRange: null
    })
  }

  const toggleSection = (section: 'categories' | 'manufacturers' | 'price') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const activeFilterCount =
    activeFilters.categories.length +
    activeFilters.manufacturers.length +
    (activeFilters.priceRange ? 1 : 0)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading filters...
      </div>
    )
  }

  if (!filtersData) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Active Filters Row */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Active:
          </span>
          {activeFilters.categories.map(cat => (
            <Badge
              key={cat}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => toggleCategory(cat)}
            >
              <Tag className="h-3 w-3 mr-1" />
              {cat}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {activeFilters.manufacturers.map(mfg => (
            <Badge
              key={mfg}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => toggleManufacturer(mfg)}
            >
              <Building className="h-3 w-3 mr-1" />
              {mfg}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {activeFilters.priceRange && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20"
              onClick={() => setPriceRange(null)}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              ${activeFilters.priceRange.min} - ${activeFilters.priceRange.max === 999999 ? '∞' : activeFilters.priceRange.max}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearAllFilters}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Sections */}
      <div className="flex flex-wrap gap-4">
        {/* Categories */}
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => toggleSection('categories')}
          >
            <Tag className="h-3 w-3" />
            Categories ({filtersData.totalFilters.categories})
            {expandedSections.categories ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {expandedSections.categories && (
            <div className="flex flex-wrap gap-1 max-w-md">
              {filtersData.categories.map(cat => (
                <Badge
                  key={cat.name}
                  variant={activeFilters.categories.includes(cat.name) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleCategory(cat.name)}
                >
                  {cat.name}
                  <span className="ml-1 opacity-60">({cat.count})</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Manufacturers */}
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => toggleSection('manufacturers')}
          >
            <Building className="h-3 w-3" />
            Manufacturers ({filtersData.totalFilters.manufacturers})
            {expandedSections.manufacturers ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {expandedSections.manufacturers && (
            <div className="flex flex-wrap gap-1 max-w-md">
              {filtersData.manufacturers.map(mfg => (
                <Badge
                  key={mfg.name}
                  variant={activeFilters.manufacturers.includes(mfg.name) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleManufacturer(mfg.name)}
                >
                  {mfg.name}
                  <span className="ml-1 opacity-60">({mfg.count})</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Price Range */}
        {filtersData.priceBuckets.length > 0 && (
          <div className="space-y-1">
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => toggleSection('price')}
            >
              <DollarSign className="h-3 w-3" />
              Price Range
              {expandedSections.price ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {expandedSections.price && (
              <div className="flex flex-wrap gap-1">
                {filtersData.priceBuckets.map(bucket => {
                  const isActive = activeFilters.priceRange &&
                    activeFilters.priceRange.min === bucket.min &&
                    (activeFilters.priceRange.max === (bucket.max || 999999))

                  return (
                    <Badge
                      key={bucket.label}
                      variant={isActive ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setPriceRange(isActive ? null : bucket)}
                    >
                      {bucket.label}
                      <span className="ml-1 opacity-60">({bucket.count})</span>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
