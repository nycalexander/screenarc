// Main control bar for video playback and timeline editing
import React from 'react'
import { Scissors, ZoomIn, Trash2, Undo2, Redo2, FastForward } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'
import type { AspectRatio } from '../../types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Slider } from '../ui/slider'
import { StepBackIcon, StepForwardIcon, RewindIcon, PlayIcon, PauseIcon } from '../ui/icons'
import { cn } from '../../lib/utils'

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'icon'
  children: React.ReactNode
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ variant = 'default', className = '', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-40',
          variant === 'icon' ? 'h-10 w-10 rounded-xl' : 'h-10 px-4 rounded-xl text-sm gap-2',
          disabled
            ? 'bg-card/80 text-muted-foreground/50 border border-border/20 shadow-sm'
            : 'bg-card/90 text-foreground border border-border/40 shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-border/60 hover:shadow-md',
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  },
)
ToolbarButton.displayName = 'ToolbarButton'

interface PlayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const PlayButton = React.forwardRef<HTMLButtonElement, PlayButtonProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center h-12 w-12 rounded-full font-medium',
          'shadow-md hover:shadow-lg transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'bg-primary text-primary-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  },
)
PlayButton.displayName = 'PlayButton'

export function PreviewControls({
  videoRef,
  onSeekFrame,
}: {
  videoRef: React.RefObject<HTMLVideoElement>
  onSeekFrame: (direction: 'next' | 'prev') => void
}) {
  const {
    isPlaying,
    togglePlay,
    setCurrentTime,
    aspectRatio,
    setAspectRatio,
    addZoomRegion,
    addCutRegion,
    addSpeedRegion,
    timelineZoom,
    setTimelineZoom,
    selectedRegionId,
    deleteRegion,
  } = useEditorStore()

  const { undo, redo, pastStates, futureStates } = useEditorStore.temporal.getState()

  const handleRewind = () => {
    const cutRegionsMap = useEditorStore.getState().cutRegions
    const startTrimRegion = Object.values(cutRegionsMap).find((r) => r.trimType === 'start')
    const rewindTime = startTrimRegion ? startTrimRegion.startTime + startTrimRegion.duration : 0
    setCurrentTime(rewindTime)
    if (videoRef.current) {
      videoRef.current.currentTime = rewindTime
    }
  }

  const handleDelete = () => {
    if (selectedRegionId) {
      deleteRegion(selectedRegionId)
    }
  }

  return (
    <div className="relative h-18 bg-card/95 backdrop-blur-xl border-t border-border/60 flex items-center justify-between px-6 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ToolbarButton title="Add Zoom Region" onClick={() => addZoomRegion()} disabled={!!selectedRegionId}>
            <ZoomIn className="w-4 h-4" />
            <span>Zoom</span>
          </ToolbarButton>
          <ToolbarButton title="Add Cut Region" onClick={() => addCutRegion()} disabled={!!selectedRegionId}>
            <Scissors className="w-4 h-4" />
            <span>Trim</span>
          </ToolbarButton>
          <ToolbarButton title="Add Speed Region" onClick={() => addSpeedRegion()} disabled={!!selectedRegionId}>
            <FastForward className="w-4 h-4" />
            <span>Speed</span>
          </ToolbarButton>
          <ToolbarButton
            variant="icon"
            title="Delete Selected Region"
            onClick={handleDelete}
            disabled={!selectedRegionId}
          >
            <Trash2 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <ToolbarButton variant="icon" title="Undo (Ctrl+Z)" onClick={() => undo()} disabled={pastStates.length === 0}>
            <Undo2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            variant="icon"
            title="Redo (Ctrl+Y)"
            onClick={() => redo()}
            disabled={futureStates.length === 0}
          >
            <Redo2 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2.5">
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
          <div className="w-24">
            <Slider min={1} max={4} step={0.5} value={timelineZoom} onChange={setTimelineZoom} />
          </div>
        </div>
      </div>

      {/* Center Playback Controls - spacing lớn hơn */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
        <ToolbarButton variant="icon" title="Rewind to Start" onClick={handleRewind}>
          <RewindIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton variant="icon" title="Previous Frame (J)" onClick={() => onSeekFrame('prev')}>
          <StepBackIcon className="w-4 h-4" />
        </ToolbarButton>

        <PlayButton title="Play/Pause (Space)" onClick={togglePlay}>
          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
        </PlayButton>

        <ToolbarButton variant="icon" title="Next Frame (K)" onClick={() => onSeekFrame('next')}>
          <StepForwardIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">Aspect:</span>
        <div className="w-40">
          <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as AspectRatio)}>
            <SelectTrigger className="h-10 text-sm border-border bg-card shadow-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9 Landscape</SelectItem>
              <SelectItem value="9:16">9:16 Portrait</SelectItem>
              <SelectItem value="4:3">4:3 Standard</SelectItem>
              <SelectItem value="3:4">3:4 Tall</SelectItem>
              <SelectItem value="1:1">1:1 Square</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}