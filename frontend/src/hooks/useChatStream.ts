import { useState, useEffect, useCallback, useRef } from 'react'
import { type ChatMessage, fetchChatHistory, askChatQuestion, subscribeToChatStream } from '../api/videos'

interface UseChatStreamResult {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  streamingResponse: string
  error: string | null
  askQuestion: (question: string) => Promise<void>
  clearError: () => void
}

export function useChatStream(videoId: string): UseChatStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState('')
  const [error, setError] = useState<string | null>(null)

  const lastMessageAdded = useRef('')

  // Load initial chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const history = await fetchChatHistory(videoId)
        setMessages(history)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat history')
      } finally {
        setIsLoading(false)
      }
    }

    loadChatHistory()
  }, [videoId])

  // Ask a question and start streaming
  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isStreaming) return

    setError(null)
    setIsStreaming(true)
    setStreamingResponse('')

    // Add user message immediately for visual feedback
    const userMessage: ChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])

    try {
      // Ask the question first
      await askChatQuestion(videoId, question)

      // Create EventSource for this specific question
      const eventSource = subscribeToChatStream(videoId)

      eventSource.onmessage = (e) => {
        const state = JSON.parse(e.data)
        console.log("State: ", state)
        setStreamingResponse(state.text)
      }

      eventSource.onopen = () => {
        console.log('Chat stream connected')
      }

      eventSource.addEventListener('token', (event) => {
        console.log('Received token event:', event.data)
        
        try {
          const token = JSON.parse(event.data)
          setStreamingResponse(prev => prev + token)
        } catch (error) {
          console.error('Failed to parse token:', error, 'Data:', event.data)
          // Fallback: use raw data if JSON parsing fails
          setStreamingResponse(prev => prev + event.data)
        }
      })


      eventSource.addEventListener('complete', () => {
        setStreamingResponse(currentResponse => {
          setIsStreaming(false)
          
          const assistantMessage: ChatMessage = { role: 'assistant', content: currentResponse }

          if (currentResponse != lastMessageAdded.current) {
            setMessages(prev => [...prev, assistantMessage])
            lastMessageAdded.current = currentResponse
          }
          
          eventSource.close()
          
          return '' 
        })
      })

      eventSource.addEventListener('error', (event) => {
        console.error('Stream error event:', event)
        try {
          setError('An error occurred during streaming')
        } catch {
          setError('An error occurred during streaming')
        }
        setIsStreaming(false)
        setStreamingResponse('')
        eventSource.close()
      })

      eventSource.onerror = (event) => {
        console.error('EventSource failed:', event)
        setError('Connection to chat stream failed')
        setIsStreaming(false)
        setStreamingResponse('')
        eventSource.close()
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ask question')
      setIsStreaming(false)
      setStreamingResponse('')
    }
  }, [videoId, isStreaming])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    streamingResponse,
    error,
    askQuestion,
    clearError
  }
}
