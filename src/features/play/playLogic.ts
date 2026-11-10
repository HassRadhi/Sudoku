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

/** Cap undo stack so repeated play stays bounded. */
export const HISTORY_LIMIT = 100

/** Per-cell user note bitmasks (same bit layout as engine candidates). */
export type NotesGrid = number[]

export type PlaySnapshot = {
  board: Board
  notes: NotesGrid
}

export type PlayState = {
  board: Board
  notes: NotesGrid
  selected: number
  noteMode: boolean
  past: PlaySnapshot[]
  future: PlaySnapshot[]
}

export type PlayAction =
  | { type: 'select'; index: number }
  | { type: 'move'; dRow: number; dCol: number }
  | { type: 'enterDigit'; digit: Digits }
  | { type: 'clear' }
  | { type: 'toggleNoteMode' }
  | { type: 'undo' }
  | { type: 'redo' }

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

export const SAMPLE_GIVENS = buildGivens(loadSampleBoard())

export function createInitialPlayState(): PlayState {
  return {
    board: loadSampleBoard(),
    notes: createEmptyNotes(),
    selected: 0,
    noteMode: false,
    past: [],
    future: [],
  }
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
 * Peer notes are left alone (no auto-strip).
 */
export function placeDigit(
  board: Board,
  notes: NotesGrid,
  givens: readonly boolean[],
  index: number,
  digit: Digits,
): { board: Board; notes: NotesGrid } {
  if (givens[index]) return { board, notes }
  // Same digit + notes already clear: keep refs so history skips no-ops.
  if (getCell(board, index) === digit && (notes[index] ?? 0) === 0) {
    return { board, notes }
  }
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
  if (getCell(board, index) === EMPTY && (notes[index] ?? 0) === 0) {
    return { board, notes }
  }
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

/** Apply board/notes mutation; push history only when something actually changed. */
function commitEdit(state: PlayState, next: PlaySnapshot): PlayState {
  if (next.board === state.board && next.notes === state.notes) return state
  const past = state.past.concat({ board: state.board, notes: state.notes })
  if (past.length > HISTORY_LIMIT) past.shift()
  return {
    ...state,
    board: next.board,
    notes: next.notes,
    past,
    future: [],
  }
}

export function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case 'select':
      return { ...state, selected: action.index }
    case 'move':
      return {
        ...state,
        selected: moveSelection(state.selected, action.dRow, action.dCol),
      }
    case 'enterDigit': {
      if (state.noteMode) {
        return commitEdit(state, {
          board: state.board,
          notes: toggleNote(
            state.board,
            state.notes,
            SAMPLE_GIVENS,
            state.selected,
            action.digit,
          ),
        })
      }
      return commitEdit(
        state,
        placeDigit(
          state.board,
          state.notes,
          SAMPLE_GIVENS,
          state.selected,
          action.digit,
        ),
      )
    }
    case 'clear':
      return commitEdit(
        state,
        clearCell(state.board, state.notes, SAMPLE_GIVENS, state.selected),
      )
    case 'toggleNoteMode':
      return { ...state, noteMode: !state.noteMode }
    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      if (previous === undefined) return state
      return {
        ...state,
        board: previous.board,
        notes: previous.notes,
        past: state.past.slice(0, -1),
        future: state.future.concat({
          board: state.board,
          notes: state.notes,
        }),
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const next = state.future[state.future.length - 1]
      if (next === undefined) return state
      return {
        ...state,
        board: next.board,
        notes: next.notes,
        past: state.past.concat({ board: state.board, notes: state.notes }),
        future: state.future.slice(0, -1),
      }
    }
  }
}
