import { describe, expect, it } from 'vitest'
import type { Digits } from '../../types'
import { createEmptyBoard, parseBoard } from '../board'
import {
  type CandidateGrid,
  digitBit,
  hasCandidate,
} from '../candidates'
import { CELL_COUNT, cellIndex } from '../geometry'
import {
  TECHNIQUE_RANK,
  bandFromRank,
  findHiddenPairs,
  findHiddenSingles,
  findHiddenTriples,
  findLockedCandidates,
  findNakedPairs,
  findNakedSingles,
  findNakedTriples,
  findSwordfish,
  findXWing,
  findXyWing,
  hardestTechnique,
  rateDifficulty,
  solveLogical,
} from './index'

function emptyCands(): CandidateGrid {
  return Array.from({ length: CELL_COUNT }, () => 0)
}

function mask(...digits: Digits[]): number {
  return digits.reduce((m, d) => m | digitBit(d), 0)
}

function sampleBoard() {
  const parsed = parseBoard(
    '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
  )
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.board
}

describe('technique fixtures', () => {
  it('naked_single', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    c[0] = mask(5)
    c[1] = mask(1, 2, 3)
    const moves = findNakedSingles(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.placements).toEqual([{ cell: 0, digit: 5 }])
  })

  it('hidden_single', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    // Row 0: only cell 3 has digit 7
    for (let col = 0; col < 9; col++) {
      c[cellIndex(0, col)] = mask(1, 2)
    }
    c[cellIndex(0, 3)] = mask(1, 7)
    const moves = findHiddenSingles(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.placements[0]).toEqual({ cell: cellIndex(0, 3), digit: 7 })
  })

  it('locked_candidates pointing', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    // Box 0: digit 9 only in r0c0 and r0c1; also present in r0c8 → pointing eliminate
    for (let i = 0; i < CELL_COUNT; i++) c[i] = mask(1)
    c[cellIndex(0, 0)] = mask(9)
    c[cellIndex(0, 1)] = mask(9)
    c[cellIndex(0, 8)] = mask(1, 9)
    const moves = findLockedCandidates(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.technique).toBe('locked_candidates')
    expect(
      moves[0]!.eliminations.some((e) => e.cell === cellIndex(0, 8) && e.digit === 9),
    ).toBe(true)
  })

  it('locked_candidates claiming', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    // Row 0: digit 9 only in box 0 (r0c0, r0c1); also in box 0 outside the row → claiming
    for (let i = 0; i < CELL_COUNT; i++) c[i] = mask(1)
    c[cellIndex(0, 0)] = mask(9)
    c[cellIndex(0, 1)] = mask(9)
    c[cellIndex(1, 2)] = mask(1, 9)
    const moves = findLockedCandidates(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.technique).toBe('locked_candidates')
    expect(
      moves[0]!.eliminations.some((e) => e.cell === cellIndex(1, 2) && e.digit === 9),
    ).toBe(true)
  })

  it('naked_pair', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    for (let col = 0; col < 9; col++) c[cellIndex(0, col)] = mask(3, 4, 5)
    c[cellIndex(0, 0)] = mask(1, 2)
    c[cellIndex(0, 1)] = mask(1, 2)
    c[cellIndex(0, 2)] = mask(1, 3)
    const moves = findNakedPairs(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.eliminations).toContainEqual({
      cell: cellIndex(0, 2),
      digit: 1,
    })
  })

  it('hidden_pair', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    for (let col = 0; col < 9; col++) c[cellIndex(0, col)] = mask(3, 4, 5)
    // Digits 1 and 2 only in cells 0 and 1, which also have extra junk to eliminate
    c[cellIndex(0, 0)] = mask(1, 2, 3)
    c[cellIndex(0, 1)] = mask(1, 2, 4)
    const moves = findHiddenPairs(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.technique).toBe('hidden_pair')
    expect(moves[0]!.eliminations.length).toBeGreaterThan(0)
  })

  it('naked_triple', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    for (let col = 0; col < 9; col++) c[cellIndex(0, col)] = mask(4, 5, 6)
    c[cellIndex(0, 0)] = mask(1, 2)
    c[cellIndex(0, 1)] = mask(2, 3)
    c[cellIndex(0, 2)] = mask(1, 3)
    c[cellIndex(0, 3)] = mask(1, 4)
    const moves = findNakedTriples(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.eliminations).toContainEqual({
      cell: cellIndex(0, 3),
      digit: 1,
    })
  })

  it('hidden_triple', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    for (let col = 0; col < 9; col++) c[cellIndex(0, col)] = mask(4, 5, 6)
    c[cellIndex(0, 0)] = mask(1, 2, 4)
    c[cellIndex(0, 1)] = mask(2, 3, 5)
    c[cellIndex(0, 2)] = mask(1, 3, 6)
    const moves = findHiddenTriples(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.technique).toBe('hidden_triple')
    expect(moves[0]!.eliminations.length).toBeGreaterThan(0)
  })

  it('x_wing', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    for (let i = 0; i < CELL_COUNT; i++) c[i] = mask(2)
    // Digit 1 in rows 0,1 only in cols 2,4 → X-Wing; eliminate from other rows in those cols
    c[cellIndex(0, 2)] = mask(1)
    c[cellIndex(0, 4)] = mask(1)
    c[cellIndex(1, 2)] = mask(1)
    c[cellIndex(1, 4)] = mask(1)
    c[cellIndex(5, 2)] = mask(1, 2)
    c[cellIndex(5, 4)] = mask(1, 2)
    const moves = findXWing(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.technique).toBe('x_wing')
    expect(moves[0]!.eliminations.length).toBeGreaterThan(0)
  })

  it('swordfish', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    for (let i = 0; i < CELL_COUNT; i++) c[i] = mask(2)
    // Digit 1 in rows 0,1,2 only within cols 3,5,7
    for (const r of [0, 1, 2]) {
      c[cellIndex(r, 3)] = mask(1)
      c[cellIndex(r, 5)] = mask(1)
      c[cellIndex(r, 7)] = mask(1)
    }
    c[cellIndex(6, 3)] = mask(1, 2)
    const moves = findSwordfish(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.technique).toBe('swordfish')
  })

  it('xy_wing', () => {
    const board = createEmptyBoard()
    const c = emptyCands()
    for (let i = 0; i < CELL_COUNT; i++) c[i] = mask(4)
    // Pivot r4c4 {1,2}; pincer r4c0 {1,3}; pincer r0c4 {2,3}; eliminate 3 at r0c0
    c[cellIndex(4, 4)] = mask(1, 2)
    c[cellIndex(4, 0)] = mask(1, 3)
    c[cellIndex(0, 4)] = mask(2, 3)
    c[cellIndex(0, 0)] = mask(3, 4)
    const moves = findXyWing(board, c)
    expect(moves).toHaveLength(1)
    expect(moves[0]!.technique).toBe('xy_wing')
    expect(moves[0]!.eliminations).toContainEqual({
      cell: cellIndex(0, 0),
      digit: 3,
    })
  })
})

