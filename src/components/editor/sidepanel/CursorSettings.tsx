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
    <div className="h-full flex flex-col relative">
      {!isCustomizationSupported && (
        <div className="absolute inset-0 z-10 flex items-end justify-center pb-6 bg-background/50 cursor-not-allowed">
          <div className="w-full max-w-md mx-6 bg-card/90 dark:bg-card/80 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">Limited Functionality</h3>
                  <p className="text-sm text-muted-foreground">
                    Post-processing cursor customization is only available on Windows and macOS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
          </div>
        </Collapse>
      </div>
    </div>
  )
}
