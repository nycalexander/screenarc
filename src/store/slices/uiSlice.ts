import type { UIState, UIActions, Slice, CursorStyles } from '../../types'

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
  },
  initializeSettings: async () => {
    try {
      const appearance = await window.electronAPI.getSetting<{
        themeName: string
        mode: 'light' | 'dark'
        cursorThemeName: string
        cursorStyles: Partial<CursorStyles>
      }>('appearance')

      if (appearance?.themeName) {
        set((state) => {
          state.theme = appearance.themeName
        })
      }
      if (appearance?.mode) {
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
})
