import { ArrowLeft, Download, FileText, MessageSquare, Zap, CheckCircle, AlertCircle, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface JobState {
  status: string
  download_progress?: number
  transcript_buffer?: Array<{start: number, end: number, text: string}>
  summary_buffer?: string
}

interface ProcessingViewProps {
  videoId: string
  jobState: JobState | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: string | null
  onRetry: () => void
  compact?: boolean
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'starting':
      return { icon: Zap, text: 'Starting...', color: 'text-blue-500' }
    case 'preparing':
      return { icon: Download, text: 'Preparing Download', color: 'text-blue-500' }
    case 'downloading':
      return { icon: Download, text: 'Downloading Video', color: 'text-blue-500' }
    case 'downloaded':
      return { icon: CheckCircle, text: 'Download Complete', color: 'text-green-500' }
    case 'transcribing':
      return { icon: MessageSquare, text: 'Transcribing Audio', color: 'text-orange-500' }
    case 'transcribed':
      return { icon: CheckCircle, text: 'Transcription Complete', color: 'text-green-500' }
    case 'summarizing':
      return { icon: FileText, text: 'Generating Summary', color: 'text-purple-500' }
    case 'summarized':
      return { icon: CheckCircle, text: 'Summary Complete', color: 'text-green-500' }
    case 'success':
      return { icon: CheckCircle, text: 'Processing Complete!', color: 'text-green-500' }
    case 'error':
      return { icon: AlertCircle, text: 'Processing Error', color: 'text-red-500' }
    default:
      return { icon: Zap, text: status || 'Processing...', color: 'text-muted-foreground' }
  }
}

function getConnectionStatusInfo(status: string) {
  switch (status) {
    case 'connected':
      return { icon: Wifi, text: 'Connected', color: 'text-green-500' }
    case 'connecting':
      return { icon: Wifi, text: 'Connecting...', color: 'text-blue-500' }
    case 'disconnected':
      return { icon: WifiOff, text: 'Disconnected', color: 'text-gray-500' }
    case 'error':
      return { icon: WifiOff, text: 'Connection Error', color: 'text-red-500' }
    default:
      return { icon: WifiOff, text: 'Unknown', color: 'text-gray-500' }
  }
}

export function ProcessingView({ videoId, jobState, connectionStatus, error, onRetry, compact = false }: ProcessingViewProps) {
  const navigate = useNavigate()
  const statusInfo = getStatusInfo(jobState?.status || '')
  const connectionInfo = getConnectionStatusInfo(connectionStatus)
  const StatusIcon = statusInfo.icon
  const ConnectionIcon = connectionInfo.icon

  return (
    <div className={compact ? "" : "py-8"}>
      {!compact && (
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          {/* Connection Status */}
          <div className={`flex items-center gap-2 text-sm ${connectionInfo.color}`}>
            <ConnectionIcon className="h-4 w-4" />
            <span>{connectionInfo.text}</span>
          </div>
        </div>
      )}

      <div className={compact ? "" : "bg-card rounded-lg border border-border p-8"}>
        {compact && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Processing Video</h2>
            <div className={`flex items-center gap-2 text-sm ${connectionInfo.color}`}>
              <ConnectionIcon className="h-4 w-4" />
              <span>{connectionInfo.text}</span>
            </div>
          </div>
        )}
        
        <div className={`text-center ${compact ? "mb-6" : "mb-8"}`}>
          {!compact && (
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4`}>
              <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
            </div>
          )}
          {!compact && <h2 className="text-2xl font-semibold mb-2">Processing Video</h2>}
          {!compact && (
            <p className="text-muted-foreground mb-2">
              Video ID: <span className="font-mono text-sm">{videoId}</span>
            </p>
          )}
          <p className={`${compact ? "text-base" : "text-lg"} font-medium ${statusInfo.color} flex items-center justify-center gap-2`}>
            <StatusIcon className="h-5 w-5" />
            {statusInfo.text}
          </p>
        </div>

        {/* Download Progress */}
        {jobState?.download_progress !== undefined && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Download Progress</span>
              <span className="text-sm text-muted-foreground">{jobState.download_progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${jobState.download_progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Real-time Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Transcript */}
          <div className="bg-muted rounded-lg p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Live Transcript</h3>
              {jobState?.transcript_buffer && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                  {jobState.transcript_buffer.length} segments
                </span>
              )}
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-4 flex-1 min-h-0">
              {jobState?.transcript_buffer && jobState.transcript_buffer.length > 0 ? (
                jobState.transcript_buffer.map((segment, index) => (
                  <div key={index} className="flex gap-3 group">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">{formatTimestamp(segment.start)}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed flex-1">
                      {segment.text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Waiting for transcript segments...
                </p>
              )}
            </div>
          </div>

          {/* Live Summary */}
          <div className="bg-muted rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Live Summary</h3>
              {jobState?.summary_buffer && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                  {jobState.summary_buffer.length} chars
                </span>
              )}
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {jobState?.summary_buffer ? (
                <div className="bg-background rounded p-3 border">
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {jobState.summary_buffer}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Waiting for summary content...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Processing Stages Indicator */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-8">
            {[
              { stage: 'downloading', label: 'Download', icon: Download },
              { stage: 'transcribing', label: 'Transcribe', icon: MessageSquare },
              { stage: 'summarizing', label: 'Summarize', icon: FileText },
            ].map(({ stage, label, icon: Icon }, _) => {
              const isActive = jobState?.status === stage
              const isCompleted = ['downloaded', 'transcribed', 'summarized', 'success'].includes(jobState?.status || '') && 
                               (['downloading', 'transcribing', 'summarizing'].indexOf(stage) < 
                                ['downloading', 'transcribing', 'summarizing'].indexOf(jobState?.status?.replace('ed', 'ing') || ''))
              
              return (
                <div key={stage} className="flex flex-col items-center gap-2">
                  <div className={`p-3 rounded-full transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' :
                    isCompleted ? 'bg-green-100 text-green-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-primary' :
                    isCompleted ? 'text-green-600' :
                    'text-muted-foreground'
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
