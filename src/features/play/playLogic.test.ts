import { describe, expect, it } from 'vitest'
import { cellEmphasis } from '../../components/boardEmphasis'
import {
  EMPTY,
  computeCandidates,
  digitBit,
  getCell,
  maskHas,
  parseBoard,
  peersOf,
} from '../../engine'
import {
  HISTORY_LIMIT,
  SAMPLE_PUZZLE,
  applyHintStep,
  buildGivens,
  clearCell,
  createEmptyNotes,
  createInitialPlayState,
  loadSampleBoard,
  moveSelection,
  notesFromBoard,
  placeDigit,
  playReducer,
  playStateFromSession,
  sessionFromPlayState,
  toggleNote,
} from './playLogic'

describe('playLogic', () => {
  it('loads the sample puzzle and marks givens immutable', () => {
    const board = loadSampleBoard()
    const givens = buildGivens(board)
    const notes = createEmptyNotes()
    expect(parseBoard(SAMPLE_PUZZLE)).toEqual({ ok: true, board })

    // Given at index 0 is 5 — edits ignored.
    expect(getCell(board, 0)).toBe(5)
    expect(givens[0]).toBe(true)
    expect(placeDigit(board, notes, givens, 0, 9)).toEqual({ board, notes })
    expect(clearCell(board, notes, givens, 0)).toEqual({ board, notes })

    // Empty cell at index 2 — digit set and clear work.
    expect(getCell(board, 2)).toBe(EMPTY)
    expect(givens[2]).toBe(false)
    const filled = placeDigit(board, notes, givens, 2, 4)
    expect(getCell(filled.board, 2)).toBe(4)
    expect(getCell(clearCell(filled.board, filled.notes, givens, 2).board, 2)).toBe(
      EMPTY,
    )
  })

  it('seeds notes from the engine on a fresh puzzle', () => {
    const state = createInitialPlayState()
    expect(state.notes).toEqual(computeCandidates(state.board))
    expect(notesFromBoard(state.board)).toEqual(state.notes)
  })

  it('moves selection with edge-stop', () => {
    expect(moveSelection(0, -1, 0)).toBe(0)
    expect(moveSelection(0, 0, -1)).toBe(0)
    expect(moveSelection(0, 0, 1)).toBe(1)
    expect(moveSelection(0, 1, 0)).toBe(9)
    expect(moveSelection(80, 1, 0)).toBe(80)
    expect(moveSelection(80, 0, 1)).toBe(80)
    expect(moveSelection(80, 0, -1)).toBe(79)
  })

  it('toggles notes on empty cells and ignores givens / filled cells', () => {
    const board = loadSampleBoard()
    const givens = buildGivens(board)
    const notes = createEmptyNotes()

    const withNote = toggleNote(board, notes, givens, 2, 4)
    expect(maskHas(withNote[2] ?? 0, 4)).toBe(true)
    expect(toggleNote(board, withNote, givens, 2, 4)[2]).toBe(0)

    // Given and filled cells: notes unchanged.
    expect(toggleNote(board, notes, givens, 0, 1)).toBe(notes)
    const filled = placeDigit(board, notes, givens, 2, 7)
    expect(toggleNote(filled.board, withNote, givens, 2, 4)).toBe(withNote)
  })

  it('clears cell notes and strips the placed digit from peers', () => {
    const board = loadSampleBoard()
    const givens = buildGivens(board)
    let notes = createEmptyNotes()
    notes = toggleNote(board, notes, givens, 2, 4)
    notes = toggleNote(board, notes, givens, 3, 9) // same-row peer note for digit 9

    const placed = placeDigit(board, notes, givens, 2, 9)
    expect(getCell(placed.board, 2)).toBe(9)
    expect(placed.notes[2]).toBe(0)
    expect(placed.notes[3]).toBe(0) // digit 9 stripped from peer
    for (const peer of peersOf(2)) {
      expect((placed.notes[peer] ?? 0) & digitBit(9)).toBe(0)
    }

    notes = toggleNote(placed.board, placed.notes, givens, 5, 1)
    expect(maskHas(notes[5] ?? 0, 1)).toBe(true)

    const cleared = clearCell(placed.board, notes, givens, 2)
    expect(getCell(cleared.board, 2)).toBe(EMPTY)
    expect(cleared.notes[2]).toBe(0)

    // Clear notes-only empty cell.
    const notesOnly = clearCell(board, notes, givens, 5)
    expect(notesOnly.notes[5]).toBe(0)
    expect(getCell(notesOnly.board, 5)).toBe(EMPTY)
  })

  it('refills notes to match the engine and leaves givens untouched', () => {
    let state = createInitialPlayState()
    // Cell 2 already has candidate 1 — toggle clears it so refill has work to do.
    expect(maskHas(state.notes[2] ?? 0, 1)).toBe(true)
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'toggleNoteMode' })
    state = playReducer(state, { type: 'enterDigit', digit: 1 })
    expect(maskHas(state.notes[2] ?? 0, 1)).toBe(false)

    state = playReducer(state, { type: 'refillNotes' })
    expect(state.notes).toEqual(notesFromBoard(state.board))
    expect(maskHas(state.notes[2] ?? 0, 1)).toBe(true)
    expect(getCell(state.board, 0)).toBe(5)
    expect(state.past.length).toBeGreaterThan(0)

    state = playReducer(state, { type: 'undo' })
    expect(maskHas(state.notes[2] ?? 0, 1)).toBe(false)
  })

  it('returns the same board/notes refs for content no-ops', () => {
    const board = loadSampleBoard()
    const givens = buildGivens(board)
    const notes = createEmptyNotes()
    const placed = placeDigit(board, notes, givens, 2, 4)

    expect(placeDigit(placed.board, placed.notes, givens, 2, 4)).toEqual({
      board: placed.board,
      notes: placed.notes,
    })
    expect(clearCell(board, notes, givens, 2)).toEqual({ board, notes })
  })
})

