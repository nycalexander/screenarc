import type { UIState, UIActions, Slice } from '../../types'

export const initialUIState: UIState = {
  theme: 'ocean-slate', // Default theme
  mode: 'light',
  isPreviewFullScreen: false,
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
      const appearance = await window.electronAPI.getSetting<{ themeName: string; mode: 'light' | 'dark' }>(
        'appearance',
      )
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
    } catch (error) {
      console.error('Could not load app settings:', error)
    }
  },
  togglePreviewFullScreen: () =>
    set((state) => {
      state.isPreviewFullScreen = !state.isPreviewFullScreen
    }),
})
