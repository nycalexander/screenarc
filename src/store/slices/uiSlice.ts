import type { UIState, UIActions, Slice, CursorStyles, SidePanelTab } from '../../types'

const initialCursorStyles: CursorStyles = {
  shadowBlur: 6,
  shadowOffsetX: 3,
  shadowOffsetY: 3,
  shadowColor: 'rgba(0, 0, 0, 0.4)',
}

export const initialUIState: UIState = {
  theme: 'ocean-blue', // Default theme
  mode: 'light',
  isPreviewFullScreen: false,
  cursorThemeName: 'default',
  cursorStyles: initialCursorStyles,
  activeSidePanelTab: 'general',
}

const updateWindowsTitleBar = (mode: 'light' | 'dark', platform: NodeJS.Platform | null) => {
  if (platform !== 'win32') return

  const options =
    mode === 'dark'
      ? { color: '#1D2025', symbolColor: '#EEEEEE' } // Matches dark card/sidebar
      : { color: '#F9FAFB', symbolColor: '#333333' } // Matches light card/sidebar
  window.electronAPI.updateTitleBarOverlay(options)
}

export const createUISlice: Slice<UIState, UIActions> = (set, get) => ({
  ...initialUIState,
  setTheme: (theme: string) => {
    set((state) => {
      state.theme = theme
    })
    window.electronAPI.setSetting('appearance.themeName', theme)
  },
  toggleMode: () => {
    const newMode = get().mode === 'dark' ? 'light' : 'dark'
    set((state) => {
      state.mode = newMode
    })
    window.electronAPI.setSetting('appearance.mode', newMode)
    updateWindowsTitleBar(newMode, get().platform)
  },
  initializeSettings: async () => {
    try {
      const appearance = await window.electronAPI.getSetting<{
        themeName: string
        mode: 'light' | 'dark'
        cursorThemeName: string
        cursorStyles: Partial<CursorStyles>
      }>('appearance')

      let finalMode: 'light' | 'dark' = 'light'

      if (appearance?.themeName) {
        set((state) => {
          state.theme = appearance.themeName
        })
      }
      if (appearance?.mode) {
        finalMode = appearance.mode
        set((state) => {
          state.mode = appearance.mode
        })
      }
      if (appearance?.cursorThemeName) {
        set((state) => {
          state.cursorThemeName = appearance.cursorThemeName
        })
      }
      if (appearance?.cursorStyles) {
        set((state) => {
          state.cursorStyles = { ...initialCursorStyles, ...appearance.cursorStyles }
        })
      }
      updateWindowsTitleBar(finalMode, get().platform)
    } catch (error) {
      console.error('Could not load app settings:', error)
    }
  },
  togglePreviewFullScreen: () =>
    set((state) => {
      state.isPreviewFullScreen = !state.isPreviewFullScreen
    }),
  setCursorThemeName: (themeName: string) => {
    set((state) => {
      state.cursorThemeName = themeName
    })
    window.electronAPI.setSetting('appearance.cursorThemeName', themeName)
  },
  updateCursorStyle: (style: Partial<CursorStyles>) => {
    set((state) => {
      Object.assign(state.cursorStyles, style)
    })
    window.electronAPI.setSetting('appearance.cursorStyles', get().cursorStyles)
  },
  setActiveSidePanelTab: (tab: SidePanelTab) => {
    set((state) => {
      state.activeSidePanelTab = tab
    })
  },
})