describe('solve + rate', () => {
  it('solves the sample puzzle as easy', () => {
    const p = sampleBoard()
    const outcome = solveLogical(p)
    expect(outcome.kind).toBe('solved')
    const rated = rateDifficulty(p)
    expect(rated.kind).toBe('rated')
    if (rated.kind !== 'rated') return
    expect(rated.band).toBe('easy')
    expect(hardestTechnique(rated.steps)).toBe(rated.hardest)
  })

  it('returns ambiguous when stuck and not unique', () => {
    const rated = rateDifficulty(createEmptyBoard())
    expect(rated.kind).toBe('ambiguous')
  })

  it('maps technique ranks to bands', () => {
    expect(bandFromRank(TECHNIQUE_RANK.naked_single)).toBe('easy')
    expect(bandFromRank(TECHNIQUE_RANK.hidden_single)).toBe('easy')
    expect(bandFromRank(TECHNIQUE_RANK.locked_candidates)).toBe('medium')
    expect(bandFromRank(TECHNIQUE_RANK.hidden_pair)).toBe('medium')
    expect(bandFromRank(TECHNIQUE_RANK.naked_triple)).toBe('hard')
    expect(bandFromRank(TECHNIQUE_RANK.x_wing)).toBe('hard')
    expect(bandFromRank(TECHNIQUE_RANK.swordfish)).toBe('expert')
    expect(bandFromRank(TECHNIQUE_RANK.xy_wing)).toBe('expert')
  })
})

describe('smoke', () => {
  it('hasCandidate works', () => {
    const c = emptyCands()
    c[0] = mask(5)
    expect(hasCandidate(c, 0, 5)).toBe(true)
  })
})
