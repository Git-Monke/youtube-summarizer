// API base URL
const API_BASE_URL = 'http://localhost:8008'

// Video interfaces
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

export interface JobStatus {
  status: 'in_progress' | 'completed' | 'not_started'
  state?: any
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

export interface UploadResponse {
  success: boolean
  video_id: string
  message: string
}

export interface UploadErrorResponse {
  error: string
}

// Chat interfaces
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatHistoryResponse {
  messages: ChatMessage[]
}

export interface ChatQuestionRequest {
  question: string
}

export interface ChatQuestionResponse {
  success: boolean
  message: string
}

// Fetch all videos
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

// Fetch video by ID
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

// Fetch job status
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

// Fetch video summary
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

// Fetch video transcript
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

// Delete video
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

// Upload video
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

// Chat functions
export async function fetchChatHistory(videoId: string): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/${videoId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.statusText}`)
    }
    const data: ChatHistoryResponse = await response.json()
    return data.messages
  } catch (error) {
    console.error('Error fetching chat history:', error)
    throw error
  }
}

export async function askChatQuestion(videoId: string, question: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/${videoId}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to ask question: ${response.statusText}`)
    }
    
    const data: ChatQuestionResponse = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Failed to ask question')
    }
  } catch (error) {
    console.error('Error asking chat question:', error)
    throw error
  }
}

export function subscribeToChatStream(videoId: string): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/api/chat/${videoId}/subscribe`)
  return eventSource
}
