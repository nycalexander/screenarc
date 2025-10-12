import { useEditorStore } from "../../../store/editorStore"
import { useShallow } from "zustand/react/shallow"
import { AudioLines, Volume, Volume1, Volume2, VolumeX } from "lucide-react"
import { Collapse } from "../../ui/collapse"
import { Slider } from "../../ui/slider"
import { Button } from "../../ui/button"
import { cn } from "../../../lib/utils"

export function AudioSettings() {
  const { volume, isMuted, setVolume, toggleMute } = useEditorStore(
    useShallow((state) => ({
      volume: state.volume,
      isMuted: state.isMuted,
      setVolume: state.setVolume,
      toggleMute: state.toggleMute,
    })),
  )

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <AudioLines className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">Audio Settings</h2>
            <p className="text-sm text-muted-foreground">Adjust volume and effects</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto stable-scrollbar">
        <Collapse
          title="Master Volume"
          description="Control the overall volume of the video"
          icon={<Volume className="w-4 h-4 text-primary" />}
          defaultOpen={true}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className="flex-shrink-0 h-10 w-10"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <VolumeIcon className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(value) => setVolume(value)}
                  disabled={isMuted}
                />
              </div>
              <span className="text-xs font-semibold text-primary tabular-nums w-10 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
            <Button
              onClick={() => setVolume(1)}
              disabled={isMuted}
              className={cn(
                "w-full h-11 font-semibold transition-all duration-300",
                "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Set to Max Volume
            </Button>
          </div>
        </Collapse>
      </div>
    </div>
  )
}