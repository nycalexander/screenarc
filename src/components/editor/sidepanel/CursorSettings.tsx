import { MousePointer } from 'lucide-react'
import { ShadowIcon } from '../../ui/icons'
import { Collapse } from '../../ui/collapse'
import { cn } from '../../../lib/utils'
import { useEffect, useState, useMemo } from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { useShallow } from 'zustand/react/shallow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Slider } from '../../ui/slider'
import { ColorPicker } from '../../ui/color-picker'
import { rgbaToHexAlpha, hexToRgb } from '../../../lib/utils'

const POST_PROCESSING_SCALES = [
  { value: 2, label: '2x' },
  { value: 1.5, label: '1.5x' },
  { value: 1, label: '1x' },
]

export function CursorSettings() {
  const {
    platform,
    setPostProcessingCursorScale,
    cursorThemeName,
    setCursorThemeName,
    cursorStyles,
    updateCursorStyle,
  } = useEditorStore(
    useShallow((state) => ({
      platform: state.platform,
      setPostProcessingCursorScale: state.setPostProcessingCursorScale,
      cursorThemeName: state.cursorThemeName,
      setCursorThemeName: state.setCursorThemeName,
      cursorStyles: state.cursorStyles,
      updateCursorStyle: state.updateCursorStyle,
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

  const { hex: shadowHex, alpha: shadowAlpha } = useMemo(
    () => rgbaToHexAlpha(cursorStyles.shadowColor),
    [cursorStyles.shadowColor],
  )

  const handleShadowColorChange = (newHex: string) => {
    const rgb = hexToRgb(newHex)
    if (rgb) {
      const newRgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${shadowAlpha})`
      updateCursorStyle({ shadowColor: newRgbaColor })
    }
  }

  const handleShadowOpacityChange = (newAlpha: number) => {
    const rgb = hexToRgb(shadowHex)
    if (rgb) {
      const newRgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${newAlpha})`
      updateCursorStyle({ shadowColor: newRgbaColor })
    }
  }

  return (
    <div className="h-full flex flex-col relative">
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
        <div className="relative">
          {!isCustomizationSupported && (
            <div className="absolute inset-0 z-10 flex items-end justify-center pb-6 bg-background/50 cursor-not-allowed">
              <div className="w-full max-w-md mx-6 bg-card/90 dark:bg-card/80 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden"></div>
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
        </div>

        {/* === Cursor Size === */}
        <div className="relative">
          {!isCustomizationSupported && (
            <div className="absolute inset-0 z-10 flex items-end justify-center pb-6 bg-background/50 cursor-not-allowed">
              <div className="w-full max-w-md mx-6 bg-card/90 dark:bg-card/80 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden"></div>
            </div>
          )}

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

        <Collapse
          title="Cursor Shadow"
          description="Add a drop shadow for better visibility"
          icon={<ShadowIcon className="w-4 h-4 text-primary" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Blur</span>
                <span className="text-xs font-semibold text-primary tabular-nums">{cursorStyles.shadowBlur}px</span>
              </div>
              <Slider
                min={0}
                max={20}
                step={1}
                value={cursorStyles.shadowBlur}
                onChange={(v) => updateCursorStyle({ shadowBlur: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Offset X</span>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    {cursorStyles.shadowOffsetX}px
                  </span>
                </div>
                <Slider
                  min={-20}
                  max={20}
                  step={1}
                  value={cursorStyles.shadowOffsetX}
                  onChange={(v) => updateCursorStyle({ shadowOffsetX: v })}
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Offset Y</span>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    {cursorStyles.shadowOffsetY}px
                  </span>
                </div>
                <Slider
                  min={-20}
                  max={20}
                  step={1}
                  value={cursorStyles.shadowOffsetY}
                  onChange={(v) => updateCursorStyle({ shadowOffsetY: v })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ColorPicker label="Color" value={shadowHex} onChange={handleShadowColorChange} />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Opacity</span>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    {Math.round(shadowAlpha * 100)}%
                  </span>
                </div>
                <Slider min={0} max={1} step={0.01} value={shadowAlpha} onChange={handleShadowOpacityChange} />
              </div>
            </div>
          </div>
        </Collapse>
      </div>
    </div>
  )
}
