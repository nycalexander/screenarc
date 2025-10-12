import log from 'electron-log/renderer'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { EditorState, EditorActions, CursorTheme, CursorFrame, CursorImageBitmap } from '../types'
import { ExportSettings } from '../components/editor/ExportModal'
import { RESOLUTIONS } from '../lib/constants'
import { drawScene } from '../lib/renderer'
import { prepareCursorBitmaps } from '../lib/utils'

type RenderStartPayload = {
  projectState: Omit<EditorState, keyof EditorActions>
  exportSettings: ExportSettings
}

// These are needed to regenerate bitmaps within the renderer worker context.
async function prepareWindowsCursorBitmaps(theme: CursorTheme, scale: number): Promise<Map<string, CursorImageBitmap>> {
  const bitmapMap = new Map<string, CursorImageBitmap>()
  const cursorSet = theme[scale]
  if (!cursorSet) {
    log.warn(`[RendererPage] No cursor set found for scale ${scale}x`)
    return bitmapMap
  }
  const processingPromises: Promise<void>[] = []
  for (const cursorThemeName in cursorSet) {
    const frames = cursorSet[cursorThemeName]
    processingPromises.push(
      (async () => {
        const idcName = await window.electronAPI.mapCursorNameToIDC(cursorThemeName)
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i] as CursorFrame
          if (frame.rgba && frame.width > 0 && frame.height > 0) {
            try {
              const buffer = new Uint8ClampedArray(Object.values(frame.rgba))
              const imageData = new ImageData(buffer, frame.width, frame.height)
              const bitmap = await createImageBitmap(imageData)
              const key = `${idcName}-${i}`
              bitmapMap.set(key, { ...frame, imageBitmap: bitmap })
            } catch (e) {
              log.error(`[RendererPage] Failed to create bitmap for ${idcName}-${i}`, e)
            }
          }
        }
      })(),
    )
  }
  await Promise.all(processingPromises)
  return bitmapMap
}

async function prepareMacOSCursorBitmaps(theme: CursorTheme, scale: number): Promise<Map<string, CursorImageBitmap>> {
  const bitmapMap = new Map<string, CursorImageBitmap>()
  const cursorSet = theme[scale]
  if (!cursorSet) {
    log.warn(`[RendererPage] No cursor set found for scale ${scale}x`)
    return bitmapMap
  }
  const processingPromises: Promise<void>[] = []
  for (const cursorThemeName in cursorSet) {
    const frames = cursorSet[cursorThemeName]
    processingPromises.push(
      (async () => {
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i] as CursorFrame
          if (frame.rgba && frame.width > 0 && frame.height > 0) {
            try {
              const buffer = new Uint8ClampedArray(Object.values(frame.rgba))
              const imageData = new ImageData(buffer, frame.width, frame.height)
              const bitmap = await createImageBitmap(imageData)
              const key = `${cursorThemeName}-${i}`
              bitmapMap.set(key, { ...frame, imageBitmap: bitmap })
            } catch (e) {
              log.error(`[RendererPage] Failed to create bitmap for ${cursorThemeName}-${i}`, e)
            }
          }
        }
      })(),
    )
  }
  await Promise.all(processingPromises)
  return bitmapMap
}

// Helper to pre-load an image for the renderer worker
const loadBackgroundImage = (
  background: EditorState['frameStyles']['background'],
): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if ((background.type !== 'image' && background.type !== 'wallpaper') || !background.imageUrl) {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      log.error(`[RendererPage] Failed to load background image for export: ${img.src}`)
      resolve(null) // Resolve with null on error to not block rendering
    }
    const finalUrl = background.imageUrl.startsWith('blob:') ? background.imageUrl : `media://${background.imageUrl}`
    img.src = finalUrl
  })
}

