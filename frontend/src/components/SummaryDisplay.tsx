import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, FileText } from 'lucide-react'
import { fetchSummary } from '../api/videos'
import { CustomMarkdown } from './ui/CustomMarkdown'

interface SummaryDisplayProps {
  videoId: string
}

function cleanMarkdown(input: string) {
  return input.replace(/```markdown\s*([\s\S]*?)```/g, "$1");
}

export function SummaryDisplay({ videoId }: SummaryDisplayProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true)
      setError(null)

      try {
        const summaryContent = await fetchSummary(videoId)
        setSummary(cleanMarkdown(summaryContent))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load summary')
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [videoId])

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Summary</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading summary...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Summary</h2>
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load summary</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Summary</h2>
      </div>
      
      {summary ? (
        <div className="flex-1 overflow-auto min-h-0">
          <CustomMarkdown content={summary} variant="spacious" className="text-foreground" />
        </div>
      ) : (
        <p className="text-muted-foreground flex-1 flex items-center justify-center">No summary available</p>
      )}
    </div>
  )
}
