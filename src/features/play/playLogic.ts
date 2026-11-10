import {
  CELL_COUNT,
  EMPTY,
  GRID_SIZE,
  cellIndex,
  colOf,
  digitBit,
  getCell,
  parseBoard,
  rowOf,
  setCell,
  type Board,
} from '../../engine'
import type { Digits } from '../../types'

/** Classic valid incomplete puzzle (Wikipedia sample). */
export const SAMPLE_PUZZLE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'

/** Per-cell user note bitmasks (same bit layout as engine candidates). */
export type NotesGrid = number[]

export function loadSampleBoard(): Board {
  const parsed = parseBoard(SAMPLE_PUZZLE)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.board
}

export function createEmptyNotes(): NotesGrid {
  return Array.from({ length: CELL_COUNT }, () => 0)
}

/** True where the initial puzzle had a digit (immutable givens). */
export function buildGivens(board: Board): boolean[] {
  return board.map((value) => value !== EMPTY)
}

/** Move selection by row/col delta; stops at board edges. */
export function moveSelection(
  selected: number,
  dRow: number,
  dCol: number,
): number {
  const nextRow = Math.min(GRID_SIZE - 1, Math.max(0, rowOf(selected) + dRow))
  const nextCol = Math.min(GRID_SIZE - 1, Math.max(0, colOf(selected) + dCol))
  return cellIndex(nextRow, nextCol)
}

/**
 * Place a digit and clear that cell's notes.
 * Peer notes are left alone (no auto-strip) — keep play simple until conflict UI.
 */
export function placeDigit(
  board: Board,
  notes: NotesGrid,
  givens: readonly boolean[],
  index: number,
  digit: Digits,
): { board: Board; notes: NotesGrid } {
  if (givens[index]) return { board, notes }
  const nextNotes = notes.slice()
  nextNotes[index] = 0
  return { board: setCell(board, index, digit), notes: nextNotes }
}

/** Clear digit and notes for an editable cell. */
export function clearCell(
  board: Board,
  notes: NotesGrid,
  givens: readonly boolean[],
  index: number,
): { board: Board; notes: NotesGrid } {
  if (givens[index]) return { board, notes }
  const nextNotes = notes.slice()
  nextNotes[index] = 0
  return { board: setCell(board, index, EMPTY), notes: nextNotes }
}

/** Toggle a note bit on an editable empty cell. */
export function toggleNote(
  board: Board,
  notes: NotesGrid,
  givens: readonly boolean[],
  index: number,
  digit: Digits,
): NotesGrid {
  if (givens[index] || getCell(board, index) !== EMPTY) return notes
  const next = notes.slice()
  next[index] = (next[index] ?? 0) ^ digitBit(digit)
  return next
}
