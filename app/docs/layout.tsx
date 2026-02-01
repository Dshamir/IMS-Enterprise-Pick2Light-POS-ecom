import type { Metadata } from "next"
import "./docs.css"

export const metadata: Metadata = {
  title: "Documentation - Supabase Store",
  description: "Comprehensive documentation for the Supabase Store inventory management system.",
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}