import {
  CELL_COUNT,
  EMPTY,
  GRID_SIZE,
  applyMove,
  cellIndex,
  colOf,
  computeCandidates,
  digitBit,
  findNextMove,
  getCell,
  parseBoard,
  peersOf,
  rowOf,
  serialiseBoard,
  setCell,
  type Board,
  type SolveMove,
} from '../../engine'
import type { GameSessionV3 } from '../../storage'
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

export type HintFocus = {
  cells: number[]
  candidates: CandidateRef[]
}

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
  /** Last digit filter in digit mode; not part of undo history. */
  activeDigit: Digits | null
  /** Ephemeral solver focus; cleared on the next input. */
  hintFocus: HintFocus | null
  /** Accumulated play time; not part of undo history. */
  elapsedMs: number
  past: PlaySnapshot[]
  future: PlaySnapshot[]
}

export type PlayAction =
  | { type: 'select'; index: number }
  | { type: 'move'; dRow: number; dCol: number }
  | { type: 'enterDigit'; digit: Digits }
  | { type: 'clear' }
  | { type: 'clearActiveDigit' }
  | { type: 'toggleNoteMode' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'loadPuzzle'; puzzle: string; autoNotes?: boolean }
  | { type: 'resetPuzzle'; autoNotes?: boolean }
  | { type: 'refillNotes' }
  | {
      type: 'applyHint'
      step: { board: Board; notes: NotesGrid; move: SolveMove }
    }
  | { type: 'setElapsedMs'; elapsedMs: number }
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

/** Engine candidates as a notes grid (filled cells stay 0). */
export function notesFromBoard(board: Board): NotesGrid {
  return computeCandidates(board)
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
    notes: notesFromBoard(board),
    annotations: createEmptyAnnotations(),
    selected: 0,
    noteMode: false,
    arrowStyle: 'solid',
    arrowColour: 'a',
    activeDigit: null,
    hintFocus: null,
    elapsedMs: 0,
    past: [],
    future: [],
  }
}

/**
 * Hydrate play state from a persisted session.
 * Returns null if the board string is invalid or any given disagrees with the puzzle.
 * Undo history is not restored (session omits it by design).
 */
export function playStateFromSession(session: GameSessionV3): PlayState | null {
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
    activeDigit: session.activeDigit,
    hintFocus: null,
    elapsedMs: session.elapsedMs,
    past: [],
    future: [],
  }
}

