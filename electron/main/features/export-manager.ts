// Contains business logic for video export.

import log from 'electron-log/main'
import { BrowserWindow, IpcMainInvokeEvent, ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { appState } from '../state'
import { getFFmpegPath, calculateExportDimensions } from '../lib/utils'
import { VITE_DEV_SERVER_URL, RENDERER_DIST, PRELOAD_SCRIPT } from '../lib/constants'

const FFMPEG_PATH = getFFmpegPath()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function startExport(event: IpcMainInvokeEvent, { projectState, exportSettings, outputPath }: any) {
  log.info('[ExportManager] Starting export process...')
  const editorWindow = BrowserWindow.fromWebContents(event.sender)
  if (!editorWindow) return

  if (appState.renderWorker) {
    appState.renderWorker.close()
  }
  appState.renderWorker = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      offscreen: true,
      webSecurity: false,
    },
  })
  if (VITE_DEV_SERVER_URL) {
    const renderUrl = `${VITE_DEV_SERVER_URL}#renderer`
    appState.renderWorker.loadURL(renderUrl)
    log.info(`[ExportManager] Loading render worker URL (Dev): ${renderUrl}`)
  } else {
    const renderPath = path.join(RENDERER_DIST, 'index.html')
    appState.renderWorker.loadFile(renderPath, { hash: 'renderer' })
    log.info(`[ExportManager] Loading render worker file (Prod): ${renderPath}#renderer`)
  }

  const { resolution, fps, format } = exportSettings
  const { width: outputWidth, height: outputHeight } = calculateExportDimensions(resolution, projectState.aspectRatio)

  const ffmpegArgs = [
    '-y',
    '-f',
    'rawvideo',
    '-vcodec',
    'rawvideo',
    '-pix_fmt',
    'rgba',
    '-s',
    `${outputWidth}x${outputHeight}`,
    '-r',
    fps.toString(),
    '-i',
    '-',
  ]
  if (format === 'mp4') {
    ffmpegArgs.push('-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p')
  } else {
    ffmpegArgs.push('-vf', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse')
  }
  ffmpegArgs.push(outputPath)

  log.info('[ExportManager] Spawning FFmpeg with args:', ffmpegArgs.join(' '))
  const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs)
  let ffmpegClosed = false

  ffmpeg.stderr.on('data', (data) => log.info(`[FFmpeg stderr]: ${data.toString()}`))

  const cancellationHandler = () => {
    log.warn('[ExportManager] Received "export:cancel". Terminating export.')
    if (ffmpeg && !ffmpeg.killed) {
      ffmpeg.kill('SIGKILL')
    }
    if (appState.renderWorker && !appState.renderWorker.isDestroyed()) {
      appState.renderWorker.close()
    }
    if (fs.existsSync(outputPath)) {
      fsPromises.unlink(outputPath).catch((err) => log.error('Failed to delete cancelled export file:', err))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frameListener = (_e: any, { frame, progress }: { frame: Buffer; progress: number }) => {
    if (!ffmpegClosed && ffmpeg.stdin.writable) ffmpeg.stdin.write(frame)
    if (editorWindow && !editorWindow.isDestroyed()) {
      editorWindow.webContents.send('export:progress', { progress, stage: 'Rendering...' })
    }
  }

  const finishListener = () => {
    log.info('[ExportManager] Render finished. Closing FFmpeg stdin.')
    if (!ffmpegClosed && ffmpeg.stdin.writable) {
      ffmpeg.stdin.end()
    }
  }

  ipcMain.on('export:frame-data', frameListener)
  ipcMain.on('export:render-finished', finishListener)
  ipcMain.once('export:cancel', cancellationHandler) // Use once to avoid multiple calls

  ffmpeg.on('close', (code) => {
    ffmpegClosed = true
    log.info(`[ExportManager] FFmpeg process exited with code ${code}.`)
    if (appState.renderWorker && !appState.renderWorker.isDestroyed()) {
      appState.renderWorker.close()
    }
    appState.renderWorker = null

    // Check if the editor window still exists before sending a message
    if (editorWindow && !editorWindow.isDestroyed()) {
      if (code === null) {
        // Cancelled by SIGKILL
        editorWindow.webContents.send('export:complete', { success: false, error: 'Export cancelled.' })
      } else if (code === 0) {
        editorWindow.webContents.send('export:complete', { success: true, outputPath })
      } else {
        editorWindow.webContents.send('export:complete', { success: false, error: `FFmpeg exited with code ${code}` })
      }
    } else {
      log.warn('[ExportManager] Editor window was destroyed. Could not send export:complete message.')
    }

    // Clean up all listeners
    ipcMain.removeListener('export:frame-data', frameListener)
    ipcMain.removeListener('export:render-finished', finishListener)
    ipcMain.removeListener('export:cancel', cancellationHandler)
  })

  ipcMain.once('render:ready', () => {
    log.info('[ExportManager] Worker ready. Sending project state.')
    if (appState.renderWorker && !appState.renderWorker.isDestroyed()) {
      appState.renderWorker.webContents.send('render:start', { projectState, exportSettings })
    }
  })
}