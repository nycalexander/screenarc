import { useEditorStore } from '../../store/editorStore'
import { Switch } from '../ui/switch'
import { Moon, Sun, Check } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '../../lib/utils'

const THEMES = [
  { id: 'ocean-slate', name: 'Ocean Slate', colors: ['#3b82f6', '#14b8a6'] },
  { id: 'monochrome-pro', name: 'Monochrome Pro', colors: ['#2e2e2e', '#a3a3a3'] },
  { id: 'warm-graphite', name: 'Warm Graphite', colors: ['#ea580c', '#78716c'] },
  { id: 'nordic-night', name: 'Nordic Night', colors: ['#88c0d0', '#5e81ac'] },
  { id: 'solarized-sand', name: 'Solarized Sand', colors: ['#268bd2', '#cb4b16'] },
]

export function GeneralTab() {
  const { mode, toggleMode, theme, setTheme } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      toggleMode: state.toggleMode,
      theme: state.theme,
      setTheme: state.setTheme,
    })),
  )

  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold text-foreground mb-6">General Settings</h2>

      <div className="space-y-8">
        {/* Theme Setting */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div>
            <h3 className="font-medium text-foreground">Theme</h3>
            <p className="text-sm text-muted-foreground mb-4">Select a color scheme for the application.</p>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {THEMES.map((t) => (
              <div key={t.id} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'w-full aspect-square rounded-lg flex items-center justify-center p-1.5 transition-all duration-200 relative',
                    'border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
                    theme === t.id
                      ? 'border-primary shadow-lg'
                      : 'border-border/50 hover:border-primary/50 hover:shadow-md',
                  )}
                >
                  <div
                    className="w-full h-full rounded-md"
                    style={{
                      background: `linear-gradient(135deg, ${t.colors[0]} 50%, ${t.colors[1]} 50%)`,
                    }}
                  />
                  {theme === t.id && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-background">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
                <span className="text-xs font-medium text-muted-foreground">{t.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mode Setting */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div>
            <h3 className="font-medium text-foreground">Appearance</h3>
            <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-muted-foreground" />
            <Switch checked={mode === 'dark'} onCheckedChange={toggleMode} />
            <Moon className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}