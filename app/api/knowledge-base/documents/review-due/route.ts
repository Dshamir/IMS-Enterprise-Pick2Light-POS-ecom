/**
 * Documents Due for Review API
 *
 * GET: Get documents that are due or upcoming for review
 */

import { NextResponse } from 'next/server'
import { getDocumentsDueForReview } from '@/lib/knowledge-base/document-versioning'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30', 10)

    const documents = getDocumentsDueForReview(daysAhead)

    // Categorize by urgency
    const overdue = documents.filter(d => d.daysUntilDue <= 0)
    const urgent = documents.filter(d => d.daysUntilDue > 0 && d.daysUntilDue <= 7)
    const upcoming = documents.filter(d => d.daysUntilDue > 7)

    return NextResponse.json({
      total: documents.length,
      overdue: {
        count: overdue.length,
        documents: overdue.map(d => ({
          id: d.document.id,
          title: d.document.title,
          documentNumber: d.document.document_number,
          category: d.document.category,
          daysOverdue: Math.abs(d.daysUntilDue),
          nextReviewDate: d.nextReviewDate,
        })),
      },
      urgent: {
        count: urgent.length,
        documents: urgent.map(d => ({
          id: d.document.id,
          title: d.document.title,
          documentNumber: d.document.document_number,
          category: d.document.category,
          daysUntilDue: d.daysUntilDue,
          nextReviewDate: d.nextReviewDate,
        })),
      },
      upcoming: {
        count: upcoming.length,
        documents: upcoming.map(d => ({
          id: d.document.id,
          title: d.document.title,
          documentNumber: d.document.document_number,
          category: d.document.category,
          daysUntilDue: d.daysUntilDue,
          nextReviewDate: d.nextReviewDate,
        })),
      },
    })

  } catch (error: any) {
    console.error('Error getting review due documents:', error)
    return NextResponse.json(
      { error: 'Failed to get documents due for review' },
      { status: 500 }
    )
  }
}