/** Snapshot current play into a v3 session document (no undo stacks). */
export function sessionFromPlayState(state: PlayState): GameSessionV3 {
  return {
    version: 3,
    puzzle: state.puzzle,
    board: serialiseBoard(state.board),
    notes: state.notes.slice(),
    selected: state.selected,
    noteMode: state.noteMode,
    annotations: annotationsToSession(state.annotations),
    activeDigit: state.activeDigit,
    elapsedMs: state.elapsedMs,
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
 * Place a digit, clear that cell's notes, and strip the digit from peer notes.
 */
export function placeDigit(
  board: Board,
  notes: NotesGrid,
  givens: readonly boolean[],
  index: number,
  digit: Digits,
): { board: Board; notes: NotesGrid } {
  if (givens[index]) return { board, notes }
  const bit = digitBit(digit)
  const sameDigit = getCell(board, index) === digit
  const cellNotesClear = (notes[index] ?? 0) === 0
  let peersNeedStrip = false
  if (cellNotesClear && sameDigit) {
    for (const peer of peersOf(index)) {
      if (((notes[peer] ?? 0) & bit) !== 0) {
        peersNeedStrip = true
        break
      }
    }
    if (!peersNeedStrip) return { board, notes }
  }

  const nextNotes = notes.slice()
  nextNotes[index] = 0
  for (const peer of peersOf(index)) {
    nextNotes[peer] = (nextNotes[peer] ?? 0) & ~bit
  }
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

/**
 * One logical solver step from board-derived candidates.
 * Notes are replaced with the post-move candidate grid.
 */
export function applyHintStep(
  board: Board,
): { board: Board; notes: NotesGrid; move: SolveMove } | null {
  const candidates = computeCandidates(board)
  const move = findNextMove(board, candidates)
  if (move === null) return null
  const next = applyMove({ board, candidates }, move)
  return { board: next.board, notes: next.candidates, move }
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
function commitEdit(
  state: PlayState,
  next: PlaySnapshot,
  extras: Partial<PlayState> = {},
): PlayState {
  if (
    next.board === state.board &&
    next.notes === state.notes &&
    annotationsEqual(next.annotations, state.annotations)
  ) {
    return { ...state, hintFocus: null, ...extras }
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
    hintFocus: null,
    ...extras,
  }
}

function startPuzzle(
  puzzle: string,
  autoNotes: boolean,
  elapsedMs = 0,
): PlayState | null {
  const parsed = parseBoard(puzzle)
  if (!parsed.ok) return null
  return {
    puzzle,
    givens: buildGivens(parsed.board),
    board: parsed.board,
    notes: autoNotes ? notesFromBoard(parsed.board) : createEmptyNotes(),
    annotations: createEmptyAnnotations(),
    selected: 0,
    noteMode: false,
    arrowStyle: 'solid',
    arrowColour: 'a',
    activeDigit: null,
    hintFocus: null,
    elapsedMs,
    past: [],
    future: [],
  }
}

function withoutHint(state: PlayState): PlayState {
  return state.hintFocus === null ? state : { ...state, hintFocus: null }
}

export function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case 'select':
      return {
        ...withoutHint(state),
        selected: action.index,
        annotations: { ...state.annotations, selectedArrowId: null },
      }
    case 'move':
      return {
        ...withoutHint(state),
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
      return commitEdit(
        state,
        { ...placed, annotations: state.annotations },
        { activeDigit: action.digit },
      )
    }
    case 'clear':
      return commitEdit(state, {
        ...clearCell(state.board, state.notes, state.givens, state.selected),
        annotations: state.annotations,
      })
    case 'clearActiveDigit':
      if (state.activeDigit === null && state.hintFocus === null) return state
      return { ...state, activeDigit: null, hintFocus: null }
    case 'toggleNoteMode':
      return { ...withoutHint(state), noteMode: !state.noteMode }
    case 'undo': {
      if (state.past.length === 0) return withoutHint(state)
      const previous = state.past[state.past.length - 1]
      if (previous === undefined) return withoutHint(state)
      return {
        ...state,
        board: previous.board,
        notes: previous.notes,
        annotations: previous.annotations,
        past: state.past.slice(0, -1),
        future: state.future.concat(snapshotOf(state)),
        hintFocus: null,
      }
    }
    case 'redo': {
      if (state.future.length === 0) return withoutHint(state)
      const next = state.future[state.future.length - 1]
      if (next === undefined) return withoutHint(state)
      return {
        ...state,
        board: next.board,
        notes: next.notes,
        annotations: next.annotations,
        past: state.past.concat(snapshotOf(state)),
        future: state.future.slice(0, -1),
        hintFocus: null,
      }
    }
    case 'loadPuzzle':
      return (
        startPuzzle(action.puzzle, action.autoNotes !== false) ??
        withoutHint(state)
      )
    case 'resetPuzzle': {
      const next = startPuzzle(
        state.puzzle,
        action.autoNotes !== false,
        0,
      )
      if (next === null) return withoutHint(state)
      return {
        ...next,
        // Keep current selection prefs that are not puzzle-specific.
        noteMode: state.noteMode,
        arrowStyle: state.arrowStyle,
        arrowColour: state.arrowColour,
      }
    }
    case 'refillNotes': {
      const notes = notesFromBoard(state.board)
      if (notes.every((mask, i) => mask === (state.notes[i] ?? 0))) {
        return withoutHint(state)
      }
      return commitEdit(state, {
        board: state.board,
        notes,
        annotations: state.annotations,
      })
    }
    case 'applyHint': {
      const focus: HintFocus = {
        cells: action.step.move.focusCells.slice(),
        candidates: action.step.move.focusCandidates.map((c) => ({
          cell: c.cell,
          digit: c.digit,
        })),
      }
      return commitEdit(
        state,
        {
          board: action.step.board,
          notes: action.step.notes,
          annotations: state.annotations,
        },
        { hintFocus: focus },
      )
    }
    case 'setElapsedMs':
      if (action.elapsedMs === state.elapsedMs) return state
      return { ...state, elapsedMs: action.elapsedMs }
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
        return withoutHint(state)
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
        ...withoutHint(state),
        annotations: {
          ...state.annotations,
          selectedArrowId: action.id,
        },
      }
    case 'deleteArrow': {
      const id = state.annotations.selectedArrowId
      if (id === null) return withoutHint(state)
      const arrows = state.annotations.arrows.filter((a) => a.id !== id)
      if (arrows.length === state.annotations.arrows.length) {
        return withoutHint(state)
      }
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
        return withoutHint(state)
      }
      return commitEdit(state, {
        board: state.board,
        notes: state.notes,
        annotations: createEmptyAnnotations(),
      })
    }
    case 'setArrowStyle':
      return { ...withoutHint(state), arrowStyle: action.style }
    case 'setArrowColour':
      return { ...withoutHint(state), arrowColour: action.colour }
  }
}
