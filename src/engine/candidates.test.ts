import { describe, expect, it } from 'vitest'
import {
  ALL_CANDIDATES_MASK,
  addCandidate,
  cellIndex,
  computeCandidates,
  createEmptyBoard,
  getCandidates,
  hasCandidate,
  isNakedSingleMask,
  maskCount,
  parseBoard,
  recomputeCandidates,
  removeCandidate,
  setCell,
} from './index'

const INCOMPLETE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'

describe('computeCandidates', () => {
  it('gives every empty cell candidates 1–9 on an empty board', () => {
    const board = createEmptyBoard()
    const candidates = computeCandidates(board)
    expect(candidates).toHaveLength(81)
    for (let i = 0; i < 81; i++) {
      expect(candidates[i]).toBe(ALL_CANDIDATES_MASK)
      expect(getCandidates(candidates, i)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    }
  })

  it('gives filled cells no candidates', () => {
    const parsed = parseBoard(INCOMPLETE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const candidates = computeCandidates(parsed.board)
    // Cell 0 is 5, cell 4 is 7
    expect(getCandidates(candidates, 0)).toEqual([])
    expect(getCandidates(candidates, 4)).toEqual([])
    expect(hasCandidate(candidates, 0, 5)).toBe(false)
  })

  it('matches fixture candidates on a known partial puzzle', () => {
    const parsed = parseBoard(INCOMPLETE)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const candidates = computeCandidates(parsed.board)

    // r0c2: row {5,3,7}, col {8}, box {5,3,6,9,8} → used 3,5,6,7,8,9 → 1,2,4
    expect(getCandidates(candidates, cellIndex(0, 2))).toEqual([1, 2, 4])

    // r0c3: row {5,3,7}, col {1,8,4}, box {7,1,9,5} → used 1,3,4,5,7,8,9 → 2,6
    expect(getCandidates(candidates, cellIndex(0, 3))).toEqual([2, 6])

    // r1c1: row {6,1,9,5}, col {3,9,6}, box {5,3,6,9,8} → used 1,3,5,6,8,9 → 2,4,7
    expect(getCandidates(candidates, cellIndex(1, 1))).toEqual([2, 4, 7])

    // r4c4 (centre): row {4,8,3,1}, col {7,9,6,2,1,8}, box {6,8,3,2}
    // used 1,2,3,4,6,7,8,9 → 5 only
    expect(getCandidates(candidates, cellIndex(4, 4))).toEqual([5])
    expect(isNakedSingleMask(candidates[cellIndex(4, 4)] ?? 0)).toBe(true)
  })

  it('removes a placed digit from peers after recompute', () => {
    let board = createEmptyBoard()
    board = setCell(board, cellIndex(0, 0), 5)
    let candidates = recomputeCandidates(board)

    expect(hasCandidate(candidates, cellIndex(0, 1), 5)).toBe(false)
    expect(hasCandidate(candidates, cellIndex(1, 0), 5)).toBe(false)
    expect(hasCandidate(candidates, cellIndex(1, 1), 5)).toBe(false)
    // Unrelated cell still has 5
    expect(hasCandidate(candidates, cellIndex(8, 8), 5)).toBe(true)

    board = setCell(board, cellIndex(8, 8), 5)
    candidates = recomputeCandidates(board)
    expect(hasCandidate(candidates, cellIndex(8, 7), 5)).toBe(false)
    expect(getCandidates(candidates, cellIndex(8, 8))).toEqual([])
  })

  it('still computes from placed digits when the board has conflicts', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 5)
    board = setCell(board, 1, 5) // row conflict
    const candidates = computeCandidates(board)
    // Empty peer in the same row still excludes 5
    expect(hasCandidate(candidates, 2, 5)).toBe(false)
  })
})

describe('candidate note helpers', () => {
  it('addCandidate and removeCandidate edit a mask immutably', () => {
    const empty = computeCandidates(createEmptyBoard())
    const cleared = removeCandidate(empty, 0, 3)
    expect(hasCandidate(cleared, 0, 3)).toBe(false)
    expect(hasCandidate(empty, 0, 3)).toBe(true)
    expect(maskCount(cleared[0] ?? 0)).toBe(8)

    const restored = addCandidate(cleared, 0, 3)
    expect(hasCandidate(restored, 0, 3)).toBe(true)
    expect(cleared[0]).not.toBe(restored[0])
  })
})
