import { describe, expect, it } from 'vitest'
import {
  EMPTY,
  digitBit,
  getCell,
  maskHas,
  parseBoard,
} from '../../engine'
import {
  SAMPLE_PUZZLE,
  buildGivens,
  clearCell,
  createEmptyNotes,
  loadSampleBoard,
  moveSelection,
  placeDigit,
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
})
