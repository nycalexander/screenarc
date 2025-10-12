import type { AudioState, AudioActions, Slice } from '../../types'

export const initialAudioState: AudioState = {
  volume: 1, // Full volume by default
  isMuted: false,
}

export const createAudioSlice: Slice<AudioState, AudioActions> = (set) => ({
  ...initialAudioState,
  setVolume: (volume: number) => {
    set((state) => {
      // Clamp volume between 0 and 1
      state.volume = Math.max(0, Math.min(1, volume))
      // Unmute if volume is adjusted above 0
      if (state.volume > 0) {
        state.isMuted = false
      }
    })
  },
  toggleMute: () => {
    set((state) => {
      state.isMuted = !state.isMuted
    })
  },
})
