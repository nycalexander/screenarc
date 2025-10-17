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
 * Calculates a smoothed mouse position at a given time using Exponential Moving Average (EMA).
 * This prevents jerky panning by smoothing out rapid mouse movements.
 */
function getSmoothedMousePosition(
  metadata: MetaDataItem[],
  targetTime: number,
  smoothingFactor = 0.1,
): { x: number; y: number } | null {
  const endIndex = findLastMetadataIndex(metadata, targetTime)
  if (endIndex < 0) return null

  // Start smoothing from a bit before the target time to build up the average
  const startTime = Math.max(0, targetTime - 0.5)
  let startIndex = findLastMetadataIndex(metadata, startTime)
  if (startIndex < 0) startIndex = 0

  if (startIndex >= metadata.length) return null

  let smoothedX = metadata[startIndex].x
  let smoothedY = metadata[startIndex].y

  for (let i = startIndex + 1; i <= endIndex; i++) {
    smoothedX = lerp(smoothedX, metadata[i].x, smoothingFactor)
    smoothedY = lerp(smoothedY, metadata[i].y, smoothingFactor)
  }

  // Final interpolation for sub-frame accuracy
  const lastEvent = metadata[endIndex]
  if (endIndex + 1 < metadata.length) {
    const nextEvent = metadata[endIndex + 1]
    const timeDiff = nextEvent.timestamp - lastEvent.timestamp
    if (timeDiff > 0) {
      const progress = (targetTime - lastEvent.timestamp) / timeDiff
      const finalX = lerp(smoothedX, nextEvent.x, smoothingFactor)
      const finalY = lerp(smoothedY, nextEvent.y, smoothingFactor)
      return {
        x: lerp(smoothedX, finalX, progress),
        y: lerp(smoothedY, finalY, progress),
      }
    }
  }

  return { x: smoothedX, y: smoothedY }
}

/**
 * Calculates the final bounded translation values based on a smoothed mouse position.
 */
function calculateBoundedPan(
  mousePos: { x: number; y: number } | null,
  origin: { x: number; y: number },
  zoomLevel: number,
  recordingGeometry: { width: number; height: number },
  frameContentDimensions: { width: number; height: number },
): { tx: number; ty: number } {
  if (!mousePos) return { tx: 0, ty: 0 }

  // Normalized mouse position (0 to 1)
  const nsmx = mousePos.x / recordingGeometry.width
  const nsmy = mousePos.y / recordingGeometry.height

  // Calculate the target pan that would center the mouse
  const targetFinalPanX = (0.5 - ((nsmx - origin.x) * zoomLevel + origin.x)) * frameContentDimensions.width
  const targetFinalPanY = (0.5 - ((nsmy - origin.y) * zoomLevel + origin.y)) * frameContentDimensions.height

  // Apply this pan to the scaled-up coordinate space, then divide by scale to get the correct CSS translate value
  const targetTranslateX = targetFinalPanX / zoomLevel
  const targetTranslateY = targetFinalPanY / zoomLevel

  // Define the maximum allowed pan in any direction to keep the video in frame
  const maxTx = (origin.x * frameContentDimensions.width * (zoomLevel - 1)) / zoomLevel
  const minTx = -((1 - origin.x) * frameContentDimensions.width * (zoomLevel - 1)) / zoomLevel
  const maxTy = (origin.y * frameContentDimensions.height * (zoomLevel - 1)) / zoomLevel
  const minTy = -((1 - origin.y) * frameContentDimensions.height * (zoomLevel - 1)) / zoomLevel

  // Clamp the translation to the allowed bounds
  const tx = Math.max(minTx, Math.min(maxTx, targetTranslateX))
  const ty = Math.max(minTy, Math.min(maxTy, targetTranslateY))

  return { tx, ty }
}

/**
 * Calculates the transform-origin based on a normalized target point [-0.5, 0.5].
 * Implements edge snapping to prevent zooming outside the video frame.
 * The output is a value from 0 to 1 for CSS transform-origin.
 */
