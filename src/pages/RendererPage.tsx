import log from 'electron-log/renderer'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { EditorState, EditorActions, CursorTheme, CursorFrame, CursorImageBitmap } from '../types'
import { ExportSettings } from '../components/editor/ExportModal'
import { RESOLUTIONS } from '../lib/constants'
import { drawScene } from '../lib/renderer'
import { prepareCursorBitmaps, mapExportTimeToSourceTime } from '../lib/utils'

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

        // --- 1. SETUP CANVAS AND CONTEXT ---
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

        // --- 2. PREPARE STATE AND ASSETS ---
        useEditorStore.setState(projectState)
        let finalCursorBitmaps = new Map<string, CursorImageBitmap>()
        if (projectState.platform === 'win32' || projectState.platform === 'darwin') {
          if (projectState.cursorTheme) {
            const scale = (await window.electronAPI.getSetting<number>('recorder.cursorScale')) || 2
            log.info(`[RendererPage] Regenerating bitmaps for ${projectState.platform} at scale ${scale}x`)
            if (projectState.platform === 'win32') {
              finalCursorBitmaps = await prepareWindowsCursorBitmaps(projectState.cursorTheme, scale)
            } else {
              finalCursorBitmaps = await prepareMacOSCursorBitmaps(projectState.cursorTheme, scale)
            }
          }
        } else {
          log.info('[RendererPage] Preparing Linux bitmaps from project state.')
          finalCursorBitmaps = await prepareCursorBitmaps(projectState.cursorImages)
        }
        const projectStateWithCursorBitmaps = { ...projectState, cursorBitmapsToRender: finalCursorBitmaps }
        const bgImage = await loadBackgroundImage(projectState.frameStyles.background)

        // --- 3. LOAD VIDEO SOURCES ---
        const loadVideo = (videoElement: HTMLVideoElement, source: string, path: string): Promise<void> =>
          new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => {
              log.info(`[RendererPage] ${source} metadata loaded.`)
              resolve()
            }
            videoElement.onerror = (e) => reject(new Error(`Failed to load ${source}: ${e}`))
            videoElement.src = `media://${path}`
            videoElement.muted = true
            videoElement.load()
          })

        const loadPromises: Promise<void>[] = [loadVideo(video, 'Main video', projectStateWithCursorBitmaps.videoPath!)]
        const hasWebcam = Boolean(projectStateWithCursorBitmaps.webcamVideoPath && typeof projectStateWithCursorBitmaps.webcamVideoPath === 'string')
        if (hasWebcam && webcamVideo) {
          loadPromises.push(loadVideo(webcamVideo, 'Webcam video', projectStateWithCursorBitmaps.webcamVideoPath!))
        }
        await Promise.all(loadPromises)

        // --- 4. CALCULATE EXPORT DURATION AND FRAMES ---
        let exportDuration = projectState.duration
        Object.values(projectState.cutRegions).forEach((region) => (exportDuration -= region.duration))
        Object.values(projectState.speedRegions).forEach((region) => {
          exportDuration -= region.duration
          exportDuration += region.duration / region.speed
        })
        exportDuration = Math.max(0, exportDuration)
        const totalFrames = Math.floor(exportDuration * fps)
        log.info(
          `[RendererPage] Starting seek-driven rendering. Total frames: ${totalFrames}, Export duration: ${exportDuration.toFixed(2)}s`,
        )

        // --- 5. SETUP SEEK-DRIVEN RENDER LOOP ---
        const seekPromise = (videoElement: HTMLVideoElement) => {
          return new Promise<void>((resolve) => {
            const onSeeked = () => {
              videoElement.removeEventListener('seeked', onSeeked)
              resolve()
            }
            videoElement.addEventListener('seeked', onSeeked)
          })
        }

        for (let frame = 0; frame < totalFrames; frame++) {
          const exportTimestamp = frame / fps
          const sourceTimestamp = mapExportTimeToSourceTime(
            exportTimestamp,
            projectState.duration,
            projectState.cutRegions,
            projectState.speedRegions,
          )

          // Create seek promises for both videos
          const mainSeek = seekPromise(video)
          const webcamSeek = (hasWebcam && webcamVideo) ? seekPromise(webcamVideo) : Promise.resolve()

          // Set currentTime for both videos to trigger seeking
          video.currentTime = sourceTimestamp
          if (hasWebcam && webcamVideo) {
            webcamVideo.currentTime = sourceTimestamp
          }

          // Wait for both seeks to complete
          await Promise.all([mainSeek, webcamSeek])

          // Now that videos are at the correct time, draw the scene
          await drawScene(
            ctx,
            projectStateWithCursorBitmaps,
            video,
            webcamVideo,
            sourceTimestamp, // Use the precise source timestamp for drawing
            outputWidth,
            outputHeight,
            bgImage,
          )

          // Send the rendered frame to the main process
          const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight)
          const frameBuffer = Buffer.from(imageData.data.buffer)
          const progress = ((frame + 1) / totalFrames) * 100
          window.electronAPI.sendFrameToMain({ frame: frameBuffer, progress })
        }

        // --- 6. FINISH ---
        log.info('[RendererPage] Render loop finished. Sending "finishRender" signal.')
        window.electronAPI.finishRender()
      } catch (error) {
        log.error('[RendererPage] CRITICAL ERROR during render process:', error)
        window.electronAPI.finishRender() // Ensure we always finish, even on error
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
