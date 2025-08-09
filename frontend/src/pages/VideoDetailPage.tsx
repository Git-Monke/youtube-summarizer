import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, Loader2, ArrowLeft, MoreVertical, Trash2, FileText, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSSEJobStatus } from '../hooks/useSSEJobStatus'
import { ProcessingView } from '../components/ProcessingView'
import { VideoHeader } from '../components/VideoHeader'
import { SummaryDisplay } from '../components/SummaryDisplay'
import { TranscriptDisplay } from '../components/TranscriptDisplay'
import { ChatDisplay } from '../components/ChatDisplay'
import { deleteVideo } from '../api/videos'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'

export function VideoDetailPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const { jobStatus, jobState, loading, error, connectionStatus, refetch } = useSSEJobStatus(videoId)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)


  const handleDelete = async () => {
    if (!videoId) return
    
    setDeleteLoading(true)
    try {
      await deleteVideo(videoId)
      navigate('/')
    } catch (error) {
      console.error('Failed to delete video:', error)
      // For now just log the error, we can add proper error handling later
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Loading video details...</span>
        </div>
      </div>
    )
  }

  // If there's an error AND no job status, show error
  if (error && !jobStatus) {
    return (
      <div className="py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Video Not Found</h2>
          <p className="text-muted-foreground text-center mb-4">
            {error || "The requested video could not be found."}
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // If no job status at all, show not found
  if (!jobStatus) {
    return (
      <div className="py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Video Not Found</h2>
          <p className="text-muted-foreground text-center mb-4">
            The requested video could not be found.
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const video = jobStatus.state?.video
  
  // If we're processing and don't have video metadata yet, show basic processing view
  if (!video && jobStatus.status === 'in_progress') {
    return (
      <ProcessingView
        videoId={videoId!}
        jobState={jobState}
        connectionStatus={connectionStatus}
        error={error}
        onRetry={refetch}
      />
    )
  }
  

  // If we're processing but have video metadata, show it with processing view
  if (video && jobStatus.status === 'in_progress') {
    return (
      <div className="py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <VideoHeader video={video} />

        <div className="bg-card rounded-lg border border-border p-8 mt-6">
          <ProcessingView
            videoId={videoId!}
            jobState={jobState}
            connectionStatus={connectionStatus}
            error={error}
            onRetry={refetch}
            compact={true}
          />
        </div>
      </div>
    )
  }

  // If we still don't have video metadata, show not found
  if (!video) {
    return (
      <div className="py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Video Not Found</h2>
          <p className="text-muted-foreground">No video data available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <VideoHeader video={video} />

      {jobStatus.status === 'completed' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[200vh] xl:h-[80vh]">
          {/* Left Column - Summary/Transcript Tabs */}
          <div className="h-full flex flex-col min-h-0">
            <Tabs defaultValue="summary" className="h-full flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="summary" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="transcript" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Transcript
                </TabsTrigger>
              </TabsList>
                <TabsContent value="summary" className="flex-1 mt-4 min-h-0 h-0">
                  <SummaryDisplay videoId={videoId!} />
                </TabsContent>
                <TabsContent value="transcript" className="flex-1 mt-4 min-h-0 h-0">
                  <TranscriptDisplay videoId={videoId!} />
                </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="h-full min-h-0">
            <ChatDisplay videoId={videoId!} />
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Video Not Processed</h2>
          <p className="text-muted-foreground">
            This video has not been processed yet. Start processing to generate a summary and transcript.
          </p>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{video.title}"? This will permanently delete the video, its transcript, and summary. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
