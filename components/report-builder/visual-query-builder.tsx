'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Database, 
  Table as TableIcon, 
  Filter, 
  ArrowRight,
  Link,
  Eye,
  Settings,
  BarChart3,
  Download
} from 'lucide-react'

interface TableSchema {
  name: string
  columns: {
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
    foreignKey?: {
      table: string
      column: string
    }
  }[]
}

interface QueryField {
  id: string
  table: string
  column: string
  alias: string
  type: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'group_concat'
  visible: boolean
}

interface QueryFilter {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'like' | 'in' | 'not_in' | 'between' | 'is_null' | 'is_not_null'
  value: string
  values?: string[]
  enabled: boolean
}

interface QueryJoin {
  id: string
  type: 'inner' | 'left' | 'right' | 'full'
  table: string
  alias: string
  on: string
  enabled: boolean
}

interface QuerySort {
  id: string
  field: string
  direction: 'asc' | 'desc'
  enabled: boolean
}

interface VisualQueryBuilderProps {
  onQueryChange: (query: any) => void
  onPreview: (query: any) => void
  onSave: (query: any, name: string) => void
  initialQuery?: any
}

export default function VisualQueryBuilder({ 
  onQueryChange, 
  onPreview, 
  onSave, 
  initialQuery 
}: VisualQueryBuilderProps) {
  const [tables, setTables] = useState<TableSchema[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [tableAlias, setTableAlias] = useState<string>('')
  const [fields, setFields] = useState<QueryField[]>([])
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [joins, setJoins] = useState<QueryJoin[]>([])
  const [sorts, setSorts] = useState<QuerySort[]>([])
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [limit, setLimit] = useState<number>(100)
  const [queryName, setQueryName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('tables')
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [sqlPreview, setSqlPreview] = useState<string>('')
  const previousQueryRef = useRef<string>('')
  const { toast } = useToast()

  const generateSQLPreview = (query: any) => {
    let sql = 'SELECT '
    
    if (query.fields.length > 0) {
      sql += query.fields.map((f: any) => {
        let field = f.name
        if (f.aggregation) {
          field = `${f.aggregation.toUpperCase()}(${field})`
        }
        if (f.alias) {
          field += ` AS ${f.alias}`
        }
        return field
      }).join(', ')
    } else {
      sql += '*'
    }
    
    sql += `\nFROM ${query.table}`
    if (query.alias) {
      sql += ` AS ${query.alias}`
    }
    
    if (query.joins && query.joins.length > 0) {
      query.joins.forEach((join: any) => {
        sql += `\n${join.type.toUpperCase()} JOIN ${join.table}`
        if (join.alias) {
          sql += ` AS ${join.alias}`
        }
        sql += ` ON ${join.on}`
      })
    }
    
    if (query.filters && query.filters.length > 0) {
      sql += '\nWHERE '
      sql += query.filters.map((f: any) => {
        switch (f.operator) {
          case 'equals':
            return `${f.field} = '${f.value}'`
          case 'not_equals':
            return `${f.field} != '${f.value}'`
          case 'greater_than':
            return `${f.field} > '${f.value}'`
          case 'less_than':
            return `${f.field} < '${f.value}'`
          case 'like':
            return `${f.field} LIKE '%${f.value}%'`
          case 'is_null':
            return `${f.field} IS NULL`
          case 'is_not_null':
            return `${f.field} IS NOT NULL`
          default:
            return `${f.field} = '${f.value}'`
        }
      }).join(' AND ')
    }
    
    if (query.groupBy && query.groupBy.length > 0) {
      sql += '\nGROUP BY ' + query.groupBy.map((g: any) => g.field).join(', ')
    }
    
    if (query.orderBy && query.orderBy.length > 0) {
      sql += '\nORDER BY ' + query.orderBy.map((o: any) => `${o.field} ${o.direction.toUpperCase()}`).join(', ')
    }
    
    if (query.limit) {
      sql += `\nLIMIT ${query.limit}`
    }
    
    return sql
  }

  const generateQuery = useCallback(() => {
    if (!selectedTable) return

    const visibleFields = fields.filter(f => f.visible)
    
    // Safety check: if no fields are visible, add a default field to prevent validation errors
    let queryFields = visibleFields.map(f => ({
      name: f.column,
      alias: f.alias !== f.column ? f.alias : undefined,
      type: f.type,
      aggregation: f.aggregation
    }))
    
    // If no fields are selected, add a default field
    if (queryFields.length === 0) {
      const table = tables.find(t => t.name === selectedTable)
      if (table && table.columns.length > 0) {
        // Add the first column as a default field
        queryFields = [{
          name: table.columns[0].name,
          alias: undefined,
          type: table.columns[0].type === 'INTEGER' ? 'number' : 'string',
          aggregation: undefined
        }]
      }
    }

    const query = {
      table: selectedTable,
      alias: tableAlias || undefined,
      fields: queryFields,
      joins: joins.filter(j => j.enabled).map(j => ({
        type: j.type,
        table: j.table,
        alias: j.alias !== j.table ? j.alias : undefined,
        on: j.on
      })),
      filters: filters.filter(f => f.enabled).map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value,
        values: f.values
      })),
      groupBy: groupBy.length > 0 ? groupBy.map(g => ({ field: g })) : undefined,
      orderBy: sorts.filter(s => s.enabled).map(s => ({
        field: s.field,
        direction: s.direction
      })),
      limit: limit > 0 ? limit : undefined
    }

    // Generate SQL preview
    const sql = generateSQLPreview(query)
    setSqlPreview(sql)
    
    // Only call onQueryChange if the query has actually changed
    const queryString = JSON.stringify(query)
    if (queryString !== previousQueryRef.current) {
      previousQueryRef.current = queryString
      onQueryChange(query)
    }
  }, [selectedTable, tableAlias, fields, filters, joins, sorts, groupBy, limit, tables])

  useEffect(() => {
    loadTables()
  }, [])

  useEffect(() => {
    if (initialQuery) {
      loadFromQuery(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    generateQuery()
  }, [selectedTable, tableAlias, fields, filters, joins, sorts, groupBy, limit])

  const loadTables = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/reports/dynamic?action=tables')
      const data = await response.json()
      
      if (response.ok) {
        setTables(data.tables || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load tables',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tables',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadFieldsForTable = (tableName: string) => {
    const table = tables.find(t => t.name === tableName)
    if (!table) return

    // Auto-populate common fields when table is selected
    const autoFields = table.columns
      .filter(col => {
        // Include commonly useful fields by default
        const commonFields = ['id', 'name', 'title', 'description', 'created_at', 'updated_at']
        return commonFields.includes(col.name.toLowerCase()) || 
               col.primaryKey || 
               col.name.toLowerCase().includes('name') ||
               col.name.toLowerCase().includes('id') ||
               col.type === 'TEXT' ||
               col.type === 'VARCHAR'
      })
      .slice(0, 5) // Limit to first 5 relevant fields
      .map((col, index) => ({
        id: `field_${Date.now()}_${index}`,
        table: tableName,
        column: col.name,
        alias: col.name,
        type: col.type === 'INTEGER' ? 'number' : col.type === 'REAL' ? 'number' : 'string',
        visible: true
      }))

    // If no auto fields found, add all fields
    if (autoFields.length === 0) {
      const allFields = table.columns.slice(0, 10).map((col, index) => ({
        id: `field_${Date.now()}_${index}`,
        table: tableName,
        column: col.name,
        alias: col.name,
        type: col.type === 'INTEGER' ? 'number' : col.type === 'REAL' ? 'number' : 'string',
        visible: true
      }))
      setFields(allFields)
    } else {
      setFields(autoFields)
    }
  }

  const loadFromQuery = (query: any) => {
    // Load query configuration into the builder
    if (query.table) {
      setSelectedTable(query.table)
      setTableAlias(query.alias || '')
    }
    
    if (query.fields) {
      const queryFields = query.fields.map((field: any, index: number) => ({
        id: `field_${index}`,
        table: query.table,
        column: field.name,
        alias: field.alias || field.name,
        type: field.type || 'string',
        aggregation: field.aggregation,
        visible: true
      }))
      setFields(queryFields)
    }
    
    if (query.filters) {
      const queryFilters = query.filters.map((filter: any, index: number) => ({
        id: `filter_${index}`,
        field: filter.field,
        operator: filter.operator,
        value: filter.value?.toString() || '',
        values: filter.values,
        enabled: true
      }))
      setFilters(queryFilters)
    }
    
    if (query.joins) {
      const queryJoins = query.joins.map((join: any, index: number) => ({
        id: `join_${index}`,
        type: join.type,
        table: join.table,
        alias: join.alias || join.table,
        on: join.on,
        enabled: true
      }))
      setJoins(queryJoins)
    }
    
    if (query.orderBy) {
      const querySorts = query.orderBy.map((sort: any, index: number) => ({
        id: `sort_${index}`,
        field: sort.field,
        direction: sort.direction,
        enabled: true
      }))
      setSorts(querySorts)
    }
    
    if (query.groupBy) {
      setGroupBy(query.groupBy.map((g: any) => g.field))
    }
    
    if (query.limit) {
      setLimit(query.limit)
    }
  }


  const addField = () => {
    if (!selectedTable) return
    
    const newField: QueryField = {
      id: `field_${Date.now()}`,
      table: selectedTable,
      column: '',
      alias: '',
      type: 'string',
      visible: true
    }
    setFields([...fields, newField])
  }

  const updateField = (id: string, updates: Partial<QueryField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const addFilter = () => {
    const newFilter: QueryFilter = {
      id: `filter_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      enabled: true
    }
    setFilters([...filters, newFilter])
  }

  const updateFilter = (id: string, updates: Partial<QueryFilter>) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id))
  }

  const addJoin = () => {
    const newJoin: QueryJoin = {
      id: `join_${Date.now()}`,
      type: 'left',
      table: '',
      alias: '',
      on: '',
      enabled: true
    }
    setJoins([...joins, newJoin])
  }

  const updateJoin = (id: string, updates: Partial<QueryJoin>) => {
    setJoins(joins.map(j => j.id === id ? { ...j, ...updates } : j))
  }

  const removeJoin = (id: string) => {
    setJoins(joins.filter(j => j.id !== id))
  }

  const addSort = () => {
    const newSort: QuerySort = {
      id: `sort_${Date.now()}`,
      field: '',
      direction: 'asc',
      enabled: true
    }
    setSorts([...sorts, newSort])
  }

  const updateSort = (id: string, updates: Partial<QuerySort>) => {
    setSorts(sorts.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const removeSort = (id: string) => {
    setSorts(sorts.filter(s => s.id !== id))
  }

  const handlePreview = async () => {
    if (!selectedTable) return
    
    try {
      setIsLoading(true)
      const query = {
        table: selectedTable,
        alias: tableAlias || undefined,
        fields: fields.filter(f => f.visible).map(f => ({
          name: f.column,
          alias: f.alias !== f.column ? f.alias : undefined,
          type: f.type,
          aggregation: f.aggregation
        })),
        joins: joins.filter(j => j.enabled).map(j => ({
          type: j.type,
          table: j.table,
          alias: j.alias !== j.table ? j.alias : undefined,
          on: j.on
        })),
        filters: filters.filter(f => f.enabled).map(f => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
          values: f.values
        })),
        groupBy: groupBy.length > 0 ? groupBy.map(g => ({ field: g })) : undefined,
        orderBy: sorts.filter(s => s.enabled).map(s => ({
          field: s.field,
          direction: s.direction
        })),
        limit: Math.min(limit, 100) // Limit preview to 100 rows
      }
      
      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'preview',
          query
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setPreviewData(result.data || [])
        setActiveTab('preview')
        toast({
          title: 'Success',
          description: `Preview generated with ${result.data?.length || 0} rows`
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to generate preview',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate preview',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!queryName || !selectedTable) {
      toast({
        title: 'Error',
        description: 'Please provide a query name and select a table',
        variant: 'destructive'
      })
      return
    }
    
    const query = {
      table: selectedTable,
      alias: tableAlias || undefined,
      fields: fields.filter(f => f.visible).map(f => ({
        name: f.column,
        alias: f.alias !== f.column ? f.alias : undefined,
        type: f.type,
        aggregation: f.aggregation
      })),
      joins: joins.filter(j => j.enabled).map(j => ({
        type: j.type,
        table: j.table,
        alias: j.alias !== j.table ? j.alias : undefined,
        on: j.on
      })),
      filters: filters.filter(f => f.enabled).map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value,
        values: f.values
      })),
      groupBy: groupBy.length > 0 ? groupBy.map(g => ({ field: g })) : undefined,
      orderBy: sorts.filter(s => s.enabled).map(s => ({
        field: s.field,
        direction: s.direction
      })),
      limit: limit > 0 ? limit : undefined
    }
    
    onSave(query, queryName)
  }

  const getAvailableFields = () => {
    const allFields = [selectedTable, ...joins.map(j => j.table)]
      .filter(Boolean)
      .map(tableName => {
        const table = tables.find(t => t.name === tableName)
        return table ? table.columns.map(col => `${tableName}.${col.name}`) : []
      })
      .flat()
    
    return allFields
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visual Query Builder</h2>
          <p className="text-muted-foreground">Build queries with drag and drop interface</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePreview} disabled={isLoading || !selectedTable}>
            {isLoading ? (
              <>Loading...</>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={!queryName || !selectedTable}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="tables">Tables</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="joins">Joins</TabsTrigger>
              <TabsTrigger value="sorting">Sorting</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="tables" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Tables</CardTitle>
                  <CardDescription>Choose your main table and configure basic settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="table-select">Main Table</Label>
                      <Select value={selectedTable} onValueChange={(value) => {
                        setSelectedTable(value)
                        loadFieldsForTable(value)
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                        <SelectContent>
                          {tables.map(table => (
                            <SelectItem key={table.name} value={table.name}>
                              <div className="flex items-center gap-2">
                                <TableIcon className="h-4 w-4" />
                                {table.name}
                                <Badge variant="outline" className="ml-2">
                                  {table.columns.length} cols
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="table-alias">Table Alias (optional)</Label>
                      <Input
                        id="table-alias"
                        value={tableAlias}
                        onChange={(e) => setTableAlias(e.target.value)}
                        placeholder="e.g., p for products"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="query-name">Query Name</Label>
                      <Input
                        id="query-name"
                        value={queryName}
                        onChange={(e) => setQueryName(e.target.value)}
                        placeholder="Enter a name for this query"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Select Fields
                    <Button onClick={addField} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </CardTitle>
                  <CardDescription>Choose which fields to include in your query</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map(field => (
                    <div key={field.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Switch
                        checked={field.visible}
                        onCheckedChange={(checked) => updateField(field.id, { visible: checked })}
                      />
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <Select
                          value={field.column}
                          onValueChange={(value) => updateField(field.id, { column: value, alias: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableFields().map(fieldName => (
                              <SelectItem key={fieldName} value={fieldName}>
                                {fieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Input
                          value={field.alias}
                          onChange={(e) => updateField(field.id, { alias: e.target.value })}
                          placeholder="Alias"
                        />
                        
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateField(field.id, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={field.aggregation || 'none'}
                          onValueChange={(value) => updateField(field.id, { aggregation: value === 'none' ? undefined : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Aggregation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="sum">SUM</SelectItem>
                            <SelectItem value="avg">AVG</SelectItem>
                            <SelectItem value="count">COUNT</SelectItem>
                            <SelectItem value="min">MIN</SelectItem>
                            <SelectItem value="max">MAX</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Filters
                    <Button onClick={addFilter} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter
                    </Button>
                  </CardTitle>
                  <CardDescription>Add conditions to filter your data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filters.map(filter => (
                    <div key={filter.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Switch
                        checked={filter.enabled}
                        onCheckedChange={(checked) => updateFilter(filter.id, { enabled: checked })}
                      />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Select
                          value={filter.field}
                          onValueChange={(value) => updateFilter(filter.id, { field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableFields().map(fieldName => (
                              <SelectItem key={fieldName} value={fieldName}>
                                {fieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={filter.operator}
                          onValueChange={(value) => updateFilter(filter.id, { operator: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not Equals</SelectItem>
                            <SelectItem value="greater_than">Greater Than</SelectItem>
                            <SelectItem value="less_than">Less Than</SelectItem>
                            <SelectItem value="like">Contains</SelectItem>
                            <SelectItem value="is_null">Is Null</SelectItem>
                            <SelectItem value="is_not_null">Is Not Null</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Value"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="joins" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Table Joins
                    <Button onClick={addJoin} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Join
                    </Button>
                  </CardTitle>
                  <CardDescription>Join additional tables to your query</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {joins.map(join => (
                    <div key={join.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Switch
                        checked={join.enabled}
                        onCheckedChange={(checked) => updateJoin(join.id, { enabled: checked })}
                      />
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <Select
                          value={join.type}
                          onValueChange={(value) => updateJoin(join.id, { type: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inner">Inner Join</SelectItem>
                            <SelectItem value="left">Left Join</SelectItem>
                            <SelectItem value="right">Right Join</SelectItem>
                            <SelectItem value="full">Full Join</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={join.table}
                          onValueChange={(value) => updateJoin(join.id, { table: value, alias: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Table" />
                          </SelectTrigger>
                          <SelectContent>
                            {tables.map(table => (
                              <SelectItem key={table.name} value={table.name}>
                                {table.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Input
                          value={join.alias}
                          onChange={(e) => updateJoin(join.id, { alias: e.target.value })}
                          placeholder="Alias"
                        />
                        
                        <Input
                          value={join.on}
                          onChange={(e) => updateJoin(join.id, { on: e.target.value })}
                          placeholder="Join condition"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeJoin(join.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sorting" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Sorting & Grouping
                    <Button onClick={addSort} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sort
                    </Button>
                  </CardTitle>
                  <CardDescription>Configure sorting and grouping options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sorts.map(sort => (
                    <div key={sort.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Switch
                        checked={sort.enabled}
                        onCheckedChange={(checked) => updateSort(sort.id, { enabled: checked })}
                      />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Select
                          value={sort.field}
                          onValueChange={(value) => updateSort(sort.id, { field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableFields().map(fieldName => (
                              <SelectItem key={fieldName} value={fieldName}>
                                {fieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={sort.direction}
                          onValueChange={(value) => updateSort(sort.id, { direction: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSort(sort.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t">
                    <Label htmlFor="limit">Result Limit</Label>
                    <Input
                      id="limit"
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                      min="0"
                      max="10000"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Query Preview</CardTitle>
                  <CardDescription>Preview your query results</CardDescription>
                </CardHeader>
                <CardContent>
                  {previewData.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {previewData.length} rows
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border">
                          <thead>
                            <tr className="bg-muted">
                              {Object.keys(previewData[0] || {}).map(key => (
                                <th key={key} className="border p-2 text-left">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.slice(0, 10).map((row, index) => (
                              <tr key={index} className="hover:bg-muted/50">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="border p-2">
                                    {String(value || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewData.length > 10 && (
                        <div className="text-sm text-muted-foreground">
                          ... and {previewData.length - 10} more rows
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No preview data available. Configure your query and click Preview.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SQL Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sqlPreview}
                readOnly
                rows={15}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handlePreview} className="w-full" disabled={!selectedTable}>
                <Play className="h-4 w-4 mr-2" />
                Run Preview
              </Button>
              <Button onClick={handleSave} className="w-full" disabled={!queryName || !selectedTable}>
                <Save className="h-4 w-4 mr-2" />
                Save Query
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}