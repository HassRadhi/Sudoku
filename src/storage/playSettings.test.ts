import { describe, expect, it } from 'vitest'
import type { KeyValueStore } from './index'
import {
  DEFAULT_PLAY_SETTINGS,
  PLAY_SETTINGS_KEY,
  loadPlaySettings,
  parsePlaySettings,
  savePlaySettings,
  serializePlaySettings,
} from './playSettings'

function createMemoryStore(
  initial: Record<string, string> = {},
): KeyValueStore {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    get(key) {
      return map.get(key) ?? null
    },
    set(key, value) {
      map.set(key, value)
    },
    remove(key) {
      map.delete(key)
    },
  }
}

describe('playSettings', () => {
  it('round-trips serialize/parse', () => {
    const settings = {
      version: 1 as const,
      showTimer: false,
      autoNotes: false,
    }
    expect(parsePlaySettings(serializePlaySettings(settings))).toEqual(settings)
  })

  it('loads defaults when missing or corrupt', () => {
    expect(loadPlaySettings(createMemoryStore())).toEqual(DEFAULT_PLAY_SETTINGS)
    const store = createMemoryStore({ [PLAY_SETTINGS_KEY]: 'nope' })
    expect(loadPlaySettings(store)).toEqual(DEFAULT_PLAY_SETTINGS)
  })

  it('persists through the store', () => {
    const store = createMemoryStore()
    const settings = { version: 1 as const, showTimer: false, autoNotes: true }
    savePlaySettings(store, settings)
    expect(loadPlaySettings(store)).toEqual(settings)
  })
})
