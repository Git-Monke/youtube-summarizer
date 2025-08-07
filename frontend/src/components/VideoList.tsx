import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { useNavigate } from 'react-router-dom'
import { Video, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { videosAtom, videosLoadingAtom, videosErrorAtom, loadVideosAtom, ensureVideoPollingAtom } from '../store/videos'
import { cn } from '../lib/utils'

const statusIcons = {
  done: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  processing: <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />,
  error: <AlertCircle className="h-3 w-3 text-red-500" />,
  pending: <Clock className="h-3 w-3 text-yellow-500" />
}

export function VideoList() {
  const [videos] = useAtom(videosAtom)
  const [loading] = useAtom(videosLoadingAtom)
  const [error] = useAtom(videosErrorAtom)
  const [, loadVideos] = useAtom(loadVideosAtom)
  const [, ensureVideoPolling] = useAtom(ensureVideoPollingAtom)
  const navigate = useNavigate()

  useEffect(() => {
    loadVideos() // Initial load
    ensureVideoPolling() // Start polling for updates
  }, [loadVideos, ensureVideoPolling])

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sidebar-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading videos...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load videos</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <h3 className="px-4 text-xs font-semibold text-sidebar-muted-foreground uppercase tracking-wider">
        Videos ({videos.length})
      </h3>
      
      {videos.length === 0 ? (
        <div className="px-4 py-2">
          <p className="text-sm text-sidebar-muted-foreground">No videos yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {videos.map((video) => (
            <button
              key={video.video_id}
              onClick={() => handleVideoClick(video.video_id)}
              className={cn(
                "w-full px-4 py-2 text-left hover:bg-sidebar-accent transition-colors",
                "flex items-start gap-2 group"
              )}
            >
              <Video className="h-4 w-4 text-sidebar-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                <div className="h-3 w-3">

                  {statusIcons[video.status as keyof typeof statusIcons] || statusIcons.pending}
                </div>
                  <span className="text-sm font-medium text-sidebar-foreground w-full truncate">
                    {video.title}
                  </span>
                </div>
                {video.uploader && (
                  <p className="text-xs text-sidebar-muted-foreground truncate mt-0.5">
                    by {video.uploader}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
