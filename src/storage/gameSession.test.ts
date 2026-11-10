import { describe, expect, it } from 'vitest'
import {
  GAME_SESSION_KEY,
  GAME_SESSION_VERSION,
  type GameSessionV3,
  emptySessionAnnotations,
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
  overrides: Partial<GameSessionV3> = {},
): GameSessionV3 {
  const notes = Array.from({ length: 81 }, () => 0)
  notes[2] = 0b1000 // digit 4
  return {
    version: GAME_SESSION_VERSION,
    puzzle: SAMPLE_PUZZLE,
    board:
      '534.7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
    notes,
    selected: 2,
    noteMode: true,
    annotations: emptySessionAnnotations(),
    activeDigit: 4,
    elapsedMs: 1500,
    ...overrides,
  }
}

describe('gameSession', () => {
  it('round-trips serialize/parse', () => {
    const session = sampleSession({
      annotations: {
        arrows: [
          {
            id: 'a1',
            from: { cell: 2, digit: 4 },
            to: { cell: 10, digit: 5 },
            style: 'dotted',
            colour: 'b',
          },
        ],
        highlights: {
          cells: [2],
          candidates: [{ cell: 2, digit: 4 }],
        },
      },
    })
    const parsed = parseGameSession(serializeGameSession(session))
    expect(parsed).toEqual(session)
  })

  it('migrates v1 empty annotations to v3', () => {
    const v1 = {
      version: 1,
      puzzle: SAMPLE_PUZZLE,
      board: SAMPLE_PUZZLE,
      notes: Array.from({ length: 81 }, () => 0),
      selected: 0,
      noteMode: false,
      annotations: [],
    }
    const parsed = parseGameSession(JSON.stringify(v1))
    expect(parsed).toEqual({
      version: 3,
      puzzle: SAMPLE_PUZZLE,
      board: SAMPLE_PUZZLE,
      notes: v1.notes,
      selected: 0,
      noteMode: false,
      annotations: emptySessionAnnotations(),
      activeDigit: null,
      elapsedMs: 0,
    })
  })

  it('migrates v2 sessions with default activeDigit and elapsedMs', () => {
    const v2 = {
      version: 2,
      puzzle: SAMPLE_PUZZLE,
      board: SAMPLE_PUZZLE,
      notes: Array.from({ length: 81 }, () => 0),
      selected: 3,
      noteMode: true,
      annotations: emptySessionAnnotations(),
    }
    const parsed = parseGameSession(JSON.stringify(v2))
    expect(parsed).toEqual({
      version: 3,
      puzzle: SAMPLE_PUZZLE,
      board: SAMPLE_PUZZLE,
      notes: v2.notes,
      selected: 3,
      noteMode: true,
      annotations: emptySessionAnnotations(),
      activeDigit: null,
      elapsedMs: 0,
    })
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
      parseGameSession(JSON.stringify({ ...sampleSession(), version: 99 })),
    ).toBeNull()
    expect(
      parseGameSession(
        JSON.stringify({ ...sampleSession(), board: 'too-short' }),
      ),
    ).toBeNull()
    expect(
      parseGameSession(JSON.stringify({ ...sampleSession(), selected: 81 })),
    ).toBeNull()
    expect(
      parseGameSession(
        JSON.stringify({ ...sampleSession(), activeDigit: 0 }),
      ),
    ).toBeNull()
    expect(
      parseGameSession(
        JSON.stringify({ ...sampleSession(), elapsedMs: -1 }),
      ),
    ).toBeNull()
    const badNotes = Array.from({ length: 81 }, () => 0)
    badNotes[0] = 0b10_0000_0000 // bit 9 out of note mask
    expect(
      parseGameSession(JSON.stringify({ ...sampleSession(), notes: badNotes })),
    ).toBeNull()
  })

  it('returns null when the store is empty', () => {
    expect(loadGameSession(createMemoryStore())).toBeNull()
  })
})
