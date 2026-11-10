import type { Digits } from '../types'
import type { Board } from './board'
import { EMPTY, isDigits } from './board'
import {
  CELL_COUNT,
  GRID_SIZE,
  boxIndices,
  boxOf,
  colIndices,
  colOf,
  rowIndices,
  rowOf,
} from './geometry'

/**
 * Candidate grid: one bitmask per cell.
 * Bit (d - 1) set means digit d is a candidate.
 * Filled cells are always 0.
 *
 * On boards with conflicts, candidates are still derived from placed digits
 * as-is (a digit present anywhere in the unit is excluded). No special
 * conflict handling.
 */
export type CandidateGrid = number[]

export const ALL_CANDIDATES_MASK = 0b1_1111_1111

export function digitBit(digit: Digits): number {
  return 1 << (digit - 1)
}

export function maskHas(mask: number, digit: Digits): boolean {
  return (mask & digitBit(digit)) !== 0
}

export function maskDigits(mask: number): Digits[] {
  const digits: Digits[] = []
  for (let digit = 1; digit <= GRID_SIZE; digit++) {
    if (maskHas(mask, digit as Digits)) digits.push(digit as Digits)
  }
  return digits
}

export function maskCount(mask: number): number {
  let count = 0
  let bits = mask & ALL_CANDIDATES_MASK
  while (bits) {
    bits &= bits - 1
    count++
  }
  return count
}

export function isNakedSingleMask(mask: number): boolean {
  return maskCount(mask) === 1
}

function usedMaskInUnit(board: Board, indices: number[]): number {
  let used = 0
  for (const index of indices) {
    const value = board[index] ?? EMPTY
    if (isDigits(value)) used |= digitBit(value)
  }
  return used
}

/** Full candidate recalculation from the board. */
export function computeCandidates(board: Board): CandidateGrid {
  if (board.length !== CELL_COUNT) {
    throw new Error(`Board must have ${CELL_COUNT} cells, got ${board.length}`)
  }

  const rowUsed = Array.from({ length: GRID_SIZE }, (_, row) =>
    usedMaskInUnit(board, rowIndices(row)),
  )
  const colUsed = Array.from({ length: GRID_SIZE }, (_, col) =>
    usedMaskInUnit(board, colIndices(col)),
  )
  const boxUsed = Array.from({ length: GRID_SIZE }, (_, box) =>
    usedMaskInUnit(board, boxIndices(box)),
  )

  const grid: CandidateGrid = Array.from({ length: CELL_COUNT }, () => 0)

  for (let index = 0; index < CELL_COUNT; index++) {
    const value = board[index] ?? EMPTY
    if (value !== EMPTY) {
      grid[index] = 0
      continue
    }
    const used =
      (rowUsed[rowOf(index)] ?? 0) |
      (colUsed[colOf(index)] ?? 0) |
      (boxUsed[boxOf(index)] ?? 0)
    grid[index] = ALL_CANDIDATES_MASK & ~used
  }

  return grid
}

/** Alias for callers that place a digit then refresh candidates. */
export function recomputeCandidates(board: Board): CandidateGrid {
  return computeCandidates(board)
}

export function getCandidateMask(
  candidates: CandidateGrid,
  index: number,
): number {
  return candidates[index] ?? 0
}

export function getCandidates(
  candidates: CandidateGrid,
  index: number,
): Digits[] {
  return maskDigits(getCandidateMask(candidates, index))
}

export function hasCandidate(
  candidates: CandidateGrid,
  index: number,
  digit: Digits,
): boolean {
  return maskHas(getCandidateMask(candidates, index), digit)
}

/** Tiny immutable note edit — does not validate against the board. */
export function addCandidate(
  candidates: CandidateGrid,
  index: number,
  digit: Digits,
): CandidateGrid {
  const next = candidates.slice()
  next[index] = (next[index] ?? 0) | digitBit(digit)
  return next
}

/** Tiny immutable note edit — does not validate against the board. */
export function removeCandidate(
  candidates: CandidateGrid,
  index: number,
  digit: Digits,
): CandidateGrid {
  const next = candidates.slice()
  next[index] = (next[index] ?? 0) & ~digitBit(digit)
  return next
}
