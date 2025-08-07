import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { Loader2, AlertCircle, Video } from 'lucide-react'
import { filteredVideosAtom, videosLoadingAtom, videosErrorAtom, loadVideosAtom, ensureVideoPollingAtom } from '../store/videos'
import { SearchBar } from './SearchBar'
import { VideoCard } from './VideoCard'

export function Dashboard() {
  const [filteredVideos] = useAtom(filteredVideosAtom)
  const [loading] = useAtom(videosLoadingAtom)
  const [error] = useAtom(videosErrorAtom)
  const [, loadVideos] = useAtom(loadVideosAtom)
  const [, ensureVideoPolling] = useAtom(ensureVideoPollingAtom)

  useEffect(() => {
    loadVideos() // Initial load
    ensureVideoPolling() // Start polling for updates
  }, [loadVideos, ensureVideoPolling])

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading your videos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <p className="text-red-500 font-medium mb-2">Failed to load videos</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => loadVideos()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <SearchBar />
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Video className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No videos found</h3>
          <p className="text-muted-foreground max-w-md">
            {filteredVideos.length === 0 ? 
              "Upload your first video to get started with transcription and summarization." :
              "Try adjusting your search terms or clear the search to see all videos."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <VideoCard key={video.video_id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}