import { API_BASE_URL } from '../config/api'

export interface Video {
  video_id: string
  title: string
  status: string
  duration?: number
  uploader?: string
  upload_date?: string
  thumbnail_url?: string
  webpage_url?: string
  transcript_filepath?: string
}

export interface VideosResponse {
  videos: Video[]
}

export async function fetchVideos(): Promise<Video[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos`)
    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.statusText}`)
    }
    const data: VideosResponse = await response.json()
    return data.videos
  } catch (error) {
    console.error('Error fetching videos:', error)
    return []
  }
}

export async function fetchVideoById(videoId: string): Promise<Video | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch video: ${response.statusText}`)
    }
    const data = await response.json()
    return data.video
  } catch (error) {
    console.error('Error fetching video:', error)
    return null
  }
}

export interface JobStatus {
  status: 'in_progress' | 'completed' | 'not_started'
  state?: any
  video?: Video
}

export interface SummaryResponse {
  content: string
}

export interface TranscriptResponse {
  transcript: Array<{
    start: number
    end: number
    text: string
  }>
}

export async function fetchJobStatus(videoId: string): Promise<JobStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/summary/${videoId}/status`)
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching job status:', error)
    throw error
  }
}

export async function fetchSummary(videoId: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/summary/${videoId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.statusText}`)
    }
    const data: SummaryResponse = await response.json()
    return data.content
  } catch (error) {
    console.error('Error fetching summary:', error)
    throw error
  }
}

export async function fetchTranscript(videoId: string): Promise<Array<{start: number, end: number, text: string}>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcript/${videoId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript: ${response.statusText}`)
    }
    const data: TranscriptResponse = await response.json()
    return data.transcript
  } catch (error) {
    console.error('Error fetching transcript:', error)
    throw error
  }
}

export async function deleteVideo(videoId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`Failed to delete video: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error deleting video:', error)
    throw error
  }
}

export interface UploadResponse {
  success: boolean
  video_id: string
  message: string
}

export interface UploadErrorResponse {
  error: string
}

export async function uploadVideo(url: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to upload video: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }
    
    if (!data.success || !data.video_id) {
      throw new Error('Invalid response from server')
    }
    
    return data.video_id
  } catch (error) {
    console.error('Error uploading video:', error)
    throw error
  }
}