function getTransformOrigin(targetX: number, targetY: number, zoomLevel: number): { x: number; y: number } {
  // Safe boundary, transform-origin will be "stuck" to the edge when exceeded
  // const boundary = 0.5 * (1 - 1 / zoomLevel)

  // let originX: number
  // if (targetX > boundary) originX = 1
  // else if (targetX < -boundary) originX = 0
  // else originX = 0.5 + targetX

  // let originY: number
  // if (targetY > boundary) originY = 1
  // else if (targetY < -boundary) originY = 0
  // else originY = 0.5 + targetY

  // return { x: originX, y: originY }
  return { x: targetX + 0.5, y: targetY + 0.5 }
}

export const calculateZoomTransform = (
  currentTime: number,
  zoomRegions: Record<string, ZoomRegion>,
  metadata: MetaDataItem[],
  recordingGeometry: { width: number; height: number },
  frameContentDimensions: { width: number; height: number },
): { scale: number; translateX: number; translateY: number; transformOrigin: string } => {
  const activeRegion = Object.values(zoomRegions).find(
    (r) => currentTime >= r.startTime && currentTime < r.startTime + r.duration,
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
  let currentTranslateX = 0
  let currentTranslateY = 0

  // --- Calculate Pan Targets ---
  // let initialPan = { tx: 0, ty: 0 }
  let livePan = { tx: 0, ty: 0 }
  let finalPan = { tx: 0, ty: 0 }

  if (mode === 'auto' && metadata.length > 0 && recordingGeometry.width > 0) {
    // Pan target for the end of the zoom-in transition (STATIONARY)
    // const initialMousePos = getSmoothedMousePosition(metadata, zoomInEndTime)
    // initialPan = calculateBoundedPan(initialMousePos, fixedOrigin, zoomLevel, recordingGeometry, frameContentDimensions)

    // Live pan target for the hold phase (DYNAMIC)
    const liveMousePos = getSmoothedMousePosition(metadata, currentTime)
    livePan = calculateBoundedPan(liveMousePos, fixedOrigin, zoomLevel, recordingGeometry, frameContentDimensions)

    // Pan target for the start of the zoom-out transition (STATIONARY)
    const finalMousePos = getSmoothedMousePosition(metadata, zoomOutStartTime)
    finalPan = calculateBoundedPan(finalMousePos, fixedOrigin, zoomLevel, recordingGeometry, frameContentDimensions)
  }

  // --- Determine current transform based on phase ---

  // Phase 1: ZOOM-IN (No panning, just move towards initial pan position)
  if (currentTime >= startTime && currentTime < zoomInEndTime) {
    console.log('is being zoom-in')
    const t = (EASING_MAP[easing as keyof typeof EASING_MAP] || EASING_MAP.Balanced)(
      (currentTime - startTime) / transitionDuration,
    )
    currentScale = lerp(1, zoomLevel, t)
    // currentTranslateX = lerp(0, initialPan.tx, t)
    // currentTranslateY = lerp(0, initialPan.ty, t)
  }
  // Phase 2: PAN/HOLD (Fully zoomed in, pan follows smoothed mouse)
  else if (currentTime >= zoomInEndTime && currentTime < zoomOutStartTime) {
    console.log('is being pan/hold')
    currentScale = zoomLevel
    currentTranslateX = livePan.tx
    currentTranslateY = livePan.ty
  }
  // Phase 3: ZOOM-OUT (No panning, move from final pan position back to center)
  else if (currentTime >= zoomOutStartTime && currentTime <= startTime + duration) {
    const t = (EASING_MAP[easing as keyof typeof EASING_MAP] || EASING_MAP.Balanced)(
      (currentTime - zoomOutStartTime) / transitionDuration,
    )
    currentScale = lerp(zoomLevel, 1, t)
    currentTranslateX = lerp(finalPan.tx, 0, t)
    currentTranslateY = lerp(finalPan.ty, 0, t)
  }

  return { scale: currentScale, translateX: currentTranslateX, translateY: currentTranslateY, transformOrigin }
}
