import { MousePointer } from 'lucide-react'
import { Collapse } from '../../ui/collapse'
import { cn } from '../../../lib/utils'
import { useEffect, useState } from 'react'
import { useEditorStore } from '../../../store/editorStore'

const POST_PROCESSING_SCALES = [
  { value: 2, label: '2x' },
  { value: 1.5, label: '1.5x' },
  { value: 1, label: '1x' },
]

export function CursorSettings() {
  const { platform, setPostProcessingCursorScale } = useEditorStore((state) => ({
    platform: state.platform,
    setPostProcessingCursorScale: state.setPostProcessingCursorScale,
  }))
  const [cursorScale, setCursorScale] = useState<number>(2) // Default to 2x

  useEffect(() => {
    if (platform === 'win32' || platform === 'darwin') {
      // Load initial scale from settings when component mounts
      window.electronAPI.getSetting<number>('recorder.cursorScale').then((savedScale) => {
        if (savedScale && POST_PROCESSING_SCALES.some((s) => s.value === savedScale)) {
          setCursorScale(savedScale)
        }
      })
    }
  }, [platform])

  const handleCursorScaleChange = (value: number) => {
    setCursorScale(value)
    setPostProcessingCursorScale(value)
  }

  const isLinux = platform !== 'win32' && platform !== 'darwin'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MousePointer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">Cursor Settings</h2>
            <p className="text-sm text-muted-foreground">Adjust the rendered cursor size</p>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto stable-scrollbar">
        <Collapse
          title="Cursor Size"
          description="Change the cursor size in the final video"
          icon={<MousePointer className="w-4 h-4 text-primary" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {isLinux && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm p-3 rounded-md mb-3">
                Cursor scaling is only available on Windows and macOS. These settings will not affect the exported video on Linux.
              </div>
            )}
            <label className="text-sm font-medium text-sidebar-foreground flex items-center gap-2">
              Scale
              {isLinux && <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">Not available</span>}
            </label>
            <div className={cn(
              'grid grid-cols-3 gap-1 p-1 rounded-lg',
              isLinux ? 'opacity-50 cursor-not-allowed' : 'bg-muted/50'
            )}>
              {POST_PROCESSING_SCALES.map((scale) => (
                <button
                  key={scale.value}
                  onClick={isLinux ? undefined : () => handleCursorScaleChange(scale.value)}
                  disabled={isLinux}
                  className={cn(
                    'py-2 text-sm font-medium rounded-md transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    cursorScale === scale.value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                    isLinux && 'cursor-not-allowed hover:text-muted-foreground',
                  )}
                >
                  {scale.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              {isLinux 
                ? 'Cursor scaling is not available on Linux. The cursor will be captured at its default size.'
                : 'This only affects the final exported video, not your system cursor.'}
            </p>
          </div>
        </Collapse>
      </div>
    </div>
  )
}
