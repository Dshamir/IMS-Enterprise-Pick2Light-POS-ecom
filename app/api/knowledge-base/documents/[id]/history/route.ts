/**
 * Document History/Audit Log API
 *
 * GET: Get audit history for a document
 */

import { NextResponse } from 'next/server'
import {
  getDocument,
  getDocumentHistory,
} from '@/lib/knowledge-base/document-database'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const document = getDocument(id)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const history = getDocumentHistory(id)

    return NextResponse.json({
      documentId: id,
      documentTitle: document.title,
      total: history.length,
      entries: history.map(entry => ({
        id: entry.id,
        action: entry.action,
        fieldChanged: entry.field_changed,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        performedBy: entry.performed_by,
        performedAt: entry.performed_at,
        notes: entry.notes,
      }))
    })

  } catch (error: any) {
    console.error('Error getting document history:', error)
    return NextResponse.json(
      { error: 'Failed to get document history' },
      { status: 500 }
    )
  }
}
