"use client"

import { Suspense } from "react"
import { KBChat } from "@/components/knowledge-base/kb-chat"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function KBChatPage() {
  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/knowledge-base">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base Chat</h1>
          <p className="text-muted-foreground">
            Chat with your knowledge base using AI
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-96 flex items-center justify-center">Loading chat...</div>}>
        <KBChat />
      </Suspense>
    </div>
  )
}
