// Handlers for desktop-related IPC (displays, sources, cursor).

import { IpcMainEvent, IpcMainInvokeEvent, screen, dialog, app } from 'electron'
import { exec } from 'node:child_process'
import log from 'electron-log/main'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getFFmpegPath, getBinaryPath } from '../../lib/utils'
import { getCursorScale, setCursorScale } from '../../features/cursor-manager'
import { loadCursorThemeFromFile } from '../../lib/cursor-theme-parser'
import { mapCursorNameToIDC } from '../../lib/win-cursor-manager'
import { CursorTheme } from '../../types'

export function getDisplays() {
  const primaryDisplay = screen.getPrimaryDisplay()
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    name: `Display ${index + 1} (${display.bounds.width}x${display.bounds.height})`,
    bounds: display.bounds,
    isPrimary: display.id === primaryDisplay.id,
  }))
}

export function handleGetCursorScale() {
  return getCursorScale()
}

export function handleSetCursorScale(_event: IpcMainEvent, scale: number) {
  setCursorScale(scale)
}

export function showSaveDialog(_event: IpcMainInvokeEvent, options: Electron.SaveDialogOptions) {
  return dialog.showSaveDialog(options)
}

export async function getVideoFrame(
  _event: IpcMainInvokeEvent,
  { videoPath, time }: { videoPath: string; time: number },
): Promise<string> {
  const FFMPEG_PATH = getFFmpegPath()
  return new Promise((resolve, reject) => {
    const command = `"${FFMPEG_PATH}" -ss ${time} -i "${videoPath}" -vframes 1 -f image2pipe -c:v png -`
    exec(command, { encoding: 'binary', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        log.error(`[Desktop] FFmpeg frame extraction error: ${stderr}`)
        return reject(error)
      }
      resolve(`data:image/png;base64,${Buffer.from(stdout, 'binary').toString('base64')}`)
    })
  })
}

export async function getDshowDevices(): Promise<{
  video: { name: string; alternativeName: string }[]
  audio: { name: string; alternativeName: string }[]
}> {
  if (process.platform !== 'win32') {
    return { video: [], audio: [] }
  }

  const FFMPEG_PATH = getFFmpegPath()
  const command = `"${FFMPEG_PATH}" -hide_banner -list_devices true -f dshow -i dummy`

  return new Promise((resolve) => {
    exec(command, (_error, _stdout, stderr) => {
      // The command is expected to "fail" and output to stderr, which is normal for this command.
      const lines = stderr.split('\n')
      const video: { name: string; alternativeName: string }[] = []
      const audio: { name: string; alternativeName: string }[] = []

      let lastDevice: { name: string; type: 'video' | 'audio' } | null = null

      for (const line of lines) {
        const friendlyNameMatch = line.match(/\[dshow.*\] "([^"]+)" \((video|audio)\)/)
        if (friendlyNameMatch) {
          const [, name, type] = friendlyNameMatch
          lastDevice = { name, type: type as 'video' | 'audio' }
          continue
        }

        const altNameMatch = line.match(/\[dshow.*\]\s+Alternative name "([^"]+)"/)
        if (altNameMatch && lastDevice) {
          const [, alternativeName] = altNameMatch
          if (lastDevice.type === 'video') {
            video.push({ name: lastDevice.name, alternativeName })
          } else {
            audio.push({ name: lastDevice.name, alternativeName })
          }
          lastDevice = null // Reset for the next device
        }
      }

      log.info(`[Desktop] Found dshow devices: ${video.length} video, ${audio.length} audio.`)
      resolve({ video, audio })
    })
  })
}

export async function getCursorThemes(): Promise<string[]> {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    return []
  }
  log.info('[IPC] Received request to get cursor themes')
  try {
    const platform = process.platform === 'win32' ? 'windows' : 'darwin'
    let themesDir: string

    if (app.isPackaged) {
      themesDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'binaries', platform, 'cursor-themes')
    } else {
      themesDir = path.join(process.env.APP_ROOT!, 'binaries', platform, 'cursor-themes')
    }

    const files = await fs.readdir(themesDir)
    const themeNames = files.filter((file) => file.endsWith('.theme')).map((file) => path.parse(file).name)
    log.info(`[IPC] Found cursor themes: ${themeNames.join(', ')}`)
    return themeNames
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.error('[IPC] Failed to list cursor themes:', error)
    } else {
      log.warn('[IPC] Cursor themes directory not found.')
    }
    return ['default'] // Always return at least default if an error occurs
  }
}

export async function loadCursorTheme(
  _event: IpcMainInvokeEvent,
  themeName: string | undefined,
): Promise<CursorTheme | null> {
  const themeToLoad = themeName || 'default'
  log.info(`[IPC] Received request to parse cursor theme: ${themeToLoad}`)
  try {
    const cursorThemePath = getBinaryPath(path.join('cursor-themes', `${themeToLoad}.theme`))
    const cursorTheme = await loadCursorThemeFromFile(cursorThemePath)
    return cursorTheme
  } catch (error) {
    log.error(`[IPC] Failed to parse cursor theme file '${themeToLoad}.theme':`, error)
    return null
  }
}

export function handleMapCursorNameToIDC(_event: IpcMainInvokeEvent, name: string) {
  return mapCursorNameToIDC(name)
}
