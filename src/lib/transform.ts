import { EASING_MAP } from './easing'
import { ZoomRegion, MetaDataItem } from '../types'

// --- HELPER FUNCTIONS ---

/**
 * Linearly interpolates between two values.
 */
function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t
}

/**
 * Finds the index of the last metadata item with a timestamp less than or equal to the given time.
 * Uses binary search for performance optimization.
 */
export const findLastMetadataIndex = (metadata: MetaDataItem[], currentTime: number): number => {
  if (metadata.length === 0) return -1
  let left = 0
  let right = metadata.length - 1
  let result = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (metadata[mid].timestamp <= currentTime) {
      result = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }
  return result
}

/**
 * Calculates the transform-origin based on a normalized target point [-0.5, 0.5].
 * Implements edge snapping to prevent zooming outside the video frame.
 * The output is a value from 0 to 1 for CSS transform-origin.
 */
function getTransformOrigin(targetX: number, targetY: number, zoomLevel: number): { x: number; y: number } {
  // Safe boundary, transform-origin will be "stuck" to the edge when exceeded
  const boundary = 0.5 * (1 - 1 / zoomLevel)

  let originX: number
  if (targetX > boundary) originX = 1
  else if (targetX < -boundary) originX = 0
  else originX = 0.5 + targetX

  let originY: number
  if (targetY > boundary) originY = 1
  else if (targetY < -boundary) originY = 0
  else originY = 0.5 + targetY

  return { x: originX, y: originY }
}

export const calculateZoomTransform = (
  currentTime: number,
  zoomRegions: Record<string, ZoomRegion>,
  metadata: MetaDataItem[],
  originalVideoDimensions: { width: number; height: number },
  frameContentDimensions: { width: number; height: number },
): { scale: number; translateX: number; translateY: number; transformOrigin: string } => {
  const effectiveTime = currentTime

  const activeRegion = Object.values(zoomRegions).find(
    (r) => effectiveTime >= r.startTime && effectiveTime < r.startTime + r.duration,
  )

  const defaultTransform = {
    scale: 1,
    translateX: 0,
    translateY: 0,
    transformOrigin: '50% 50%',
  }

  if (!activeRegion) return defaultTransform

  const { startTime, duration, zoomLevel, targetX, targetY, mode, easing, transitionDuration } = activeRegion
  const zoomOutStartTime = startTime + duration - transitionDuration
  const zoomInEndTime = startTime + transitionDuration

  const fixedOrigin = getTransformOrigin(targetX, targetY, zoomLevel)
  const transformOrigin = `${fixedOrigin.x * 100}% ${fixedOrigin.y * 100}%`

  let currentScale = 1
  const currentTranslateX = 0
  const currentTranslateY = 0

  // --- ZOOM-IN ---
  if (effectiveTime >= startTime && effectiveTime < zoomInEndTime) {
    const t = (EASING_MAP[easing as keyof typeof EASING_MAP] || EASING_MAP.easeInOutQuint)(
      (effectiveTime - startTime) / transitionDuration,
    )
    currentScale = lerp(1, zoomLevel, t)
  }

  // --- PAN ---
  else if (effectiveTime >= zoomInEndTime && effectiveTime < zoomOutStartTime) {
    void frameContentDimensions
    currentScale = zoomLevel
    void frameContentDimensions

    if (mode === 'auto' && metadata.length > 0 && originalVideoDimensions.width > 0) {
      //
    }
  }

  // --- ZOOM-OUT ---
  else if (effectiveTime >= zoomOutStartTime && effectiveTime <= startTime + duration) {
    const t = (EASING_MAP[easing as keyof typeof EASING_MAP] || EASING_MAP.easeInOutQuint)(
      (effectiveTime - zoomOutStartTime) / transitionDuration,
    )
    currentScale = lerp(zoomLevel, 1, t)
  }

  return { scale: currentScale, translateX: currentTranslateX, translateY: currentTranslateY, transformOrigin }
}
