import type { Digits } from '../../../types'
import type { Board } from '../../board'
import {
  type CandidateGrid,
  hasCandidate,
} from '../../candidates'
import {
  GRID_SIZE,
  boxIndices,
  boxOf,
  colIndices,
  colOf,
  rowIndices,
  rowOf,
} from '../../geometry'
import type { Elimination, SolveMove } from '../types'

/** Pointing: digit in a box confined to one row/col → eliminate from rest of that line. */
function findPointing(candidates: CandidateGrid): SolveMove | null {
  for (let box = 0; box < GRID_SIZE; box++) {
    const cells = boxIndices(box)
    for (let digit = 1; digit <= GRID_SIZE; digit++) {
      const d = digit as Digits
      const positions = cells.filter((c) => hasCandidate(candidates, c, d))
      if (positions.length < 2) continue

      const rows = new Set(positions.map(rowOf))
      if (rows.size === 1) {
        const row = [...rows][0]!
        const eliminations: Elimination[] = []
        for (const cell of rowIndices(row)) {
          if (boxOf(cell) === box) continue
          if (!hasCandidate(candidates, cell, d)) continue
          eliminations.push({ cell, digit: d })
        }
        if (eliminations.length > 0) {
          return {
            technique: 'locked_candidates',
            placements: [],
            eliminations,
            focusCells: positions,
            focusCandidates: positions.map((cell) => ({ cell, digit: d })),
          }
        }
      }

      const cols = new Set(positions.map(colOf))
      if (cols.size === 1) {
        const col = [...cols][0]!
        const eliminations: Elimination[] = []
        for (const cell of colIndices(col)) {
          if (boxOf(cell) === box) continue
          if (!hasCandidate(candidates, cell, d)) continue
          eliminations.push({ cell, digit: d })
        }
        if (eliminations.length > 0) {
          return {
            technique: 'locked_candidates',
            placements: [],
            eliminations,
            focusCells: positions,
            focusCandidates: positions.map((cell) => ({ cell, digit: d })),
          }
        }
      }
    }
  }
  return null
}

/** Claiming: digit in a row/col confined to one box → eliminate from rest of that box. */
function findClaiming(candidates: CandidateGrid): SolveMove | null {
  for (let line = 0; line < GRID_SIZE; line++) {
    for (const [indices, kind] of [
      [rowIndices(line), 'row'] as const,
      [colIndices(line), 'col'] as const,
    ]) {
      for (let digit = 1; digit <= GRID_SIZE; digit++) {
        const d = digit as Digits
        const positions = indices.filter((c) => hasCandidate(candidates, c, d))
        if (positions.length < 2) continue
        const boxes = new Set(positions.map(boxOf))
        if (boxes.size !== 1) continue
        const box = [...boxes][0]!
        const eliminations: Elimination[] = []
        for (const cell of boxIndices(box)) {
          if (kind === 'row' && rowOf(cell) === line) continue
          if (kind === 'col' && colOf(cell) === line) continue
          if (!hasCandidate(candidates, cell, d)) continue
          eliminations.push({ cell, digit: d })
        }
        if (eliminations.length > 0) {
          return {
            technique: 'locked_candidates',
            placements: [],
            eliminations,
            focusCells: positions,
            focusCandidates: positions.map((cell) => ({ cell, digit: d })),
          }
        }
      }
    }
  }
  return null
}

export function findLockedCandidates(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const pointing = findPointing(candidates)
  if (pointing) return [pointing]
  const claiming = findClaiming(candidates)
  if (claiming) return [claiming]
  return []
}
