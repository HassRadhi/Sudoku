/** Sparse play preferences. Separate from the in-progress game session. */

import type { KeyValueStore } from './index'

export const PLAY_SETTINGS_KEY = 'sudoku.playSettings'
export const PLAY_SETTINGS_VERSION = 1

export type PlaySettingsV1 = {
  version: 1
  showTimer: boolean
  autoNotes: boolean
}

export type PlaySettings = PlaySettingsV1

export const DEFAULT_PLAY_SETTINGS: PlaySettingsV1 = {
  version: 1,
  showTimer: true,
  autoNotes: true,
}

export function serializePlaySettings(settings: PlaySettingsV1): string {
  return JSON.stringify(settings)
}

export function parsePlaySettings(raw: string): PlaySettingsV1 | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null
  }
  const record = data as Record<string, unknown>
  if (record.version !== 1) return null
  if (typeof record.showTimer !== 'boolean') return null
  if (typeof record.autoNotes !== 'boolean') return null
  return {
    version: 1,
    showTimer: record.showTimer,
    autoNotes: record.autoNotes,
  }
}

export function loadPlaySettings(store: KeyValueStore): PlaySettingsV1 {
  const raw = store.get(PLAY_SETTINGS_KEY)
  if (raw === null) return { ...DEFAULT_PLAY_SETTINGS }
  return parsePlaySettings(raw) ?? { ...DEFAULT_PLAY_SETTINGS }
}

export function savePlaySettings(
  store: KeyValueStore,
  settings: PlaySettingsV1,
): void {
  store.set(PLAY_SETTINGS_KEY, serializePlaySettings(settings))
}
