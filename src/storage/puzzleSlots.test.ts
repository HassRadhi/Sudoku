import { describe, expect, it } from 'vitest'
import type { GameSessionV3 } from './gameSession'
import type { KeyValueStore } from './index'
import {
  SLOT_COUNT,
  clearPuzzleSlot,
  createEmptySlotsDocument,
  loadPuzzleSlots,
  parsePuzzleSlots,
  serializePuzzleSlots,
  writePuzzleSlot,
} from './puzzleSlots'

// SLOT_COUNT imported for assertions

function createMemoryStore(
  initial: Record<string, string> = {},
): KeyValueStore {
  const map = new Map(Object.entries(initial))
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value)
    },
    remove: (key) => {
      map.delete(key)
    },
  }
}

function sampleSession(): GameSessionV3 {
  return {
    version: 3,
    puzzle: `${'53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'}`,
    board: `${'53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'}`,
    notes: Array.from({ length: 81 }, () => 0),
    selected: 0,
    noteMode: false,
    annotations: { arrows: [], highlights: { cells: [], candidates: [] } },
    activeDigit: null,
    elapsedMs: 1200,
  }
}

describe('puzzleSlots', () => {
  it('round-trips an occupied slot', () => {
    const session = sampleSession()
    const doc = {
      version: 1 as const,
      slots: createEmptySlotsDocument().slots.map((slot, i) =>
        i === 3
          ? { occupied: true as const, savedAt: 1000, session }
          : slot,
      ),
    }
    expect(parsePuzzleSlots(serializePuzzleSlots(doc))).toEqual(doc)
  })

  it('loads empty document when missing or corrupt', () => {
    expect(loadPuzzleSlots(createMemoryStore())).toEqual(
      createEmptySlotsDocument(),
    )
    const store = createMemoryStore({ 'sudoku.puzzleSlots': '{' })
    expect(loadPuzzleSlots(store)).toEqual(createEmptySlotsDocument())
  })

  it('writes and clears a slot', () => {
    const store = createMemoryStore()
    const session = sampleSession()
    const written = writePuzzleSlot(store, 0, session, 42)
    expect(written?.slots[0]).toEqual({
      occupied: true,
      savedAt: 42,
      session,
    })
    const cleared = clearPuzzleSlot(store, 0)
    expect(cleared?.slots[0]).toEqual({ occupied: false })
    expect(loadPuzzleSlots(store).slots).toHaveLength(SLOT_COUNT)
  })

  it('rejects out-of-range slot indexes', () => {
    const store = createMemoryStore()
    expect(writePuzzleSlot(store, -1, sampleSession())).toBeNull()
    expect(writePuzzleSlot(store, SLOT_COUNT, sampleSession())).toBeNull()
    expect(clearPuzzleSlot(store, 99)).toBeNull()
  })

  it('migrates legacy 10-slot documents down to 9', () => {
    const session = sampleSession()
    const legacy = {
      version: 1,
      slots: Array.from({ length: 10 }, (_, i) =>
        i === 0
          ? { occupied: true, savedAt: 1, session }
          : { occupied: false },
      ),
    }
    const parsed = parsePuzzleSlots(JSON.stringify(legacy))
    expect(parsed?.slots).toHaveLength(SLOT_COUNT)
    expect(parsed?.slots[0]?.occupied).toBe(true)
  })
})
