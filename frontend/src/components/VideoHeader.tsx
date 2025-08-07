import { useState } from 'react'
import { Calendar, Clock, User, AlertCircle } from 'lucide-react'
import { type Video } from '../lib/api'

interface VideoHeaderProps {
  video: Video
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatDate(dateString: string): string {
  // Format YYYYMMDD to readable date
  if (dateString.length === 8) {
    const year = dateString.slice(0, 4)
    const month = dateString.slice(4, 6)
    const day = dateString.slice(6, 8)
    return `${month}/${day}/${year}`
  }
  return dateString
}

export function VideoHeader({ video }: VideoHeaderProps) {
  const [embedError, setEmbedError] = useState(false)

  return (
    <div className="mb-8">
      {/* YouTube Video Embed */}
      <div className="aspect-video mb-6 bg-muted rounded-lg overflow-hidden max-h-96 mx-auto">
        {!embedError ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.video_id}`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => setEmbedError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <>
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Unable to load video embed</p>
                <a
                  href={`https://www.youtube.com/watch?v=${video.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  Watch on YouTube
                </a>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Video Info */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">{video.title}</h1>
        
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          {video.uploader && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>{video.uploader}</span>
            </div>
          )}
          
          {video.upload_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(video.upload_date)}</span>
            </div>
          )}
          
          {video.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(video.duration)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
