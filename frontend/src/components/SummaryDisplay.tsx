import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, FileText, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { fetchSummary } from '../api/videos'

interface SummaryDisplayProps {
  videoId: string
}

// Utility function to process timestamps in content
const processTimestamps = (content: any): any => {
  if (typeof content === 'string') {
    const timestampRegex = /\[(\d+:\d+)\]/g;
    const parts = content.split(timestampRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a timestamp - match the TranscriptDisplay styling
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground mx-1"
          >
            <Clock className="h-3 w-3" />
            <span className="font-mono">{part}</span>
          </span>
        );
      }
      return part;
    });
  }
  return content;
};

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
          <div className="prose prose-sm max-w-none text-foreground">
            <ReactMarkdown
              components={{
                // Custom styling for list items with timestamp support
                li: ({ children }) => (
                  <li className="text-foreground mb-2">
                    {Array.isArray(children) 
                      ? children.map(child => processTimestamps(child))
                      : processTimestamps(children)}
                  </li>
                ),
                // Style paragraphs with timestamp support
                p: ({ children }) => (
                  <p className="text-foreground mb-4">
                    {Array.isArray(children) 
                      ? children.map(child => processTimestamps(child))
                      : processTimestamps(children)}
                  </p>
                ),
                // Style H2 headers
                h2: ({ children }) => (
                  <h2 className="text-foreground text-xl font-semibold mb-4 mt-6 pb-2 border-b border-border">
                    {children}
                  </h2>
                ),
                // Style unordered lists
                ul: ({ children }) => (
                  <ul className="space-y-2 mb-6 list-disc list-outside ml-4">
                    {children}
                  </ul>
                ),
                // Style ordered lists (numbered)
                ol: ({ children }) => (
                  <ol className="space-y-2 mb-6 list-decimal list-outside ml-4">
                    {children}
                  </ol>
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground flex-1 flex items-center justify-center">No summary available</p>
      )}
    </div>
  )
}
