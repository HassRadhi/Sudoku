import { describe, expect, it } from 'vitest'
import {
  EMPTY,
  getCell,
  parseBoard,
} from '../../engine'
import {
  SAMPLE_PUZZLE,
  buildGivens,
  clearDigit,
  loadSampleBoard,
  moveSelection,
  setDigit,
} from './playLogic'

describe('playLogic', () => {
  it('loads the sample puzzle and marks givens immutable', () => {
    const board = loadSampleBoard()
    const givens = buildGivens(board)
    expect(parseBoard(SAMPLE_PUZZLE)).toEqual({ ok: true, board })

    // Given at index 0 is 5 — edits ignored.
    expect(getCell(board, 0)).toBe(5)
    expect(givens[0]).toBe(true)
    expect(setDigit(board, givens, 0, 9)).toBe(board)
    expect(clearDigit(board, givens, 0)).toBe(board)

    // Empty cell at index 2 — digit set and clear work.
    expect(getCell(board, 2)).toBe(EMPTY)
    expect(givens[2]).toBe(false)
    const filled = setDigit(board, givens, 2, 4)
    expect(getCell(filled, 2)).toBe(4)
    expect(getCell(clearDigit(filled, givens, 2), 2)).toBe(EMPTY)
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
})
