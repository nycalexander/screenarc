/* eslint-disable @typescript-eslint/no-explicit-any */

import log from 'electron-log/main';
import { createHash } from 'node:crypto';

const hash = (buffer: Buffer) => createHash('sha1').update(buffer).digest('hex');

let nativeModule: any;
const cursorImageMap: Record<string, string> = {};
let isInitialized = false;

// These IDs are standard macOS cursor identifiers.
const CURSOR_NAMES = [
  'arrow', 'IBeam', 'crosshair', 'closedHand', 'openHand', 'pointingHand'
];


export function initializeMacOSCursorManager() {
    try {

        for (const name of CURSOR_NAMES) {
            const payload = nativeModule.getCursorImagePngByName(name);
            const imageLength = payload.readInt32LE(0);
            const imageBuffer = payload.slice(4, imageLength);
            const imageKey = hash(imageBuffer);
            cursorImageMap[imageKey] = name;
        }
        isInitialized = true;
        log.info('[MacOSCursorManager] Initialized successfully with dylib and created image map.');
    } catch (e) {
        log.error('[MacOSCursorManager] Failed to initialize:', e);
    }
}

export function getCurrentCursorName(): string {
    if (!isInitialized) return 'arrow';
    try {
        const payload: Buffer = nativeModule.getCurrentCursorImagePng();

        const imageLength = payload.readInt32LE(0);
        const imageBuffer = payload.slice(4, imageLength);
        const imageKey = hash(imageBuffer);
        return cursorImageMap[imageKey] || 'arrow';
    } catch (e) {
        log.warn('[MacOSCursorManager] Could not get current cursor image:', e);
        return 'arrow';
    }
}