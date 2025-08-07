import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Youtube, AlertCircle } from 'lucide-react'
import { uploadVideo } from '../api/videos'
import { Button } from '../components/ui/button'

export function UploadPage() {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const videoId = await uploadVideo(url.trim())
      // Navigate to video page where job progress will take over
      navigate(`/video/${videoId}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start processing')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Youtube className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-foreground">Upload Video</h1>
          </div>
          <p className="text-muted-foreground">
            Enter a YouTube URL to start processing the video for transcription and summarization.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="youtube-url" className="block text-sm font-medium text-foreground">
              YouTube URL
            </label>
            <input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting || !url.trim()}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for job to start...
              </>
            ) : (
              'Start Processing'
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Processing includes downloading, transcribing, and summarizing the video content.
          </p>
        </div>
      </div>
    </div>
  )
}