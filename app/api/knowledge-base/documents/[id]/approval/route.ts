/**
 * Document Approval API
 *
 * POST: Execute an approval workflow action
 * GET: Get approval status and available actions
 */

import { NextResponse } from 'next/server'
import {
  getDocument,
  getDocumentHistory,
} from '@/lib/knowledge-base/document-database'
import {
  executeApprovalAction,
  getAvailableTransitions,
  getActionLabels,
  getStatusLabel,
  type ApprovalStatus,
  type ApprovalAction,
} from '@/lib/knowledge-base/approval-workflow'

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

    const currentStatus = (document.approval_status as ApprovalStatus) || 'draft'
    const availableTransitions = getAvailableTransitions(currentStatus)
    const availableActions = getActionLabels(currentStatus)

    // Get approval-related history
    const history = getDocumentHistory(id)
    const approvalHistory = history.filter(entry =>
      ['submitted_for_review', 'approved', 'rejected', 'obsoleted', 'reverted_to_draft'].includes(entry.action)
    )

    return NextResponse.json({
      documentId: id,
      documentTitle: document.title,
      currentStatus,
      statusLabel: getStatusLabel(currentStatus),
      approvedBy: document.approved_by,
      approvedAt: document.approved_at,
      availableTransitions,
      availableActions,
      history: approvalHistory.map(entry => ({
        action: entry.action,
        previousStatus: entry.old_value,
        newStatus: entry.new_value,
        performedBy: entry.performed_by,
        performedAt: entry.performed_at,
        notes: entry.notes,
      })),
    })

  } catch (error: any) {
    console.error('Error getting approval status:', error)
    return NextResponse.json(
      { error: 'Failed to get approval status' },
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

    // Validate action
    const validActions = ['submit_for_review', 'approve', 'reject', 'obsolete', 'revert_to_draft']
    if (!body.action || !validActions.includes(body.action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Execute the approval action
    const action: ApprovalAction = {
      documentId: id,
      action: body.action,
      performedBy: body.performedBy,
      comments: body.comments,
    }

    const result = executeApprovalAction(action)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      statusLabel: getStatusLabel(result.newStatus!),
      document: result.document,
    })

  } catch (error: any) {
    console.error('Error executing approval action:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute approval action' },
      { status: 500 }
    )
  }
}
