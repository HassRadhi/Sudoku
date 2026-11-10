import { describe, expect, it } from 'vitest'
import {
  CELL_COUNT,
  boxOf,
  cellIndex,
  colOf,
  createEmptyBoard,
  isBoardComplete,
  isBoardValid,
  parseBoard,
  peersOf,
  rowOf,
  serialiseBoard,
  setCell,
  validateBoard,
} from './index'

/** Known valid completed grid (Wikipedia sample). */
const COMPLETE =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

/** Valid incomplete puzzle (dots for empty). */
const INCOMPLETE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'

describe('parseBoard / serialiseBoard', () => {
  it('round-trips a complete grid', () => {
    const parsed = parseBoard(COMPLETE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(serialiseBoard(parsed.board)).toBe(COMPLETE)
  })

  it('round-trips an incomplete puzzle using "." for empty', () => {
    const parsed = parseBoard(INCOMPLETE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(serialiseBoard(parsed.board)).toBe(INCOMPLETE)
    expect(parsed.board.filter((v) => v === 0).length).toBeGreaterThan(0)
  })

  it('rejects wrong length', () => {
    const parsed = parseBoard('123')
    expect(parsed).toEqual({
      ok: false,
      error: `Puzzle string must be ${CELL_COUNT} characters, got 3`,
    })
  })

  it('rejects invalid characters', () => {
    const bad = COMPLETE.slice(0, 10) + 'X' + COMPLETE.slice(11)
    const parsed = parseBoard(bad)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toContain("Invalid character 'X'")
    expect(parsed.error).toContain('position 10')
  })

  it('rejects "0" as a digit character (empty must be ".")', () => {
    const withZero = EMPTY_DOT_AT_0()
    const parsed = parseBoard(withZero)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toContain("Invalid character '0'")
  })
})

function EMPTY_DOT_AT_0(): string {
  return '0' + COMPLETE.slice(1)
}

describe('geometry', () => {
  it('maps index to row, column, and box', () => {
    expect(cellIndex(2, 3)).toBe(21)
    expect(rowOf(21)).toBe(2)
    expect(colOf(21)).toBe(3)
    expect(boxOf(21)).toBe(1)
    expect(boxOf(0)).toBe(0)
    expect(boxOf(40)).toBe(4)
    expect(boxOf(80)).toBe(8)
  })

  it('returns correct peers for a corner cell', () => {
    const peers = peersOf(0)
    // Row 0: 1–8; col 0: 9,18,...,72; box 0 extras: 10,11,19,20
    expect(peers).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72,
    ])
    expect(peers).not.toContain(0)
    expect(peers).toHaveLength(20)
  })

  it('returns correct peers for the centre cell', () => {
    const peers = peersOf(40)
    expect(peers).toHaveLength(20)
    expect(peers).not.toContain(40)
    // Centre box cells except self
    for (const i of [30, 31, 32, 39, 41, 48, 49, 50]) {
      expect(peers).toContain(i)
    }
  })
})

describe('validateBoard', () => {
  it('accepts a valid complete grid', () => {
    const parsed = parseBoard(COMPLETE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(isBoardValid(parsed.board)).toBe(true)
    expect(isBoardComplete(parsed.board)).toBe(true)
    expect(validateBoard(parsed.board)).toMatchObject({
      valid: true,
      conflictCells: [],
      conflicts: [],
    })
  })

  it('accepts a valid incomplete puzzle', () => {
    const parsed = parseBoard(INCOMPLETE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(isBoardValid(parsed.board)).toBe(true)
    expect(isBoardComplete(parsed.board)).toBe(false)
  })

  it('detects a row duplicate', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 5)
    board = setCell(board, 8, 5)
    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.conflictCells).toEqual([0, 8])
    expect(result.conflicts).toContainEqual({
      unit: 'row',
      unitIndex: 0,
      digit: 5,
      cells: [0, 8],
    })
  })

  it('detects a column duplicate', () => {
    let board = createEmptyBoard()
    board = setCell(board, 1, 7)
    board = setCell(board, 73, 7)
    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.conflictCells).toEqual([1, 73])
    expect(
      result.conflicts.some(
        (c) => c.unit === 'column' && c.unitIndex === 1 && c.digit === 7,
      ),
    ).toBe(true)
  })

  it('detects a box duplicate', () => {
    let board = createEmptyBoard()
    // Box 0 cells 0 and 20 share digit 3 without sharing row/col.
    board = setCell(board, 0, 3)
    board = setCell(board, 20, 3)
    const result = validateBoard(board)
    expect(result.valid).toBe(false)
    expect(result.conflictCells).toEqual([0, 20])
    expect(
      result.conflicts.some(
        (c) => c.unit === 'box' && c.unitIndex === 0 && c.digit === 3,
      ),
    ).toBe(true)
  })

  it('ignores empty cells when checking duplicates', () => {
    const board = createEmptyBoard()
    expect(isBoardValid(board)).toBe(true)
  })
})
