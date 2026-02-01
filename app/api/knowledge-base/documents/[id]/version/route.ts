/**
 * Document Version API
 *
 * GET: Get version history
 * POST: Bump version or set specific version
 */

import { NextResponse } from 'next/server'
import { getDocument } from '@/lib/knowledge-base/document-database'
import {
  bumpDocumentVersion,
  getVersionHistory,
  setDocumentVersion,
  checkReviewDue,
  type VersionBumpOptions,
} from '@/lib/knowledge-base/document-versioning'

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

    const versionHistory = getVersionHistory(id)
    const reviewStatus = checkReviewDue(id)

    return NextResponse.json({
      documentId: id,
      documentTitle: document.title,
      currentVersion: document.version || '1.0',
      currentRevision: document.revision_number || 1,
      versionHistory,
      reviewStatus,
    })

  } catch (error: any) {
    console.error('Error getting version info:', error)
    return NextResponse.json(
      { error: 'Failed to get version information' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const document = getDocument(id)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Determine action type
    if (body.setVersion) {
      // Set specific version
      const updated = setDocumentVersion(
        id,
        body.setVersion,
        body.updatedBy,
        body.notes
      )

      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to set version' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        previousVersion: document.version,
        newVersion: body.setVersion,
        document: updated,
      })
    }

    // Bump version
    const bumpType = body.bumpType || 'minor'
    if (!['major', 'minor', 'patch'].includes(bumpType)) {
      return NextResponse.json(
        { error: 'Invalid bump type. Must be: major, minor, or patch' },
        { status: 400 }
      )
    }

    const options: VersionBumpOptions = {
      type: bumpType,
      notes: body.notes,
      changesSummary: body.changesSummary,
      updatedBy: body.updatedBy,
    }

    const updated = bumpDocumentVersion(id, options)

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to bump version' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      previousVersion: document.version,
      newVersion: updated.version,
      revision: updated.revision_number,
      document: updated,
    })

  } catch (error: any) {
    console.error('Error updating version:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update version' },
      { status: 500 }
    )
  }
}
