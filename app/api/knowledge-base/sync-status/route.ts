/**
 * Knowledge Base Sync Status API
 *
 * GET: Get sync status between SQLite and ChromaDB
 * POST: Repair sync issues (regenerate missing embeddings)
 */

import { NextResponse } from 'next/server'
import {
  getSyncStatus,
  repairSyncIssues,
  checkKBVectorSearchHealth
} from '@/lib/knowledge-base/kb-vector-search'

export async function GET() {
  try {
    const [health, syncStatus] = await Promise.all([
      checkKBVectorSearchHealth(),
      getSyncStatus()
    ])

    return NextResponse.json({
      health,
      sync: syncStatus,
      recommendations: getRecommendations(health, syncStatus)
    })
  } catch (error: any) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: `Failed to get sync status: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || 'repair'

    if (action === 'repair') {
      const result = await repairSyncIssues((message) => {
        console.log('[Sync Repair]', message)
      })

      return NextResponse.json({
        success: true,
        action: 'repair',
        result,
        message: `Repaired ${result.itemsFixed} items, regenerated ${result.itemsRegenerated} embeddings`
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported: repair' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error in sync repair:', error)
    return NextResponse.json(
      { error: `Sync repair failed: ${error.message}` },
      { status: 500 }
    )
  }
}

function getRecommendations(
  health: Awaited<ReturnType<typeof checkKBVectorSearchHealth>>,
  syncStatus: Awaited<ReturnType<typeof getSyncStatus>>
): string[] {
  const recommendations: string[] = []

  if (!health.available) {
    if (health.chromaStatus !== 'healthy') {
      recommendations.push('ChromaDB is not running. Start it with: npm run chromadb')
    }
    if (health.openaiStatus !== 'configured') {
      recommendations.push('OpenAI API key not configured. Set OPENAI_API_KEY in .env.local')
    }
  }

  if (syncStatus.syncStatus === 'out_of_sync') {
    recommendations.push(
      `${syncStatus.missingFromChroma} items are marked as having embeddings but are missing from ChromaDB. Run repair to fix.`
    )
  }

  if (syncStatus.sqliteWithoutEmbedding > 0) {
    recommendations.push(
      `${syncStatus.sqliteWithoutEmbedding} KB items don't have embeddings. Click "Generate Embeddings" in KB settings.`
    )
  }

  if (health.itemCount === 0 && syncStatus.sqliteTotal > 0) {
    recommendations.push(
      'ChromaDB collection is empty but KB has items. Generate embeddings for all items.'
    )
  }

  return recommendations
}
