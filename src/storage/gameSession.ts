/** Versioned play-session document. Structural validation only — no Sudoku rules. */

import type { Digits } from '../types'
import type { KeyValueStore } from './index'

/** localStorage key for the single in-progress session. */
export const GAME_SESSION_KEY = 'sudoku.gameSession'

export const GAME_SESSION_VERSION = 3

/** Classic 9×9 cell count for document shape checks. */
const CELL_COUNT = 81

/** Notes use one bit per digit 1–9 (bits 0–8). */
const NOTE_MASK_MAX = 0b1_1111_1111

export type SessionCandidateRef = {
  cell: number
  digit: number
}

export type SessionArrowColour = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'

export type SessionArrow = {
  id: string
  from: SessionCandidateRef
  to: SessionCandidateRef
  style: 'solid' | 'dotted'
  colour: SessionArrowColour
}

export type SessionCellHighlight = {
  cell: number
  colour: SessionArrowColour
}

export type SessionAnnotations = {
  arrows: SessionArrow[]
  highlights: {
    cells: SessionCellHighlight[]
    candidates: SessionCandidateRef[]
  }
}

/**
 * Persisted play session (v3).
 *
 * Undo/redo history (past/future) is intentionally omitted: smaller payload,
 * simpler reload semantics, and history resets on refresh.
 * Timer is always paused on load (`timerRunning` is not stored).
 */
export type GameSessionV3 = {
  version: 3
  /** Original puzzle string (81 chars, '.' = empty). */
  puzzle: string
  /** Current board string (81 chars, '.' = empty). */
  board: string
  /** Per-cell note bitmasks; length 81. */
  notes: number[]
  selected: number
  noteMode: boolean
  annotations: SessionAnnotations
  activeDigit: Digits | null
  elapsedMs: number
}

export type GameSession = GameSessionV3

/** @deprecated Prefer GameSessionV3 — kept for migration typing. */
export type GameSessionV2 = Omit<
  GameSessionV3,
  'version' | 'activeDigit' | 'elapsedMs'
> & {
  version: 2
}

export function emptySessionAnnotations(): SessionAnnotations {
  return { arrows: [], highlights: { cells: [], candidates: [] } }
}

export function serializeGameSession(session: GameSessionV3): string {
  return JSON.stringify(session)
}

/** Parse and validate a raw session string. Accepts v1–v3. */
export function parseGameSession(raw: string): GameSessionV3 | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(data)) return null
  if (data.version !== 1 && data.version !== 2 && data.version !== 3) {
    return null
  }
  if (!isPuzzleString(data.puzzle) || !isPuzzleString(data.board)) return null
  if (!isNotesArray(data.notes)) return null
  if (!isCellIndex(data.selected)) return null
  if (typeof data.noteMode !== 'boolean') return null

  const annotations = parseAnnotationsField(data.annotations)
  if (annotations === null) return null

  const activeDigit =
    data.version === 3 ? parseActiveDigit(data.activeDigit) : null
  if (data.version === 3 && activeDigit === undefined) return null

  const elapsedMs = data.version === 3 ? parseElapsedMs(data.elapsedMs) : 0
  if (data.version === 3 && elapsedMs === null) return null

  return {
    version: 3,
    puzzle: data.puzzle,
    board: data.board,
    notes: data.notes,
    selected: data.selected,
    noteMode: data.noteMode,
    annotations,
    activeDigit: activeDigit ?? null,
    elapsedMs: elapsedMs ?? 0,
  }
}

export function loadGameSession(store: KeyValueStore): GameSessionV3 | null {
  const raw = store.get(GAME_SESSION_KEY)
  if (raw === null) return null
  return parseGameSession(raw)
}

/** Persist a session. Store failures are absorbed by KeyValueStore. */
export function saveGameSession(
  store: KeyValueStore,
  session: GameSessionV3,
): void {
  store.set(GAME_SESSION_KEY, serializeGameSession(session))
}

function parseActiveDigit(value: unknown): Digits | null | undefined {
  if (value === null) return null
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  ) {
    return value as Digits
  }
  return undefined
}

function parseElapsedMs(value: unknown): number | null {
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  ) {
    return Math.floor(value)
  }
  return null
}

function parseAnnotationsField(value: unknown): SessionAnnotations | null {
  // v1 placeholder: empty array
  if (Array.isArray(value)) {
    return value.length === 0 ? emptySessionAnnotations() : null
  }
  if (!isRecord(value)) return null
  if (!Array.isArray(value.arrows) || !isRecord(value.highlights)) return null
  if (
    !Array.isArray(value.highlights.cells) ||
    !Array.isArray(value.highlights.candidates)
  ) {
    return null
  }

  const arrows: SessionArrow[] = []
  for (const item of value.arrows) {
    if (!isRecord(item)) return null
    if (typeof item.id !== 'string') return null
    if (item.style !== 'solid' && item.style !== 'dotted') return null
    if (!isArrowColour(item.colour)) return null
    if (!isCandidateRef(item.from) || !isCandidateRef(item.to)) return null
    arrows.push({
      id: item.id,
      from: { cell: item.from.cell, digit: item.from.digit },
      to: { cell: item.to.cell, digit: item.to.digit },
      style: item.style,
      colour: item.colour,
    })
  }

  const cells: SessionCellHighlight[] = []
  for (const item of value.highlights.cells) {
    // Legacy: bare cell index → colour a.
    if (typeof item === 'number') {
      if (!isCellIndex(item)) return null
      cells.push({ cell: item, colour: 'a' })
      continue
    }
    if (!isRecord(item) || !isCellIndex(item.cell)) return null
    if (!isArrowColour(item.colour)) return null
    cells.push({ cell: item.cell, colour: item.colour })
  }

  const candidates: SessionCandidateRef[] = []
  for (const cand of value.highlights.candidates) {
    if (!isCandidateRef(cand)) return null
    candidates.push({ cell: cand.cell, digit: cand.digit })
  }

  return { arrows, highlights: { cells, candidates } }
}

function isArrowColour(value: unknown): value is SessionArrowColour {
  return (
    value === 'a' ||
    value === 'b' ||
    value === 'c' ||
    value === 'd' ||
    value === 'e' ||
    value === 'f'
  )
}

function isCandidateRef(value: unknown): value is SessionCandidateRef {
  if (!isRecord(value)) return false
  return (
    isCellIndex(value.cell) &&
    typeof value.digit === 'number' &&
    Number.isInteger(value.digit) &&
    value.digit >= 1 &&
    value.digit <= 9
  )
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
