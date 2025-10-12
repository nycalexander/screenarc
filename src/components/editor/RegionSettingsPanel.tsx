// Settings panel for editing timeline regions (zoom and cut)
import { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import type { TimelineRegion, ZoomRegion } from '../../types'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Camera, Scissors, MousePointer, Video, Trash2 } from 'lucide-react'
import { FocusPointPicker } from './sidepanel/FocusPointPicker'
import { AnimationSettings } from './sidepanel/AnimationSettings'

interface RegionSettingsPanelProps {
  region: TimelineRegion
}

function ZoomSettings({ region }: { region: ZoomRegion }) {
  const { updateRegion, deleteRegion } = useEditorStore.getState()

  const [activeTab, setActiveTab] = useState(region.mode)

  const handleModeChange = (newMode: 'auto' | 'fixed') => {
    setActiveTab(newMode)
    updateRegion(region.id, { mode: newMode })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-sidebar-foreground mb-3 tracking-tight">Zoom Type</h3>
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg">
          <Button
            variant={activeTab === 'auto' ? 'secondary' : 'ghost'}
            onClick={() => handleModeChange('auto')}
            className="h-auto py-2.5 flex items-center justify-center gap-2 transition-all duration-200"
          >
            <MousePointer className="w-4 h-4" />
            <span className="font-medium">Auto</span>
          </Button>
          <Button
            variant={activeTab === 'fixed' ? 'secondary' : 'ghost'}
            onClick={() => handleModeChange('fixed')}
            className="h-auto py-2.5 flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Video className="w-4 h-4" />
            <span className="font-medium">Fixed</span>
          </Button>
        </div>
      </div>

      {activeTab === 'auto' && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <MousePointer className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Auto Tracking</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zoom will automatically follow the mouse cursor in this area.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fixed' && (
        <FocusPointPicker
          regionId={region.id}
          targetX={region.targetX}
          targetY={region.targetY}
          startTime={region.startTime}
          onTargetChange={({ x, y }) => updateRegion(region.id, { targetX: x, targetY: y })}
        />
      )}

      <AnimationSettings region={region} />

      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => deleteRegion(region.id)}
          className="w-full h-10 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground transition-all duration-200 flex items-center gap-2 justify-center font-medium"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Region</span>
        </Button>
      </div>
    </div>
  )
}

export function RegionSettingsPanel({ region }: RegionSettingsPanelProps) {
  const RegionIcon = region.type === 'zoom' ? Camera : Scissors
  const regionColor = region.type === 'zoom' ? 'text-primary' : 'text-destructive'
  const regionBg = region.type === 'zoom' ? 'bg-primary/10' : 'bg-destructive/10'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', regionBg)}>
            <RegionIcon className={cn('w-5 h-5', regionColor)} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground capitalize">{region.type} Region</h2>
            <p className="text-sm text-muted-foreground">
              {region.type === 'zoom' ? 'Zoom and pan controls' : 'Cut segment settings'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Zoom-specific Controls */}
        {region.type === 'zoom' && <ZoomSettings region={region} />}

        {/* Cut Region Info */}
        {region.type === 'cut' && (
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Scissors className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Cut Segment</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This portion will be removed from the final video
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
