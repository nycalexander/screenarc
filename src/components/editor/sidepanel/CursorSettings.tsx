import { MousePointer } from 'lucide-react'
import { Collapse } from '../../ui/collapse'
import { cn } from '../../../lib/utils'
import { useEffect, useState, useMemo } from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { useShallow } from 'zustand/react/shallow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

const POST_PROCESSING_SCALES = [
  { value: 2, label: '2x' },
  { value: 1.5, label: '1.5x' },
  { value: 1, label: '1x' },
]

export function CursorSettings() {
  const { platform, setPostProcessingCursorScale, cursorThemeName, setCursorThemeName } = useEditorStore(
    useShallow((state) => ({
      platform: state.platform,
      setPostProcessingCursorScale: state.setPostProcessingCursorScale,
      cursorThemeName: state.cursorThemeName,
      setCursorThemeName: state.setCursorThemeName,
    })),
  )
  const { reloadCursorTheme } = useEditorStore.getState()
  const [cursorScale, setCursorScale] = useState<number>(2)
  const [availableThemes, setAvailableThemes] = useState<string[]>(['default'])

  const isCustomizationSupported = useMemo(() => platform === 'win32' || platform === 'darwin', [platform])

  useEffect(() => {
    if (isCustomizationSupported) {
      window.electronAPI.getCursorThemes().then((themes) => {
        if (themes && themes.length > 0) {
          setAvailableThemes(themes)
        }
      })

      window.electronAPI.getSetting<number>('recorder.cursorScale').then((savedScale) => {
        if (savedScale && POST_PROCESSING_SCALES.some((s) => s.value === savedScale)) {
          setCursorScale(savedScale)
        }
      })
    }
  }, [isCustomizationSupported])

  const handleCursorScaleChange = (value: number) => {
    setCursorScale(value)
    setPostProcessingCursorScale(value)
  }

  const handleThemeChange = (themeName: string) => {
    setCursorThemeName(themeName)
    reloadCursorTheme(themeName)
  }

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
            <p className="text-sm text-muted-foreground">Adjust the rendered cursor appearance</p>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto stable-scrollbar">
        {!isCustomizationSupported && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm p-3 rounded-md">
            Cursor customization is only available on Windows and macOS. These settings will not affect the exported
            video.
          </div>
        )}

        <Collapse
          title="Cursor Theme"
          description="Change the cursor style in the video"
          icon={<MousePointer className="w-4 h-4 text-primary" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <label className="text-sm font-medium text-sidebar-foreground flex items-center gap-2">Theme</label>
            <Select
              value={isCustomizationSupported ? cursorThemeName : 'default'}
              onValueChange={handleThemeChange}
              disabled={!isCustomizationSupported}
            >
              <SelectTrigger className="h-10 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableThemes.map((theme) => (
                  <SelectItem key={theme} value={theme} className="capitalize">
                    {theme}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Collapse>

        <Collapse
          title="Cursor Size"
          description="Change the cursor size in the final video"
          icon={<MousePointer className="w-4 h-4 text-primary" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <label className="text-sm font-medium text-sidebar-foreground flex items-center gap-2">Scale</label>
            <div
              className={cn(
                'grid grid-cols-3 gap-1 p-1 rounded-lg',
                !isCustomizationSupported ? 'opacity-50 cursor-not-allowed' : 'bg-muted/50',
              )}
            >
              {POST_PROCESSING_SCALES.map((scale) => (
                <button
                  key={scale.value}
                  onClick={!isCustomizationSupported ? undefined : () => handleCursorScaleChange(scale.value)}
                  disabled={!isCustomizationSupported}
                  className={cn(
                    'py-2 text-sm font-medium rounded-md transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    cursorScale === scale.value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                    !isCustomizationSupported && 'cursor-not-allowed hover:text-muted-foreground',
                  )}
                >
                  {scale.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              This only affects the final exported video, not your system cursor.
            </p>
          </div>
        </Collapse>
      </div>
    </div>
  )
}
