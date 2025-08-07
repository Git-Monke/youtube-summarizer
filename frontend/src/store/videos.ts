import { atom } from 'jotai'
import { type Video, fetchVideos } from '../api/videos'

// Atoms for video data
export const videosAtom = atom<Video[]>([])
export const videosLoadingAtom = atom(false)
export const videosErrorAtom = atom<string | null>(null)

// Search functionality
export const searchQueryAtom = atom('')

// Video polling
const videoPollingIntervalAtom = atom<NodeJS.Timeout | null>(null)

// Filtered videos based on search
export const filteredVideosAtom = atom((get) => {
  const videos = get(videosAtom)
  const query = get(searchQueryAtom).toLowerCase().trim()
  
  if (!query) return videos
  
  return videos.filter(video => 
    video.title.toLowerCase().includes(query) ||
    video.uploader?.toLowerCase().includes(query) ||
    video.video_id.toLowerCase().includes(query)
  )
})

// Derived atom for loading videos
export const loadVideosAtom = atom(
  null,
  async (_, set) => {
    set(videosLoadingAtom, true)
    set(videosErrorAtom, null)
    
    try {
      const videos = await fetchVideos()
      set(videosAtom, videos)
    } catch (error) {
      set(videosErrorAtom, error instanceof Error ? error.message : 'Failed to load videos')
    } finally {
      set(videosLoadingAtom, false)
    }
  }
)

// Video polling atom - starts polling if not already running
export const ensureVideoPollingAtom = atom(
  null,
  async (get, set) => {
    const currentInterval = get(videoPollingIntervalAtom)
    if (currentInterval) return // Already running
    
    const interval = setInterval(async () => {
      try {
        const videos = await fetchVideos()
        set(videosAtom, videos)
      } catch (error) {
        console.error('Video polling failed:', error)
      }
    }, 2000)
    
    set(videoPollingIntervalAtom, interval)
  }
)