describe('activeDigit and emphasis', () => {
  it('sets activeDigit on digit-mode entry and clears on Escape', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    expect(state.activeDigit).toBe(4)

    state = playReducer(state, { type: 'clearActiveDigit' })
    expect(state.activeDigit).toBeNull()

    state = playReducer(state, { type: 'toggleNoteMode' })
    state = playReducer(state, { type: 'enterDigit', digit: 7 })
    expect(state.activeDigit).toBeNull()
  })

  it('marks unit, same-digit, and active-digit cells', () => {
    const board = loadSampleBoard()
    // Selected empty cell 2; given 5 at 0 shares the row; given 6 at 9 shares the col.
    expect(cellEmphasis(board, 0, 2, null).inUnit).toBe(true)
    expect(cellEmphasis(board, 9, 2, null).inUnit).toBe(true)
    expect(cellEmphasis(board, 80, 2, null).inUnit).toBe(false)

    // Select a filled 5; other 5s emphasize.
    expect(cellEmphasis(board, 0, 0, null).sameDigit).toBe(false)
    expect(getCell(board, 0)).toBe(5)
    // Find another 5
    const otherFive = board.findIndex((v, i) => i !== 0 && v === 5)
    expect(otherFive).toBeGreaterThan(0)
    expect(cellEmphasis(board, otherFive, 0, null).sameDigit).toBe(true)
    expect(cellEmphasis(board, otherFive, 0, 5).activeMatch).toBe(true)
    expect(cellEmphasis(board, otherFive, 0, 8).activeMatch).toBe(false)
  })
})

