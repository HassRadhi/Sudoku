import { describe, expect, it } from 'vitest'
import {
  EMPTY,
  digitBit,
  getCell,
  maskHas,
  parseBoard,
} from '../../engine'
import {
  HISTORY_LIMIT,
  SAMPLE_PUZZLE,
  buildGivens,
  clearCell,
  createEmptyNotes,
  createInitialPlayState,
  loadSampleBoard,
  moveSelection,
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

  it('clears digit and notes together; placing a digit clears that cell notes only', () => {
    const board = loadSampleBoard()
    const givens = buildGivens(board)
    let notes = createEmptyNotes()
    notes = toggleNote(board, notes, givens, 2, 4)
    notes = toggleNote(board, notes, givens, 3, 5) // peer cell note

    const placed = placeDigit(board, notes, givens, 2, 9)
    expect(getCell(placed.board, 2)).toBe(9)
    expect(placed.notes[2]).toBe(0)
    expect(placed.notes[3]).toBe(digitBit(5)) // peers left alone

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
    expect(maskHas(state.notes[2] ?? 0, 4)).toBe(true)
    expect(state.past).toHaveLength(1)

    state = playReducer(state, { type: 'undo' })
    expect(state.notes[2]).toBe(0)
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
    expect(state.past.length).toBeGreaterThan(0)

    const restored = playStateFromSession(sessionFromPlayState(state))
    expect(restored).not.toBeNull()
    expect(restored?.board).toEqual(state.board)
    expect(restored?.notes).toEqual(state.notes)
    expect(restored?.selected).toBe(2)
    expect(restored?.noteMode).toBe(true)
    expect(restored?.past).toEqual([])
    expect(restored?.future).toEqual([])
  })

  it('rejects an unsupported puzzle identity', () => {
    const session = sessionFromPlayState(createInitialPlayState())
    session.puzzle = SAMPLE_PUZZLE.replace('5', '1')
    expect(playStateFromSession(session)).toBeNull()
  })

  it('rejects a board that disagrees with puzzle givens', () => {
    const session = sessionFromPlayState(createInitialPlayState())
    // Index 0 is given '5' — clearing it yields an unplayable restore.
    session.board = `.${session.board.slice(1)}`
    expect(playStateFromSession(session)).toBeNull()
  })
})

