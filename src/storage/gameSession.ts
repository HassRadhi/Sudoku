/** Versioned play-session document. Structural validation only — no Sudoku rules. */

import type { KeyValueStore } from './index'

/** localStorage key for the single in-progress session. */
export const GAME_SESSION_KEY = 'sudoku.gameSession'

export const GAME_SESSION_VERSION = 1

/** Classic 9×9 cell count for document shape checks. */
const CELL_COUNT = 81

/** Notes use one bit per digit 1–9 (bits 0–8). */
const NOTE_MASK_MAX = 0b1_1111_1111

/**
 * Persisted play session (v1).
 *
 * Undo/redo history (past/future) is intentionally omitted: smaller payload,
 * simpler reload semantics, and history resets on refresh.
 */
export type GameSessionV1 = {
  version: 1
  /** Original puzzle string (81 chars, '.' = empty). */
  puzzle: string
  /** Current board string (81 chars, '.' = empty). */
  board: string
  /** Per-cell note bitmasks; length 81. */
  notes: number[]
  selected: number
  noteMode: boolean
  /** Forward-compat placeholder; unused in v1. */
  annotations: []
}

export function serializeGameSession(session: GameSessionV1): string {
  return JSON.stringify(session)
}

/** Parse and validate a raw session string. Returns null if corrupt/unsupported. */
export function parseGameSession(raw: string): GameSessionV1 | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(data)) return null
  if (data.version !== GAME_SESSION_VERSION) return null
  if (!isPuzzleString(data.puzzle) || !isPuzzleString(data.board)) return null
  if (!isNotesArray(data.notes)) return null
  if (!isCellIndex(data.selected)) return null
  if (typeof data.noteMode !== 'boolean') return null
  if (!Array.isArray(data.annotations)) return null

  return {
    version: 1,
    puzzle: data.puzzle,
    board: data.board,
    notes: data.notes,
    selected: data.selected,
    noteMode: data.noteMode,
    annotations: [],
  }
}

export function loadGameSession(store: KeyValueStore): GameSessionV1 | null {
  const raw = store.get(GAME_SESSION_KEY)
  if (raw === null) return null
  return parseGameSession(raw)
}

/** Persist a session. Store failures are absorbed by KeyValueStore. */
export function saveGameSession(
  store: KeyValueStore,
  session: GameSessionV1,
): void {
  store.set(GAME_SESSION_KEY, serializeGameSession(session))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPuzzleString(value: unknown): value is string {
  if (typeof value !== 'string' || value.length !== CELL_COUNT) return false
  for (let i = 0; i < CELL_COUNT; i++) {
    const ch = value[i]!
    if (ch !== '.' && (ch < '1' || ch > '9')) return false
  }
  return true
}

function isNotesArray(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length !== CELL_COUNT) return false
  for (let i = 0; i < CELL_COUNT; i++) {
    const n = value[i]
    if (
      typeof n !== 'number' ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > NOTE_MASK_MAX
    ) {
      return false
    }
  }
  return true
}

function isCellIndex(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < CELL_COUNT
  )
}