describe('hints', () => {
  it('applies one solver step with focus and supports undo', () => {
    let state = createInitialPlayState()
    const before = applyHintStep(state.board)
    expect(before).not.toBeNull()

    state = playReducer(state, { type: 'applyHint', step: before! })
    expect(state.board).toEqual(before!.board)
    expect(state.notes).toEqual(before!.notes)
    expect(state.hintFocus?.cells).toEqual(before!.move.focusCells)
    expect(state.past).toHaveLength(1)

    state = playReducer(state, { type: 'undo' })
    expect(state.board).toEqual(createInitialPlayState().board)
    expect(state.notes).toEqual(createInitialPlayState().notes)
    expect(state.hintFocus).toBeNull()
  })

  it('finds a hint from the board after place/clear leaves stale notes', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    state = playReducer(state, { type: 'clear' })
    // Peer strip + empty cell notes: player notes no longer match engine candidates.
    expect(state.notes).not.toEqual(notesFromBoard(state.board))

    const step = applyHintStep(state.board)
    expect(step).not.toBeNull()
    state = playReducer(state, { type: 'applyHint', step: step! })
    expect(state.past.length).toBeGreaterThan(0)
    expect(state.hintFocus).not.toBeNull()
  })

  it('finds a hint when notes are empty', () => {
    let state = createInitialPlayState()
    state = { ...state, notes: createEmptyNotes() }
    const step = applyHintStep(state.board)
    expect(step).not.toBeNull()
    state = playReducer(state, { type: 'applyHint', step: step! })
    expect(state.notes).toEqual(step!.notes)
  })
})

describe('reset puzzle', () => {
  it('restores givens, reseeds notes, and clears history', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    state = playReducer(state, { type: 'setElapsedMs', elapsedMs: 12_000 })
    state = playReducer(state, { type: 'resetPuzzle', autoNotes: true })
    expect(state.board).toEqual(loadSampleBoard())
    expect(state.notes).toEqual(notesFromBoard(state.board))
    expect(state.past).toEqual([])
    expect(state.elapsedMs).toBe(0)
    expect(state.annotations.arrows).toEqual([])
  })
})

describe('playReducer history', () => {
  it('undoes and redoes a placed digit', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    expect(getCell(state.board, 2)).toBe(4)
    expect(state.past).toHaveLength(1)

    state = playReducer(state, { type: 'undo' })
    expect(getCell(state.board, 2)).toBe(EMPTY)
    expect(state.past).toHaveLength(0)
    expect(state.future).toHaveLength(1)

    state = playReducer(state, { type: 'redo' })
    expect(getCell(state.board, 2)).toBe(4)
    expect(state.past).toHaveLength(1)
    expect(state.future).toHaveLength(0)
  })

  it('undoes a note toggle', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'toggleNoteMode' })
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    expect(maskHas(state.notes[2] ?? 0, 4)).toBe(false) // was candidate; toggled off
    expect(state.past).toHaveLength(1)

    state = playReducer(state, { type: 'undo' })
    expect(maskHas(state.notes[2] ?? 0, 4)).toBe(true)
  })

  it('keeps givens immutable and skips no-op edits in history', () => {
    let state = createInitialPlayState()
    const givenDigit = getCell(state.board, 0)
    state = playReducer(state, { type: 'select', index: 0 })
    state = playReducer(state, { type: 'enterDigit', digit: 9 })
    state = playReducer(state, { type: 'clear' })
    expect(getCell(state.board, 0)).toBe(givenDigit)
    expect(state.past).toHaveLength(0)

    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 }) // same digit again
    state = playReducer(state, { type: 'clear' })
    state = playReducer(state, { type: 'clear' }) // already empty
    expect(state.past).toHaveLength(2) // place + clear only
    state = playReducer(state, { type: 'undo' })
    expect(getCell(state.board, 0)).toBe(givenDigit)
  })

  it('clears redo future after a new edit', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    state = playReducer(state, { type: 'undo' })
    expect(state.future).toHaveLength(1)

    state = playReducer(state, { type: 'enterDigit', digit: 7 })
    expect(getCell(state.board, 2)).toBe(7)
    expect(state.future).toHaveLength(0)
    expect(state.past).toHaveLength(1)
  })

  it('does not push selection or note-mode toggles onto history', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 5 })
    state = playReducer(state, { type: 'move', dRow: 0, dCol: 1 })
    state = playReducer(state, { type: 'toggleNoteMode' })
    expect(state.selected).toBe(6)
    expect(state.noteMode).toBe(true)
    expect(state.past).toHaveLength(0)
    expect(state.future).toHaveLength(0)
  })

  it(`caps undo depth at ${HISTORY_LIMIT}`, () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    for (let i = 0; i < HISTORY_LIMIT + 25; i++) {
      const digit = ((i % 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
      state = playReducer(state, { type: 'enterDigit', digit })
    }
    expect(state.past).toHaveLength(HISTORY_LIMIT)
  })
})

