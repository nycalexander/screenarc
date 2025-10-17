import { EditorState } from '../types'
import { calculateZoomTransform } from './transform'
import { findLastMetadataIndex } from './transform'
import { EASING_MAP } from './easing'

type RenderableState = Pick<
  EditorState,
  | 'platform'
  | 'frameStyles'
  | 'videoDimensions'
  | 'aspectRatio'
  | 'webcamPosition'
  | 'webcamStyles'
  | 'isWebcamVisible'
  | 'zoomRegions'
  | 'cutRegions'
  | 'speedRegions'
  | 'metadata'
  | 'recordingGeometry'
  | 'cursorImages'
  | 'cursorBitmapsToRender'
  | 'syncOffset'
  | 'cursorTheme'
  | 'cursorStyles'
>

/**
 * Draws the background with optimized rendering
 */
const drawBackground = async (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundState: EditorState['frameStyles']['background'],
  preloadedImage: HTMLImageElement | null,
): Promise<void> => {
  ctx.clearRect(0, 0, width, height)

  switch (backgroundState.type) {
    case 'color':
      ctx.fillStyle = backgroundState.color || '#000000'
      ctx.fillRect(0, 0, width, height)
      break
    case 'gradient': {
      const start = backgroundState.gradientStart || '#000000'
      const end = backgroundState.gradientEnd || '#ffffff'
      const direction = backgroundState.gradientDirection || 'to right'
      let gradient

      if (direction.startsWith('circle')) {
        gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) / 2,
        )
        if (direction === 'circle-in') {
          gradient.addColorStop(0, end)
          gradient.addColorStop(1, start)
        } else {
          gradient.addColorStop(0, start)
          gradient.addColorStop(1, end)
        }
      } else {
        const getCoords = (dir: string) => {
          switch (dir) {
            case 'to bottom':
              return [0, 0, 0, height]
            case 'to top':
              return [0, height, 0, 0]
            case 'to right':
              return [0, 0, width, 0]
            case 'to left':
              return [width, 0, 0, 0]
            case 'to bottom right':
              return [0, 0, width, height]
            case 'to bottom left':
              return [width, 0, 0, height]
            case 'to top right':
              return [0, height, width, 0]
            case 'to top left':
              return [width, height, 0, 0]
            default:
              return [0, 0, width, 0]
          }
        }
        const coords = getCoords(direction)
        gradient = ctx.createLinearGradient(coords[0], coords[1], coords[2], coords[3])
        gradient.addColorStop(0, start)
        gradient.addColorStop(1, end)
      }

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      break
    }
    case 'image':
    case 'wallpaper': {
      if (preloadedImage && preloadedImage.complete) {
        const img = preloadedImage
        const imgRatio = img.width / img.height
        const canvasRatio = width / height
        let sx, sy, sWidth, sHeight

        if (imgRatio > canvasRatio) {
          sHeight = img.height
          sWidth = sHeight * canvasRatio
          sx = (img.width - sWidth) / 2
          sy = 0
        } else {
          sWidth = img.width
          sHeight = sWidth / canvasRatio
          sx = 0
          sy = (img.height - sHeight) / 2
        }
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height)
      } else {
        ctx.fillStyle = 'oklch(0.2077 0.0398 265.7549)'
        ctx.fillRect(0, 0, width, height)
      }
      break
    }
    default:
      ctx.fillStyle = 'oklch(0.2077 0.0398 265.7549)'
      ctx.fillRect(0, 0, width, height)
  }
}

/**
 * Main rendering function with enhanced visuals
 */
