import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, MessageSquare, Clock } from 'lucide-react'
import { fetchTranscript } from '../api/videos'

interface TranscriptDisplayProps {
  videoId: string
}

interface TranscriptSegment {
  start: number
  end: number
  text: string
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function TranscriptDisplay({ videoId }: TranscriptDisplayProps) {
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTranscript = async () => {
      setLoading(true)
      setError(null)

      try {
        const transcriptData = await fetchTranscript(videoId)
        setTranscript(transcriptData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transcript')
      } finally {
        setLoading(false)
      }
    }

    loadTranscript()
  }, [videoId])

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Transcript</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading transcript...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Transcript</h2>
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load transcript</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Transcript</h2>
      </div>
      
      {transcript && transcript.length > 0 ? (
        <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
          {transcript.map((segment, index) => (
            <div key={index} className="flex gap-3 group">
              <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 flex-shrink-0">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{formatTimestamp(segment.start)}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed flex-1">
                {segment.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground flex-1 flex items-center justify-center">No transcript available</p>
      )}
    </div>
  )
}
