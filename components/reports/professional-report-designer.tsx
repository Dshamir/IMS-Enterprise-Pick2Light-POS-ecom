'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Palette, 
  Type, 
  Table, 
  BarChart3, 
  Image, 
  Plus,
  Save,
  Eye,
  Download,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Trash2,
  Copy,
  Move,
  Layers,
  Database
} from 'lucide-react'

interface ReportElement {
  id: string
  type: 'text' | 'table' | 'chart' | 'image' | 'line'
  x: number
  y: number
  width: number
  height: number
  properties: {
    content?: string
    dataSource?: string
    selectedColumns?: string[]
    chartType?: 'bar' | 'pie' | 'line'
    fieldName?: string
    fieldType?: string
    style?: {
      fontSize?: number
      fontWeight?: string
      color?: string
      backgroundColor?: string
      textAlign?: string
    }
  }
}

interface ElementData {
  [elementId: string]: any[]
}

interface TableInfo {
  name: string
  columns: Array<{
    name: string
    type: string
  }>
}

export default function ProfessionalReportDesigner() {
  const [elements, setElements] = useState<ReportElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [reportTitle, setReportTitle] = useState('New Report')
  const [previewMode, setPreviewMode] = useState(false)
  const [elementData, setElementData] = useState<ElementData>({})
  const [selectedTable, setSelectedTable] = useState<string>('')
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      const response = await fetch('/api/reports/dynamic?action=tables')
      const data = await response.json()
      if (data.tables) {
        setTables(data.tables)
      }
    } catch (error) {
      console.error('Failed to load tables:', error)
    }
  }

  const fetchElementData = async (element: ReportElement) => {
    // Skip data fetching for basic elements without data sources
    if (!element.properties.dataSource || 
        element.type === 'image' || 
        element.type === 'line') {
      return
    }

    // Handle field elements specially
    if (element.type === 'text' && element.properties.fieldName) {
      return fetchFieldElementData(element)
    }

    try {
      console.log(`🔄 Fetching data for ${element.type} element from ${element.properties.dataSource}`)
      
      // Get table schema to build proper field list
      const tableInfo = tables.find(t => t.name === element.properties.dataSource)
      if (!tableInfo) {
        throw new Error(`Table ${element.properties.dataSource} not found in schema`)
      }
      
      // Use actual column names instead of wildcard
      const selectedColumns = element.properties.selectedColumns && element.properties.selectedColumns.length > 0
        ? element.properties.selectedColumns 
        : tableInfo.columns.slice(0, 10).map(col => col.name) // First 10 columns
      
      const query = {
        table: element.properties.dataSource,
        fields: selectedColumns.map(col => ({ 
          name: col, 
          alias: col.replace(/[^a-zA-Z0-9_]/g, '_'), 
          type: 'auto' 
        })),
        limit: 10 // Limit to 10 rows for preview
      }

      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          query
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setElementData(prev => ({
          ...prev,
          [element.id]: result.data
        }))
        console.log(`✅ Data loaded for element ${element.id}: ${result.data.length} rows`)
      } else {
        console.error(`❌ Failed to fetch data for element ${element.id}:`, result.error)
      }
    } catch (error) {
      console.error(`❌ Error fetching data for element ${element.id}:`, error)
    }
  }

  const fetchFieldElementData = async (element: ReportElement) => {
    if (!element.properties.dataSource || !element.properties.fieldName) {
      console.log(`⚠️ Skipping field data fetch for ${element.id} - missing dataSource or fieldName`)
      return
    }

    try {
      console.log(`🔄 Fetching field data for ${element.id} - Table: ${element.properties.dataSource}, Field: ${element.properties.fieldName}`)
      
      // Build correct query structure
      const fieldName = element.properties.fieldName
      const query = {
        table: element.properties.dataSource,
        fields: fieldName === '*' ? 
          [{ name: '*', alias: '*', type: 'auto' }] :
          [{ name: fieldName, alias: fieldName.replace(/[^a-zA-Z0-9_]/g, '_'), type: 'auto' }],
        limit: 1
      }

      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          query
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success && result.data.length > 0) {
        const row = result.data[0]
        let displayValue
        
        if (fieldName === '*') {
          // For wildcard, show first few field values
          const values = Object.values(row).slice(0, 3)
          displayValue = `[${values.join(', ')}...]`
        } else {
          // For specific field, get the actual value
          displayValue = row[fieldName] || row[fieldName.replace(/[^a-zA-Z0-9_]/g, '_')] || '[NULL]'
        }
        
        // Update the element content with the actual data value  
        updateElement(element.id, {
          properties: {
            ...element.properties,
            content: displayValue?.toString() || '[NULL]'
          }
        })
        console.log(`✅ Field data loaded for element ${element.id}: ${displayValue}`)
      } else {
        console.log(`⚠️ No data returned for field element ${element.id}:`, result.error || 'Empty result')
        updateElement(element.id, {
          properties: {
            ...element.properties,
            content: '[NO DATA]'
          }
        })
      }
    } catch (error) {
      console.error(`❌ Error fetching field data for element ${element.id}:`, error)
      updateElement(element.id, {
        properties: {
          ...element.properties,
          content: '[ERROR]'
        }
      })
    }
  }

  // Auto-fetch data when elements are added or data sources change
  useEffect(() => {
    elements.forEach(element => {
      // Only fetch if element has data source and hasn't been fetched yet
      if (element.properties.dataSource && !elementData[element.id]) {
        fetchElementData(element)
      }
    })
  }, [elements.length, tables.length]) // Trigger when elements or tables change

  const refreshElementData = (elementId: string) => {
    const element = elements.find(el => el.id === elementId)
    if (element) {
      // Clear existing data and refetch
      setElementData(prev => {
        const newData = { ...prev }
        delete newData[elementId]
        return newData
      })
      fetchElementData(element)
    }
  }

  const addElement = (type: ReportElement['type']) => {
    const newElement: ReportElement = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : type === 'table' ? 400 : 300,
      height: type === 'text' ? 30 : type === 'table' ? 200 : 150,
      properties: {
        content: type === 'text' ? 'New Text Element' : '',
        style: {
          fontSize: 12,
          fontWeight: 'normal',
          color: '#000000',
          backgroundColor: 'transparent',
          textAlign: 'left'
        }
      }
    }

    setElements([...elements, newElement])
    setSelectedElement(newElement.id)
  }

  const addFieldElement = (fieldName: string, fieldType: string) => {
    if (!selectedTable) {
      alert('Please select a table first')
      return
    }

    const newElement: ReportElement = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      x: 100 + (elements.length * 20), // Stagger position
      y: 100 + (elements.length * 20),
      width: fieldName === '*' ? 300 : 150,
      height: 25,
      properties: {
        content: fieldName === '*' ? `[${selectedTable}.*]` : `[${selectedTable}.${fieldName}]`,
        dataSource: selectedTable,
        fieldName: fieldName,
        fieldType: fieldType,
        style: {
          fontSize: 11,
          fontWeight: 'normal',
          color: '#000000',
          backgroundColor: 'transparent',
          textAlign: 'left'
        }
      }
    }

    setElements([...elements, newElement])
    setSelectedElement(newElement.id)
    
    // Auto-fetch data for this field element
    fetchFieldElementData(newElement)
  }

  const updateElement = (id: string, updates: Partial<ReportElement>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
    }
  }

  const selectedEl = elements.find(el => el.id === selectedElement)

  const handleElementClick = (id: string) => {
    setSelectedElement(id)
  }

  const handleElementDrag = (id: string, newX: number, newY: number) => {
    updateElement(id, { x: newX, y: newY })
  }

  const generateReport = async () => {
    try {
      console.log('Generating report with elements:', elements)
      // Here you would generate the actual report
      alert(`Report "${reportTitle}" generated successfully!\n\n${elements.length} elements included.`)
    } catch (error) {
      console.error('Failed to generate report:', error)
    }
  }

  const renderElement = (element: ReportElement) => {
    const isSelected = selectedElement === element.id
    const style: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
      backgroundColor: element.properties.style?.backgroundColor || 'transparent',
      cursor: 'move',
      padding: '4px',
      fontSize: element.properties.style?.fontSize || 12,
      fontWeight: element.properties.style?.fontWeight || 'normal',
      color: element.properties.style?.color || '#000000',
      textAlign: element.properties.style?.textAlign as any || 'left'
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault()
      setSelectedElement(element.id)
      
      const startX = e.clientX - element.x
      const startY = e.clientY - element.y

      const handleMouseMove = (e: MouseEvent) => {
        const newX = e.clientX - startX
        const newY = e.clientY - startY
        handleElementDrag(element.id, Math.max(0, newX), Math.max(0, newY))
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return (
      <div
        key={element.id}
        style={style}
        onMouseDown={handleMouseDown}
        onClick={() => handleElementClick(element.id)}
      >
        {element.type === 'text' && (
          <div 
            contentEditable={isSelected && !element.properties.fieldName} 
            suppressContentEditableWarning
            className={element.properties.fieldName ? 
              "bg-blue-50 border border-blue-200 rounded px-1 font-mono text-blue-800 min-h-4 flex items-center" : 
              "min-h-4 flex items-center"
            }
            title={element.properties.fieldName ? 
              `Field: ${element.properties.dataSource}.${element.properties.fieldName} (${element.properties.fieldType})` : 
              undefined
            }
            style={{ minHeight: '16px', lineHeight: '1.2' }}
          >
            {element.properties.content || (element.properties.fieldName ? `[${element.properties.fieldName}]` : 'Text Element')}
          </div>
        )}
        {element.type === 'table' && (
          <div className="w-full h-full border border-gray-300 bg-white overflow-auto text-xs">
            {elementData[element.id] && elementData[element.id].length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    {Object.keys(elementData[element.id][0]).slice(0, 5).map((key) => (
                      <th key={key} className="text-left p-1 border-r text-xs font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {elementData[element.id].slice(0, 8).map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      {Object.values(row).slice(0, 5).map((value, cellIdx) => (
                        <td key={cellIdx} className="p-1 border-r text-xs">
                          {value?.toString().substring(0, 15) || 'NULL'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : element.properties.dataSource ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                    <>
                      <div className="text-xs">📊 {element.properties.dataSource}</div>
                      <div className="text-xs text-gray-400 mt-1">No data loaded</div>
                    </>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-xs">📊 Data Table</div>
                  <div className="text-xs text-gray-400 mt-1">Select data source</div>
                </div>
              </div>
            )}
          </div>
        )}
        {element.type === 'chart' && (
          <div className="w-full h-full border border-gray-300 bg-white p-2">
            {elementData[element.id] && elementData[element.id].length > 0 ? (
              <div className="w-full h-full">
                <div className="text-xs font-medium mb-2 text-gray-700">
                  📈 {element.properties.chartType || 'bar'} Chart - {element.properties.dataSource}
                </div>
                <div className="w-full h-32 bg-gradient-to-r from-blue-100 to-blue-200 rounded flex items-end justify-around p-2">
                  {elementData[element.id].slice(0, 5).map((row, idx) => {
                    const values = Object.values(row).filter(v => typeof v === 'number')
                    const height = values.length > 0 ? Math.max(10, (values[0] as number) % 80 + 20) : 20
                    return (
                      <div
                        key={idx}
                        className="bg-blue-500 rounded-t"
                        style={{ 
                          height: `${height}px`, 
                          width: '12px',
                          minHeight: '8px'
                        }}
                        title={`Value: ${values[0] || 'N/A'}`}
                      />
                    )
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {elementData[element.id].length} data points
                </div>
              </div>
            ) : element.properties.dataSource ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                    <>
                      <div className="text-xs">📈 Chart</div>
                      <div className="text-xs text-gray-400 mt-1">{element.properties.dataSource}</div>
                    </>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-xs">📈 Chart</div>
                  <div className="text-xs text-gray-400 mt-1">Select data source</div>
                </div>
              </div>
            )}
          </div>
        )}
        {element.type === 'image' && (
          <div className="w-full h-full border border-gray-300 bg-gray-100 flex items-center justify-center text-sm">
            🖼️ Image
          </div>
        )}
        {element.type === 'line' && (
          <div className="w-full border-t border-gray-800" style={{ height: 1 }}>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white">
      {/* Toolbar */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-48"
                placeholder="Report Title"
              />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('text')}
                  className="flex items-center gap-1"
                >
                  <Type className="h-4 w-4" />
                  Text
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('table')}
                  className="flex items-center gap-1"
                >
                  <Table className="h-4 w-4" />
                  Table
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('chart')}
                  className="flex items-center gap-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  Chart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('image')}
                  className="flex items-center gap-1"
                >
                  <Image className="h-4 w-4" />
                  Image
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('line')}
                  className="flex items-center gap-1"
                >
                  ➖ Line
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center gap-1"
              >
                <Eye className="h-4 w-4" />
                {previewMode ? 'Design' : 'Preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateReport}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-4 min-h-[600px]">
        {/* Fields Panel */}
        <Card className="w-full lg:w-64 flex-shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Fields
            </CardTitle>
            <CardDescription>
              Drag fields to canvas or select table for Table/Chart elements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table Selection */}
            <div>
              <Label className="text-sm font-medium">Data Source</Label>
              <Select 
                value={selectedTable} 
                onValueChange={(value) => {
                  setSelectedTable(value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select table..." />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.name} value={table.name}>
                      {table.name} ({table.columns.length} fields)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Field List */}
            {selectedTable && (
              <div>
                <Label className="text-sm font-medium">Available Fields</Label>
                <div className="mt-2 max-h-80 overflow-y-auto border rounded p-2 space-y-1">
                  {tables.find(t => t.name === selectedTable)?.columns.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-blue-200"
                      onClick={() => addFieldElement(col.name, col.type)}
                      title={`Click to add ${col.name} field to canvas`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="text-xs font-mono truncate">{col.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                        {col.type}
                      </Badge>
                    </div>
                  )) || []}
                  
                  {/* Add "All Fields" option */}
                  <div
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-100 cursor-pointer border border-transparent hover:border-green-200 bg-green-50"
                    onClick={() => addFieldElement('*', 'all')}
                    title="Click to add all fields (SELECT *) to canvas"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-mono font-bold">* (All Fields)</span>
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-100">
                      SELECT *
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            
            {!selectedTable && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs">Select a table to view fields</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Design Canvas */}
        <Card className="flex-1 min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Report Canvas
            </CardTitle>
            <CardDescription>
              Drag and drop elements to design your report layout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              ref={canvasRef}
              className="relative w-full bg-white border-2 border-dashed border-gray-300 overflow-auto"
              style={{ minHeight: '400px', height: '60vh' }}
            >
              {/* Grid background */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle, #666 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />
              
              {/* Render all elements */}
              {elements.map(renderElement)}
              
              {/* Drop zone message */}
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Palette className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Click toolbar buttons to add report elements</p>
                    <p className="text-sm mt-2">Then drag them around to position</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Properties Panel */}
        <Card className="w-full lg:w-80 flex-shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedEl ? (
              <>
                <div>
                  <Label>Element Type</Label>
                  <Badge variant="secondary" className="ml-2">
                    {selectedEl.type}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={selectedEl.x}
                      onChange={(e) => updateElement(selectedEl.id, { x: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={selectedEl.y}
                      onChange={(e) => updateElement(selectedEl.id, { y: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={selectedEl.width}
                      onChange={(e) => updateElement(selectedEl.id, { width: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={selectedEl.height}
                      onChange={(e) => updateElement(selectedEl.id, { height: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>

                {selectedEl.type === 'text' && (
                  <>
                    <div>
                      <Label>Content</Label>
                      <Input
                        value={selectedEl.properties.content || ''}
                        onChange={(e) => updateElement(selectedEl.id, {
                          properties: { ...selectedEl.properties, content: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Font Size</Label>
                      <Input
                        type="number"
                        value={selectedEl.properties.style?.fontSize || 12}
                        onChange={(e) => updateElement(selectedEl.id, {
                          properties: {
                            ...selectedEl.properties,
                            style: {
                              ...selectedEl.properties.style,
                              fontSize: parseInt(e.target.value) || 12
                            }
                          }
                        })}
                      />
                    </div>
                  </>
                )}

                {(selectedEl.type === 'table' || selectedEl.type === 'chart') && (
                  <>
                    <div>
                      <Label>Data Source</Label>
                      <Select
                        value={selectedEl.properties.dataSource || ''}
                        onValueChange={(value) => {
                          updateElement(selectedEl.id, {
                            properties: { ...selectedEl.properties, dataSource: value }
                          })
                          // Auto-refresh data when source changes
                          refreshElementData(selectedEl.id)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select table..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tables.map((table) => (
                            <SelectItem key={table.name} value={table.name}>
                              {table.name} ({table.columns.length} columns)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedEl.properties.dataSource && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Data Preview</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshElementData(selectedEl.id)}
                            className="h-6 text-xs px-2"
                          >
                            Refresh
                          </Button>
                        </div>
                        
                        {elementData[selectedEl.id] && (
                          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                            ✅ {elementData[selectedEl.id].length} rows loaded
                          </div>
                        )}
                      </div>
                    )}

                    {selectedEl.type === 'chart' && (
                      <div>
                        <Label>Chart Type</Label>
                        <Select
                          value={selectedEl.properties.chartType || 'bar'}
                          onValueChange={(value) => updateElement(selectedEl.id, {
                            properties: { ...selectedEl.properties, chartType: value as 'bar' | 'pie' | 'line' }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Bar Chart</SelectItem>
                            <SelectItem value="line">Line Chart</SelectItem>
                            <SelectItem value="pie">Pie Chart</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteElement(selectedEl.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Element
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select an element to edit properties</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Elements Summary */}
      <Card className="mt-4">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Report Elements: {elements.length}</span>
            <span>Selected: {selectedEl ? selectedEl.type : 'None'}</span>
            <span>Tables Available: {tables.length}</span>
            <span>
              Data Elements: {Object.keys(elementData).length}
            </span>
          </div>
          {Object.keys(elementData).length > 0 && (
            <div className="mt-2 text-xs text-green-600">
              ✅ Elements with data: {Object.entries(elementData).map(([id, data]) => {
                const element = elements.find(el => el.id === id)
                return element ? `${element.type}(${data.length})` : ''
              }).filter(Boolean).join(', ')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}