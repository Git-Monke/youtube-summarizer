import { useNavigate } from 'react-router-dom'
import { Play, Clock, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react'
import { type Video } from '../api/videos'
import { cn } from '../lib/utils'

interface VideoCardProps {
  video: Video
}

const statusIcons = {
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />
}

const statusLabels = {
  done: 'Completed',
  processing: 'Processing',
  error: 'Error',
  pending: 'Pending'
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

export function VideoCard({ video }: VideoCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/video/${video.video_id}`)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-card rounded-lg border border-border overflow-hidden cursor-pointer",
        "transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
        "group"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative bg-muted overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Duration overlay */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-sm font-medium">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {/* Status indicator */}
        <div className="absolute top-2 left-2">
          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
            {statusIcons[video.status as keyof typeof statusIcons] || statusIcons.pending}
            <span className="text-xs font-medium">
              {statusLabels[video.status as keyof typeof statusLabels] || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        
        <div className="space-y-1 text-sm text-muted-foreground">
          {video.uploader && (
            <div className="flex items-center gap-1.5">
              <span>by {video.uploader}</span>
            </div>
          )}
          
          {video.upload_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(video.upload_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
