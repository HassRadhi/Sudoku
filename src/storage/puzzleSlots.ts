/** Nine named save slots for puzzles set aside from the active session. */

import {
  parseGameSession,
  serializeGameSession,
  type GameSessionV3,
} from './gameSession'
import type { KeyValueStore } from './index'

export const PUZZLE_SLOTS_KEY = 'sudoku.puzzleSlots'
export const PUZZLE_SLOTS_VERSION = 1
export const SLOT_COUNT = 9

export type OccupiedPuzzleSlot = {
  occupied: true
  savedAt: number
  session: GameSessionV3
}

export type EmptyPuzzleSlot = {
  occupied: false
}

export type PuzzleSlot = OccupiedPuzzleSlot | EmptyPuzzleSlot

export type PuzzleSlotsDocument = {
  version: 1
  slots: PuzzleSlot[]
}

export function emptyPuzzleSlots(): PuzzleSlot[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ occupied: false }))
}

export function createEmptySlotsDocument(): PuzzleSlotsDocument {
  return { version: 1, slots: emptyPuzzleSlots() }
}

export function serializePuzzleSlots(doc: PuzzleSlotsDocument): string {
  return JSON.stringify({
    version: doc.version,
    slots: doc.slots.map((slot) => {
      if (!slot.occupied) return { occupied: false }
      return {
        occupied: true,
        savedAt: slot.savedAt,
        session: JSON.parse(serializeGameSession(slot.session)) as unknown,
      }
    }),
  })
}

export function parsePuzzleSlots(raw: string): PuzzleSlotsDocument | null {
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
  // Accept legacy 10-slot docs by keeping the first 9.
  if (
    !Array.isArray(record.slots) ||
    (record.slots.length !== SLOT_COUNT && record.slots.length !== 10)
  ) {
    return null
  }

  const slots: PuzzleSlot[] = []
  for (const item of record.slots.slice(0, SLOT_COUNT)) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return null
    }
    const slot = item as Record<string, unknown>
    if (slot.occupied === false) {
      slots.push({ occupied: false })
      continue
    }
    if (slot.occupied !== true) return null
    if (
      typeof slot.savedAt !== 'number' ||
      !Number.isFinite(slot.savedAt) ||
      slot.savedAt < 0
    ) {
      return null
    }
    const session = parseGameSession(JSON.stringify(slot.session))
    if (session === null) return null
    slots.push({
      occupied: true,
      savedAt: Math.floor(slot.savedAt),
      session,
    })
  }

  return { version: 1, slots }
}

export function loadPuzzleSlots(store: KeyValueStore): PuzzleSlotsDocument {
  const raw = store.get(PUZZLE_SLOTS_KEY)
  if (raw === null) return createEmptySlotsDocument()
  return parsePuzzleSlots(raw) ?? createEmptySlotsDocument()
}

export function savePuzzleSlots(
  store: KeyValueStore,
  doc: PuzzleSlotsDocument,
): void {
  store.set(PUZZLE_SLOTS_KEY, serializePuzzleSlots(doc))
}

/** Write a session into one slot (0–8). Returns null if index is out of range. */
export function writePuzzleSlot(
  store: KeyValueStore,
  index: number,
  session: GameSessionV3,
  savedAt: number = Date.now(),
): PuzzleSlotsDocument | null {
  if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) return null
  const doc = loadPuzzleSlots(store)
  const slots = doc.slots.slice()
  slots[index] = {
    occupied: true,
    savedAt: Math.floor(savedAt),
    session,
  }
  const next = { version: 1 as const, slots }
  savePuzzleSlots(store, next)
  return next
}

/** Clear one slot. Returns null if index is out of range. */
export function clearPuzzleSlot(
  store: KeyValueStore,
  index: number,
): PuzzleSlotsDocument | null {
  if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) return null
  const doc = loadPuzzleSlots(store)
  const slots = doc.slots.slice()
  slots[index] = { occupied: false }
  const next = { version: 1 as const, slots }
  savePuzzleSlots(store, next)
  return next
}
