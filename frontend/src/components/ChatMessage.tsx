import { User, Bot } from 'lucide-react'
import { type ChatMessage as ChatMessageType } from '../api/videos'
import { CustomMarkdown } from './ui/CustomMarkdown'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-muted text-foreground'
          } ${isStreaming ? 'animate-pulse' : ''}`}
        >
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <CustomMarkdown content={message.content} variant="compact" />
          )}
        </div>
        
        {isStreaming && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-100"></div>
            <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-200"></div>
            <span className="ml-1">Assistant is typing...</span>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      )}
    </div>
  )
}