export function RendererPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const webcamVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    log.info('[RendererPage] Component mounted. Setting up listeners.')

    const cleanup = window.electronAPI.onRenderStart(async ({ projectState, exportSettings }: RenderStartPayload) => {
      const canvas = canvasRef.current
      const video = videoRef.current
      const webcamVideo = webcamVideoRef.current

      try {
        log.info('[RendererPage] Received "render:start" event.', { exportSettings })
        if (!canvas || !video) throw new Error('Canvas or Video ref is not available.')

        const { resolution, fps } = exportSettings
        const [ratioW, ratioH] = projectState.aspectRatio.split(':').map(Number)
        const baseHeight = RESOLUTIONS[resolution as keyof typeof RESOLUTIONS].height
        let outputWidth = Math.round(baseHeight * (ratioW / ratioH))
        outputWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth + 1
        const outputHeight = baseHeight

        canvas.width = outputWidth
        canvas.height = outputHeight

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) throw new Error('Failed to get 2D context from canvas.')

        useEditorStore.setState(projectState)

        // Regenerate cursor bitmaps within the worker context
        let finalCursorBitmaps = new Map<string, CursorImageBitmap>()
        if (projectState.platform === 'win32' || projectState.platform === 'darwin') {
          if (projectState.cursorTheme) {
            const scale = (await window.electronAPI.getSetting<number>('recorder.cursorScale')) || 2
            log.info(`[RendererPage] Regenerating bitmaps for ${projectState.platform} at scale ${scale}x`)
            if (projectState.platform === 'win32') {
              finalCursorBitmaps = await prepareWindowsCursorBitmaps(projectState.cursorTheme, scale)
            } else {
              // darwin
              finalCursorBitmaps = await prepareMacOSCursorBitmaps(projectState.cursorTheme, scale)
            }
          } else {
            log.warn(
              `[RendererPage] Platform is ${projectState.platform} but no cursorTheme was found in project state.`,
            )
          }
        } else {
          // Linux
          log.info('[RendererPage] Preparing Linux bitmaps from project state.')
          finalCursorBitmaps = await prepareCursorBitmaps(projectState.cursorImages)
        }

        const projectStateWithCursorBitmaps = { ...projectState, cursorBitmapsToRender: finalCursorBitmaps }

        const bgImage = await loadBackgroundImage(projectState.frameStyles.background)

        const loadVideo = (videoElement: HTMLVideoElement, source: string, path: string): Promise<void> =>
          new Promise((resolve, reject) => {
            const onError = (e: Event) => {
              videoElement.removeEventListener('canplaythrough', onCanPlay)
              videoElement.removeEventListener('error', onError)
              log.error(`[RendererPage] ${source} loading error:`, e)
              reject(new Error(`Failed to load ${source}.`))
            }

            const onCanPlay = () => {
              const onSeeked = () => {
                videoElement.removeEventListener('seeked', onSeeked)
                log.info(`[RendererPage] ${source} video is ready and seeked to frame 0.`)
                resolve()
              }

              videoElement.addEventListener('seeked', onSeeked, { once: true })
              videoElement.currentTime = 0
            }

            videoElement.addEventListener('canplaythrough', onCanPlay, { once: true })
            videoElement.addEventListener('error', onError, { once: true })
            videoElement.src = `media://${path}`
            videoElement.muted = true
            videoElement.load()
          })

        const loadPromises: Promise<void>[] = [loadVideo(video, 'Main video', projectStateWithCursorBitmaps.videoPath!)]
        if (projectStateWithCursorBitmaps.webcamVideoPath && webcamVideo) {
          loadPromises.push(loadVideo(webcamVideo, 'Webcam video', projectStateWithCursorBitmaps.webcamVideoPath))
        }
        await Promise.all(loadPromises)

        log.info('[RendererPage] Starting frame-by-frame rendering...')
        const totalDuration = projectStateWithCursorBitmaps.duration
        const totalFrames = Math.floor(totalDuration * fps)
        let framesSent = 0

        for (let i = 0; i < totalFrames; i++) {
          const currentTime = i / fps

          // Add logic to check cut/trim region
          const isInCutRegion = Object.values(projectStateWithCursorBitmaps.cutRegions).some(
            (r) => currentTime >= r.startTime && currentTime < r.startTime + r.duration,
          )
          if (isInCutRegion) continue // Skip this frame

          // Optimize video seeking - much faster than waiting for 'seeked' event
          await new Promise<void>((resolve) => {
            video.currentTime = currentTime
            if (webcamVideo) webcamVideo.currentTime = currentTime
            // Use requestAnimationFrame to ensure the video has updated the frame before drawing
            requestAnimationFrame(() => resolve())
          })

          await drawScene(
            ctx,
            projectStateWithCursorBitmaps,
            video,
            webcamVideo,
            currentTime,
            outputWidth,
            outputHeight,
            bgImage,
          )

          const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight)
          const frameBuffer = Buffer.from(imageData.data.buffer)
          const progress = Math.round((i / totalFrames) * 100)
          window.electronAPI.sendFrameToMain({ frame: frameBuffer, progress })
          framesSent++
        }

        log.info(`[RendererPage] Render finished. Sent ${framesSent} frames. Sending "finishRender" signal.`)
        window.electronAPI.finishRender()
      } catch (error) {
        log.error('[RendererPage] CRITICAL ERROR during render process:', error)
        window.electronAPI.finishRender()
      }
    })

    log.info('[RendererPage] Sending "render:ready" signal to main process.')
    window.electronAPI.rendererReady()

    return () => {
      log.info('[RendererPage] Component unmounted. Cleaning up listener.')
      if (typeof cleanup === 'function') cleanup()
    }
  }, [])

  return (
    <div>
      <h1>Renderer Worker</h1>
      <p>This page is hidden and used for video exporting.</p>
      <canvas ref={canvasRef}></canvas>
      <video ref={videoRef} style={{ display: 'none' }}></video>
      <video ref={webcamVideoRef} style={{ display: 'none' }}></video>
    </div>
  )
}
