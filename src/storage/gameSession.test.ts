import { describe, expect, it } from 'vitest'
import {
  GAME_SESSION_KEY,
  GAME_SESSION_VERSION,
  type GameSessionV1,
  loadGameSession,
  parseGameSession,
  saveGameSession,
  serializeGameSession,
} from './gameSession'
import type { KeyValueStore } from './index'

const SAMPLE_PUZZLE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'

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

function sampleSession(
  overrides: Partial<GameSessionV1> = {},
): GameSessionV1 {
  const notes = Array.from({ length: 81 }, () => 0)
  notes[2] = 0b1000 // digit 4
  return {
    version: GAME_SESSION_VERSION,
    puzzle: SAMPLE_PUZZLE,
    board: '534.7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
    notes,
    selected: 2,
    noteMode: true,
    annotations: [],
    ...overrides,
  }
}

describe('gameSession', () => {
  it('round-trips serialize/parse', () => {
    const session = sampleSession()
    const parsed = parseGameSession(serializeGameSession(session))
    expect(parsed).toEqual(session)
  })

  it('round-trips through an in-memory KeyValueStore', () => {
    const store = createMemoryStore()
    const session = sampleSession()
    saveGameSession(store, session)
    expect(loadGameSession(store)).toEqual(session)
    expect(store.get(GAME_SESSION_KEY)).toBe(serializeGameSession(session))
  })

  it('rejects corrupt JSON and unsupported versions safely', () => {
    expect(parseGameSession('not-json')).toBeNull()
    expect(parseGameSession('null')).toBeNull()
    expect(parseGameSession('[]')).toBeNull()
    expect(
      parseGameSession(
        JSON.stringify({ ...sampleSession(), version: 99 }),
      ),
    ).toBeNull()
    expect(
      parseGameSession(
        JSON.stringify({ ...sampleSession(), board: 'too-short' }),
      ),
    ).toBeNull()
    expect(
      parseGameSession(
        JSON.stringify({ ...sampleSession(), selected: 81 }),
      ),
    ).toBeNull()
    expect(
      parseGameSession(
        JSON.stringify({
          ...sampleSession(),
          notes: Array.from({ length: 81 }, () => 9999),
        }),
      ),
    ).toBeNull()
    expect(loadGameSession(createMemoryStore())).toBeNull()
    expect(
      loadGameSession(
        createMemoryStore({ [GAME_SESSION_KEY]: '{bad' }),
      ),
    ).toBeNull()
  })
})
