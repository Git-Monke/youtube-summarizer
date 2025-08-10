import { Bot } from 'lucide-react'

export function ThinkingMessage() {
  return (
    <div className="flex gap-3 mb-4 justify-start">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
        <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
      
      <div className="max-w-[80%]">
        <div className="rounded-lg px-4 py-2 bg-muted text-foreground">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Assistant is thinking</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}