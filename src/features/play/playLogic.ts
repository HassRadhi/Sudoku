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
  serialiseBoard,
  setCell,
  type Board,
} from '../../engine'
import type { GameSessionV2 } from '../../storage'
import type { Digits } from '../../types'
import {
  type AnnotationArrow,
  type Annotations,
  type ArrowColour,
  type ArrowStyle,
  type CandidateRef,
  annotationsFromSession,
  annotationsToSession,
  createEmptyAnnotations,
  nextArrowId,
} from './annotations'

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
  annotations: Annotations
}

export type PlayState = {
  puzzle: string
  givens: boolean[]
  board: Board
  notes: NotesGrid
  annotations: Annotations
  selected: number
  noteMode: boolean
  /** Arrow draw style for the next Alt+drag. */
  arrowStyle: ArrowStyle
  arrowColour: ArrowColour
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
  | { type: 'loadPuzzle'; puzzle: string }
  | {
      type: 'addArrow'
      from: CandidateRef
      to: CandidateRef
    }
  | { type: 'selectArrow'; id: string | null }
  | { type: 'deleteArrow' }
  | { type: 'clearAnnotations' }
  | { type: 'toggleCellHighlight' }
  | { type: 'setArrowStyle'; style: ArrowStyle }
  | { type: 'setArrowColour'; colour: ArrowColour }

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
  const board = loadSampleBoard()
  return {
    puzzle: SAMPLE_PUZZLE,
    givens: buildGivens(board),
    board,
    notes: createEmptyNotes(),
    annotations: createEmptyAnnotations(),
    selected: 0,
    noteMode: false,
    arrowStyle: 'solid',
    arrowColour: 'a',
    past: [],
    future: [],
  }
}

/**
 * Hydrate play state from a persisted session.
 * Returns null if the board string is invalid or any given disagrees with the puzzle.
 * Undo history is not restored (session omits it by design).
 */
export function playStateFromSession(session: GameSessionV2): PlayState | null {
  const puzzleParsed = parseBoard(session.puzzle)
  if (!puzzleParsed.ok) return null
  const parsed = parseBoard(session.board)
  if (!parsed.ok) return null
  for (let i = 0; i < CELL_COUNT; i++) {
    const ch = session.puzzle[i]!
    if (ch === '.') continue
    if (parsed.board[i] !== Number(ch)) return null
  }
  return {
    puzzle: session.puzzle,
    givens: buildGivens(puzzleParsed.board),
    board: parsed.board,
    notes: session.notes.slice(),
    annotations: annotationsFromSession(session.annotations),
    selected: session.selected,
    noteMode: session.noteMode,
    arrowStyle: 'solid',
    arrowColour: 'a',
    past: [],
    future: [],
  }
}

/** Snapshot current play into a v2 session document (no undo stacks). */
export function sessionFromPlayState(state: PlayState): GameSessionV2 {
  return {
    version: 2,
    puzzle: state.puzzle,
    board: serialiseBoard(state.board),
    notes: state.notes.slice(),
    selected: state.selected,
    noteMode: state.noteMode,
    annotations: annotationsToSession(state.annotations),
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

function snapshotOf(state: PlayState): PlaySnapshot {
  return {
    board: state.board,
    notes: state.notes,
    annotations: state.annotations,
  }
}

function annotationsEqual(a: Annotations, b: Annotations): boolean {
  return (
    a === b ||
    (a.selectedArrowId === b.selectedArrowId &&
      a.arrows === b.arrows &&
      a.highlights === b.highlights)
  )
}

/** Apply board/notes/annotation mutation; push history only when something changed. */
function commitEdit(state: PlayState, next: PlaySnapshot): PlayState {
  if (
    next.board === state.board &&
    next.notes === state.notes &&
    annotationsEqual(next.annotations, state.annotations)
  ) {
    return state
  }
  const past = state.past.concat(snapshotOf(state))
  if (past.length > HISTORY_LIMIT) past.shift()
  return {
    ...state,
    board: next.board,
    notes: next.notes,
    annotations: next.annotations,
    past,
    future: [],
  }
}

function startPuzzle(puzzle: string): PlayState | null {
  const parsed = parseBoard(puzzle)
  if (!parsed.ok) return null
  return {
    puzzle,
    givens: buildGivens(parsed.board),
    board: parsed.board,
    notes: createEmptyNotes(),
    annotations: createEmptyAnnotations(),
    selected: 0,
    noteMode: false,
    arrowStyle: 'solid',
    arrowColour: 'a',
    past: [],
    future: [],
  }
}

export function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case 'select':
      return {
        ...state,
        selected: action.index,
        annotations: { ...state.annotations, selectedArrowId: null },
      }
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
            state.givens,
            state.selected,
            action.digit,
          ),
          annotations: state.annotations,
        })
      }
      const placed = placeDigit(
        state.board,
        state.notes,
        state.givens,
        state.selected,
        action.digit,
      )
      return commitEdit(state, {
        ...placed,
        annotations: state.annotations,
      })
    }
    case 'clear':
      return commitEdit(state, {
        ...clearCell(state.board, state.notes, state.givens, state.selected),
        annotations: state.annotations,
      })
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
        annotations: previous.annotations,
        past: state.past.slice(0, -1),
        future: state.future.concat(snapshotOf(state)),
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
        annotations: next.annotations,
        past: state.past.concat(snapshotOf(state)),
        future: state.future.slice(0, -1),
      }
    }
    case 'loadPuzzle':
      return startPuzzle(action.puzzle) ?? state
    case 'toggleCellHighlight': {
      const cell = state.selected
      const cells = state.annotations.highlights.cells
      const nextCells = cells.includes(cell)
        ? cells.filter((c) => c !== cell)
        : cells.concat(cell)
      return commitEdit(state, {
        board: state.board,
        notes: state.notes,
        annotations: {
          ...state.annotations,
          highlights: {
            ...state.annotations.highlights,
            cells: nextCells,
          },
        },
      })
    }
    case 'addArrow': {
      if (
        action.from.cell === action.to.cell &&
        action.from.digit === action.to.digit
      ) {
        return state
      }
      const arrow: AnnotationArrow = {
        id: nextArrowId(),
        from: action.from,
        to: action.to,
        style: state.arrowStyle,
        colour: state.arrowColour,
      }
      return commitEdit(state, {
        board: state.board,
        notes: state.notes,
        annotations: {
          ...state.annotations,
          arrows: state.annotations.arrows.concat(arrow),
          selectedArrowId: arrow.id,
        },
      })
    }
    case 'selectArrow':
      return {
        ...state,
        annotations: {
          ...state.annotations,
          selectedArrowId: action.id,
        },
      }
    case 'deleteArrow': {
      const id = state.annotations.selectedArrowId
      if (id === null) return state
      const arrows = state.annotations.arrows.filter((a) => a.id !== id)
      if (arrows.length === state.annotations.arrows.length) return state
      return commitEdit(state, {
        board: state.board,
        notes: state.notes,
        annotations: {
          ...state.annotations,
          arrows,
          selectedArrowId: null,
        },
      })
    }
    case 'clearAnnotations': {
      if (
        state.annotations.arrows.length === 0 &&
        state.annotations.highlights.cells.length === 0 &&
        state.annotations.highlights.candidates.length === 0
      ) {
        return state
      }
      return commitEdit(state, {
        board: state.board,
        notes: state.notes,
        annotations: createEmptyAnnotations(),
      })
    }
    case 'setArrowStyle':
      return { ...state, arrowStyle: action.style }
    case 'setArrowColour':
      return { ...state, arrowColour: action.colour }
  }
}