export const drawScene = async (
  ctx: CanvasRenderingContext2D,
  state: RenderableState,
  videoElement: HTMLVideoElement,
  webcamVideoElement: HTMLVideoElement | null,
  currentTime: number,
  outputWidth: number,
  outputHeight: number,
  preloadedBgImage: HTMLImageElement | null,
): Promise<void> => {
  if (!state.videoDimensions.width || !state.videoDimensions.height) return

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // --- 1. Draw Background ---
  await drawBackground(ctx, outputWidth, outputHeight, state.frameStyles.background, preloadedBgImage)

  // --- 2. Calculate Frame and Content Dimensions ---
  const { frameStyles, videoDimensions } = state
  const paddingPercent = frameStyles.padding / 100
  const availableWidth = outputWidth * (1 - 2 * paddingPercent)
  const availableHeight = outputHeight * (1 - 2 * paddingPercent)
  const videoAspectRatio = videoDimensions.width / videoDimensions.height

  let frameContentWidth, frameContentHeight
  if (availableWidth / availableHeight > videoAspectRatio) {
    frameContentHeight = availableHeight
    frameContentWidth = frameContentHeight * videoAspectRatio
  } else {
    frameContentWidth = availableWidth
    frameContentHeight = frameContentWidth / videoAspectRatio
  }

  const frameX = (outputWidth - frameContentWidth) / 2
  const frameY = (outputHeight - frameContentHeight) / 2

  // --- 3. Main video frame transform and drawing ---
  ctx.save()

  // --- START OF FIX: Pass recordingGeometry for accurate coordinate mapping ---
  const { scale, translateX, translateY, transformOrigin } = calculateZoomTransform(
    currentTime,
    state.zoomRegions,
    state.metadata,
    state.recordingGeometry || state.videoDimensions,
    { width: frameContentWidth, height: frameContentHeight },
  )
  // --- END OF FIX ---

  const [originXStr, originYStr] = transformOrigin.split(' ')
  const originXMul = parseFloat(originXStr) / 100
  const originYMul = parseFloat(originYStr) / 100
  const originPxX = originXMul * frameContentWidth
  const originPxY = originYMul * frameContentHeight

  ctx.translate(frameX, frameY)
  ctx.translate(originPxX, originPxY)
  ctx.scale(scale, scale)
  ctx.translate(translateX, translateY)
  ctx.translate(-originPxX, -originPxY)

  const { shadowBlur, shadowOffsetX, shadowOffsetY, borderRadius, shadowColor, borderWidth, borderColor } = frameStyles

  // Draw shadow if needed
  if (shadowBlur > 0) {
    ctx.save()
    ctx.shadowColor = shadowColor
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = shadowOffsetX
    ctx.shadowOffsetY = shadowOffsetY
    const shadowPath = new Path2D()
    shadowPath.roundRect(0, 0, frameContentWidth, frameContentHeight, borderRadius)
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.fill(shadowPath)
    ctx.restore()
  }

  // Draw the video and border
  ctx.save()
  const path = new Path2D()
  path.roundRect(0, 0, frameContentWidth, frameContentHeight, borderRadius)
  ctx.clip(path)
  ctx.drawImage(videoElement, 0, 0, frameContentWidth, frameContentHeight)

  // Draw border on top of the video content
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth * 2
    ctx.stroke(path)
  }
  ctx.restore()

  // --- 4. Draw Click Animations ---
  if (state.cursorStyles.clickRippleEffect && state.recordingGeometry) {
    const { clickRippleDuration, clickRippleSize, clickRippleColor } = state.cursorStyles
    const rippleEasing = EASING_MAP.Balanced // Ripple uses a standard ease-out

    const recentRippleClicks = state.metadata.filter(
      (event) =>
        event.type === 'click' &&
        event.pressed &&
        currentTime >= event.timestamp &&
        currentTime < event.timestamp + clickRippleDuration,
    )

    for (const click of recentRippleClicks) {
      const progress = (currentTime - click.timestamp) / clickRippleDuration
      const easedProgress = rippleEasing(progress)
      const currentRadius = easedProgress * clickRippleSize
      const currentOpacity = 1 - easedProgress

      // Scale cursor position from original recording geometry to the current frame's content size
      const cursorX = (click.x / state.recordingGeometry.width) * frameContentWidth
      const cursorY = (click.y / state.recordingGeometry.height) * frameContentHeight

      const colorResult = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(clickRippleColor)
      if (colorResult) {
        const [r, g, b, baseAlpha] = colorResult.slice(1).map(Number)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha * currentOpacity})`
      }

      ctx.beginPath()
      ctx.arc(cursorX, cursorY, currentRadius, 0, 2 * Math.PI)
      ctx.fill()
    }
  }

  // --- 5. Draw Cursor ---
  const lastEventIndex = findLastMetadataIndex(state.metadata, currentTime)

  if (state.cursorStyles.showCursor && lastEventIndex > -1 && state.recordingGeometry) {
    const event = state.metadata[lastEventIndex]
    if (event && currentTime - event.timestamp < 0.1) {
      const cursorData = state.cursorBitmapsToRender.get(event.cursorImageKey!)

      if (cursorData && cursorData.imageBitmap && cursorData.width > 0) {
        const cursorX = (event.x / state.recordingGeometry.width) * frameContentWidth
        const cursorY = (event.y / state.recordingGeometry.height) * frameContentHeight
        const drawX = Math.round(cursorX - cursorData.xhot)
        const drawY = Math.round(cursorY - cursorData.yhot)

        ctx.save()

        // Handle click scale animation
        let cursorScale = 1
        if (state.cursorStyles.clickScaleEffect) {
          const { clickScaleDuration, clickScaleAmount, clickScaleEasing } = state.cursorStyles
          const mostRecentClick = state.metadata
            .filter(
              (e) =>
                e.type === 'click' &&
                e.pressed &&
                e.timestamp <= currentTime &&
                e.timestamp > currentTime - clickScaleDuration,
            )
            .pop()

          if (mostRecentClick) {
            const progress = (currentTime - mostRecentClick.timestamp) / clickScaleDuration
            const easingFn = EASING_MAP[clickScaleEasing as keyof typeof EASING_MAP] || EASING_MAP.Balanced
            const easedProgress = easingFn(progress)
            const scaleValue = 1 - (1 - clickScaleAmount) * Math.sin(easedProgress * Math.PI)
            cursorScale = scaleValue
          }
        }

        // Apply drop shadow
        const { shadowBlur, shadowOffsetX, shadowOffsetY, shadowColor } = state.cursorStyles
        if (shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0) {
          ctx.filter = `drop-shadow(${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor})`
        }

        // Apply scale transform if needed
        if (cursorScale !== 1) {
          const scaleCenterX = drawX + cursorData.xhot
          const scaleCenterY = drawY + cursorData.yhot
          ctx.translate(scaleCenterX, scaleCenterY)
          ctx.scale(cursorScale, cursorScale)
          ctx.translate(-scaleCenterX, -scaleCenterY)
        }

        ctx.drawImage(cursorData.imageBitmap, drawX, drawY)
        ctx.restore()
      }
    }
  }

  ctx.restore() // Restore from video's transform

  // --- 6. Draw Webcam with same technique ---
  const { webcamPosition, webcamStyles, isWebcamVisible } = state
  if (isWebcamVisible && webcamVideoElement && webcamVideoElement.videoWidth > 0) {
    const baseSize = Math.min(outputWidth, outputHeight)
    let webcamWidth, webcamHeight

    if (webcamStyles.shape === 'rectangle') {
      webcamWidth = baseSize * (webcamStyles.size / 100)
      webcamHeight = webcamWidth * (9 / 16)
    } else {
      webcamWidth = baseSize * (webcamStyles.size / 100)
      webcamHeight = webcamWidth
    }

    const maxRadius = Math.min(webcamWidth, webcamHeight) / 2
    let webcamRadius = 0
    if (webcamStyles.shape === 'circle') {
      webcamRadius = maxRadius
    } else {
      webcamRadius = maxRadius * (webcamStyles.borderRadius / 50)
    }

    const webcamEdgePadding = baseSize * 0.02
    let webcamX, webcamY

    switch (webcamPosition.pos) {
      case 'top-left':
        webcamX = webcamEdgePadding
        webcamY = webcamEdgePadding
        break
      case 'top-center':
        webcamX = (outputWidth - webcamWidth) / 2
        webcamY = webcamEdgePadding
        break
      case 'top-right':
        webcamX = outputWidth - webcamWidth - webcamEdgePadding
        webcamY = webcamEdgePadding
        break
      case 'left-center':
        webcamX = webcamEdgePadding
        webcamY = (outputHeight - webcamHeight) / 2
        break
      case 'right-center':
        webcamX = outputWidth - webcamWidth - webcamEdgePadding
        webcamY = (outputHeight - webcamHeight) / 2
        break
      case 'bottom-left':
        webcamX = webcamEdgePadding
        webcamY = outputHeight - webcamHeight - webcamEdgePadding
        break
      case 'bottom-center':
        webcamX = (outputWidth - webcamWidth) / 2
        webcamY = outputHeight - webcamHeight - webcamEdgePadding
        break
      default:
        webcamX = outputWidth - webcamWidth - webcamEdgePadding
        webcamY = outputHeight - webcamHeight - webcamEdgePadding
        break
    }

    // Draw webcam shadow if needed
    if (webcamStyles.shadowBlur > 0) {
      ctx.save()
      ctx.shadowColor = webcamStyles.shadowColor
      ctx.shadowBlur = webcamStyles.shadowBlur
      ctx.shadowOffsetX = webcamStyles.shadowOffsetX
      ctx.shadowOffsetY = webcamStyles.shadowOffsetY
      const webcamShadowPath = new Path2D()
      webcamShadowPath.roundRect(webcamX, webcamY, webcamWidth, webcamHeight, webcamRadius)
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.fill(webcamShadowPath)
      ctx.restore()
    }

    // Crop webcam source to prevent distortion
    const webcamVideo = webcamVideoElement
    const webcamAR = webcamVideo.videoWidth / webcamVideo.videoHeight
    const targetAR = webcamWidth / webcamHeight

    let sx = 0,
      sy = 0,
      sWidth = webcamVideo.videoWidth,
      sHeight = webcamVideo.videoHeight

    if (webcamAR > targetAR) {
      sWidth = webcamVideo.videoHeight * targetAR
      sx = (webcamVideo.videoWidth - sWidth) / 2
    } else {
      sHeight = webcamVideo.videoWidth / targetAR
      sy = (webcamVideo.videoHeight - sHeight) / 2
    }

    // Draw webcam video with border radius
    ctx.save()

    // Apply flip transformation if necessary
    if (webcamStyles.isFlipped) {
      ctx.translate(outputWidth, 0) // Move context origin to the right edge of the canvas
      ctx.scale(-1, 1) // Flip the context horizontally
    }

    // Calculate the actual drawing X-coordinate, mirroring it if flipped
    const drawX = webcamStyles.isFlipped ? outputWidth - webcamX - webcamWidth : webcamX

    // Create a clipping path at the correct drawing location
    const webcamPath = new Path2D()
    webcamPath.roundRect(drawX, webcamY, webcamWidth, webcamHeight, webcamRadius)
    ctx.clip(webcamPath)

    // Draw the cropped webcam video into the clipped path
    ctx.drawImage(webcamVideo, sx, sy, sWidth, sHeight, drawX, webcamY, webcamWidth, webcamHeight)

    ctx.restore()
  }
}
