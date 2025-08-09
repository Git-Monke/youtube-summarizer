import { useState, useEffect, useRef } from 'react'
import { type JobStatus, type Video, fetchJobStatus } from '../api/videos'
import { getApiBaseUrl } from '../config/api'

interface SSEEvent {
  type: string
  data: any
}

interface JobState {
  status: string
  download_progress?: number
  transcript_buffer?: Array<{start: number, end: number, text: string}>
  summary_buffer?: string
  video?: Video
}

interface UseSSEJobStatusReturn {
  jobStatus: JobStatus | null
  jobState: JobState | null
  loading: boolean
  error: string | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  refetch: () => void
}

export function useSSEJobStatus(videoId: string | undefined): UseSSEJobStatusReturn {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [jobState, setJobState] = useState<JobState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    reconnectAttemptsRef.current = 0
  }

  const connectToSSE = (videoId: string) => {
    cleanup()
    setConnectionStatus('connecting')
    setError(null)

    const eventSource = new EventSource(`${getApiBaseUrl()}/api/summarize/${videoId}/subscribe`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnectionStatus('connected')
      reconnectAttemptsRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        // Initial state message
        const initialState: JobState = JSON.parse(event.data)
        setJobState(initialState)
        setJobStatus({
          status: 'in_progress',
          state: initialState
        })
      } catch (err) {
        console.error('Failed to parse initial SSE message:', err)
      }
    }

    eventSource.addEventListener('update', (event) => {
      try {
        const update: SSEEvent = JSON.parse(event.data)
        
        switch (update.type) {
          case 'status_update':
            setJobState(prev => prev ? { ...prev, status: update.data.status } : { status: update.data.status })
            
            // If job is completed, update jobStatus (video metadata already set by video_metadata event)
            if (update.data.status === 'success') {
              setJobStatus(prev => prev ? { ...prev, status: 'completed' } : null)
            }
            break

          case 'download_progress':
            setJobState(prev => prev ? { ...prev, download_progress: update.data.progress } : null)
            break

          case 'transcript_segment':
            setJobState(prev => {
              if (!prev) return null
              const newBuffer = [...(prev.transcript_buffer || []), update.data]
              return { ...prev, transcript_buffer: newBuffer }
            })
            break

          case 'summary_chunk':
            setJobState(prev => {
              if (!prev) return null
              const newContent = (prev.summary_buffer || '') + update.data.content
              return { ...prev, summary_buffer: newContent }
            })
            break

          case 'video_metadata':
            setJobState(prev => prev ? { ...prev, video: update.data } : { status: 'preparing', video: update.data })
            // Also update jobStatus so video metadata is immediately available
            setJobStatus(prev => prev ? { ...prev, state: {...prev.state, video: update.data }} : { 
              status: 'in_progress', 
              state: {
                video: update.data
              }
            })
            break

          case 'error':
            setError(update.data.error || 'Processing error occurred')
            setConnectionStatus('error')
            break
        }
      } catch (err) {
        console.error('Failed to parse SSE update:', err)
      }
    })

    eventSource.addEventListener('close', () => {
      setConnectionStatus('disconnected')
      cleanup()
    })

    eventSource.onerror = (_) => {
      setConnectionStatus('error')
      
      // Attempt to reconnect with exponential backoff
      const maxReconnectAttempts = 5
      const baseDelay = 1000 // 1 second
      
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseDelay * Math.pow(2, reconnectAttemptsRef.current)
        reconnectAttemptsRef.current++
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToSSE(videoId)
          }
        }, delay)
      } else {
        setError('Failed to connect to real-time updates after multiple attempts')
      }
    }
  }

  const fetchInitialData = async () => {
    if (!videoId) return

    setLoading(true)
    setError(null)

    try {
      // First, fetch the job status to see what state we're in
      const status = await fetchJobStatus(videoId)
      setJobStatus(status)

      // If processing, connect to SSE for real-time updates
      if (status.status === 'in_progress') {
        connectToSSE(videoId)
      } else {
        // For completed or not-started videos, we have all the data we need
        setConnectionStatus('disconnected')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch video data')
      setConnectionStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => {
    if (videoId) {
      cleanup()
      fetchInitialData()
    }
  }

  useEffect(() => {
    if (!videoId) return

    fetchInitialData()

    return cleanup
  }, [videoId])

  return {
    jobStatus,
    jobState,
    loading,
    error,
    connectionStatus,
    refetch
  }
}
