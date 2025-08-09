import { useEffect, useRef } from 'react'
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useChatStream } from '../hooks/useChatStream'

interface ChatDisplayProps {
  videoId: string
}

export function ChatDisplay({ videoId }: ChatDisplayProps) {
  const {
    messages,
    isLoading,
    isStreaming,
    streamingResponse,
    error,
    askQuestion,
    clearError
  } = useChatStream(videoId)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingResponse])

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border h-full flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-border flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Video Chat</h2>
        </div>


        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading chat...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border h-full flex flex-col overflow-auto">
      <div className="flex items-center gap-2 p-4 border-b border-border flex-shrink-0">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Video Chat</h2>
      </div>


      {/* Error Display */}
      {error && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !streamingResponse ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Ask a question about this video to get started!</p>
            <p className="text-xs mt-2">I can help you understand the content, find specific topics, or answer questions based on the video transcript.</p>
          </div>
        ) : (
          <>
            {/* Existing messages */}
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {/* Streaming response - only show if actively streaming */}
            {isStreaming && streamingResponse && (
              <ChatMessage 
                message={{ role: 'assistant', content: streamingResponse }} 
                isStreaming={true}
              />
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={askQuestion}
        disabled={isLoading}
        isStreaming={isStreaming}
      />
    </div>
  )
}
