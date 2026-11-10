import type { Digits } from '../../../types'
import type { Board } from '../../board'
import { EMPTY } from '../../board'
import {
  type CandidateGrid,
  getCandidates,
  isNakedSingleMask,
  maskDigits,
} from '../../candidates'
import {
  CELL_COUNT,
  GRID_SIZE,
  boxIndices,
  colIndices,
  rowIndices,
} from '../../geometry'
import type { SolveMove } from '../types'

export function findNakedSingles(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    const mask = candidates[cell] ?? 0
    if (!isNakedSingleMask(mask)) continue
    const digit = maskDigits(mask)[0]
    if (digit === undefined) continue
    return [
      {
        technique: 'naked_single',
        placements: [{ cell, digit }],
        eliminations: [],
        focusCells: [cell],
        focusCandidates: [{ cell, digit }],
      },
    ]
  }
  return []
}

function findHiddenSingleInUnit(
  indices: number[],
  candidates: CandidateGrid,
): SolveMove | null {
  for (let digit = 1; digit <= GRID_SIZE; digit++) {
    const d = digit as Digits
    let found = -1
    let count = 0
    for (const cell of indices) {
      if (!getCandidates(candidates, cell).includes(d)) continue
      count++
      found = cell
      if (count > 1) break
    }
    if (count === 1 && found >= 0) {
      return {
        technique: 'hidden_single',
        placements: [{ cell: found, digit: d }],
        eliminations: [],
        focusCells: [found],
        focusCandidates: [{ cell: found, digit: d }],
      }
    }
  }
  return null
}

export function findHiddenSingles(
  board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  for (let u = 0; u < GRID_SIZE; u++) {
    for (const indices of [rowIndices(u), colIndices(u), boxIndices(u)]) {
      // Skip units that are already full of digits.
      if (indices.every((i) => board[i] !== EMPTY)) continue
      const move = findHiddenSingleInUnit(indices, candidates)
      if (move) return [move]
    }
  }
  return []
}
