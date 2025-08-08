import { User, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Clock } from 'lucide-react'
import { type ChatMessage as ChatMessageType } from '../api/videos'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

// Utility function to process timestamps in content (reuse from SummaryDisplay)
const processTimestamps = (content: any): any => {
  if (typeof content === 'string') {
    const timestampRegex = /\[(\d+:\d+)\]/g;
    const parts = content.split(timestampRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a timestamp - match the TranscriptDisplay styling
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground mx-1"
          >
            <Clock className="h-3 w-3" />
            <span className="font-mono">{part}</span>
          </span>
        );
      }
      return part;
    });
  }
  return content;
};

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
            <div className="prose prose-sm max-w-none text-inherit">
              <ReactMarkdown
                components={{
                  // Style paragraphs with timestamp support
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">
                      {Array.isArray(children) 
                        ? children.map(child => processTimestamps(child))
                        : processTimestamps(children)}
                    </p>
                  ),
                  // Style list items with timestamp support
                  li: ({ children }) => (
                    <li className="mb-1">
                      {Array.isArray(children) 
                        ? children.map(child => processTimestamps(child))
                        : processTimestamps(children)}
                    </li>
                  ),
                  // Style H2 headers
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold mb-2 mt-3 pb-1 border-b border-border/20">
                      {children}
                    </h2>
                  ),
                  // Style unordered lists
                  ul: ({ children }) => (
                    <ul className="space-y-1 mb-2 list-disc list-outside ml-4">
                      {children}
                    </ul>
                  ),
                  // Style ordered lists
                  ol: ({ children }) => (
                    <ol className="space-y-1 mb-2 list-decimal list-outside ml-4">
                      {children}
                    </ol>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
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