describe('play session hydrate', () => {
  it('round-trips play state through a session without undo history', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    state = playReducer(state, { type: 'toggleNoteMode' })
    state = playReducer(state, { type: 'setElapsedMs', elapsedMs: 4500 })
    expect(state.past.length).toBeGreaterThan(0)
    expect(state.activeDigit).toBe(4)

    const restored = playStateFromSession(sessionFromPlayState(state))
    expect(restored).not.toBeNull()
    expect(restored?.board).toEqual(state.board)
    expect(restored?.notes).toEqual(state.notes)
    expect(restored?.selected).toBe(2)
    expect(restored?.noteMode).toBe(true)
    expect(restored?.activeDigit).toBe(4)
    expect(restored?.elapsedMs).toBe(4500)
    expect(restored?.hintFocus).toBeNull()
    expect(restored?.past).toEqual([])
    expect(restored?.future).toEqual([])
  })

  it('rejects a board that disagrees with puzzle givens', () => {
    const session = sessionFromPlayState(createInitialPlayState())
    // Index 0 is given '5' — clearing it yields an unplayable restore.
    session.board = `.${session.board.slice(1)}`
    expect(playStateFromSession(session)).toBeNull()
  })

  it('hydrates a non-sample puzzle when givens match', () => {
    const puzzle =
      '1........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........'
    const restored = playStateFromSession({
      version: 3,
      puzzle,
      board: puzzle,
      notes: Array.from({ length: 81 }, () => 0),
      selected: 0,
      noteMode: false,
      annotations: { arrows: [], highlights: { cells: [], candidates: [] } },
      activeDigit: null,
      elapsedMs: 0,
    })
    expect(restored?.puzzle).toBe(puzzle)
    expect(restored?.givens[0]).toBe(true)
  })
})

describe('annotation history', () => {
  it('adds, deletes, clears arrows with undo', () => {
    let state = createInitialPlayState()
    state = playReducer(state, {
      type: 'addArrow',
      from: { cell: 2, digit: 4 },
      to: { cell: 10, digit: 5 },
    })
    expect(state.annotations.arrows).toHaveLength(1)
    expect(state.past).toHaveLength(1)

    const id = state.annotations.arrows[0]!.id
    state = playReducer(state, { type: 'selectArrow', id })
    state = playReducer(state, { type: 'deleteArrow' })
    expect(state.annotations.arrows).toHaveLength(0)

    state = playReducer(state, { type: 'undo' })
    expect(state.annotations.arrows).toHaveLength(1)

    state = playReducer(state, {
      type: 'addArrow',
      from: { cell: 3, digit: 1 },
      to: { cell: 4, digit: 2 },
    })
    state = playReducer(state, { type: 'clearAnnotations' })
    expect(state.annotations.arrows).toHaveLength(0)
    state = playReducer(state, { type: 'undo' })
    expect(state.annotations.arrows.length).toBeGreaterThan(0)
  })

  it('toggles cell highlights with undo', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'toggleCellHighlight' })
    expect(state.annotations.highlights.cells).toEqual([2])
    state = playReducer(state, { type: 'toggleCellHighlight' })
    expect(state.annotations.highlights.cells).toEqual([])
    state = playReducer(state, { type: 'undo' })
    expect(state.annotations.highlights.cells).toEqual([2])
  })

  it('loadPuzzle replaces board, seeds notes, and clears history', () => {
    let state = createInitialPlayState()
    state = playReducer(state, { type: 'select', index: 2 })
    state = playReducer(state, { type: 'enterDigit', digit: 4 })
    const puzzle =
      '1........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........' +
      '.........'
    state = playReducer(state, { type: 'loadPuzzle', puzzle, autoNotes: true })
    expect(state.puzzle).toBe(puzzle)
    expect(state.past).toEqual([])
    expect(state.annotations.arrows).toEqual([])
    expect(state.notes).toEqual(notesFromBoard(state.board))
  })
})
