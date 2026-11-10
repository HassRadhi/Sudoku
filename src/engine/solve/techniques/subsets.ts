import type { Digits } from '../../../types'
import type { Board } from '../../board'
import {
  type CandidateGrid,
  getCandidateMask,
  maskCount,
  maskDigits,
  maskHas,
} from '../../candidates'
import {
  GRID_SIZE,
  boxIndices,
  colIndices,
  rowIndices,
} from '../../geometry'
import type { Elimination, SolveMove, TechniqueId } from '../types'

function unitLists(): number[][] {
  const units: number[][] = []
  for (let u = 0; u < GRID_SIZE; u++) {
    units.push(rowIndices(u), colIndices(u), boxIndices(u))
  }
  return units
}

function combinations(n: number, k: number): number[][] {
  const out: number[][] = []
  const cur: number[] = []
  function rec(start: number) {
    if (cur.length === k) {
      out.push(cur.slice())
      return
    }
    for (let i = start; i < n; i++) {
      cur.push(i)
      rec(i + 1)
      cur.pop()
    }
  }
  rec(0)
  return out
}

function nakedSubset(
  candidates: CandidateGrid,
  size: 2 | 3,
  technique: TechniqueId,
): SolveMove | null {
  for (const unit of unitLists()) {
    const empties = unit.filter((c) => getCandidateMask(candidates, c) !== 0)
    if (empties.length <= size) continue

    for (const idxs of combinations(empties.length, size)) {
      const cells = idxs.map((i) => empties[i]!)
      let union = 0
      for (const c of cells) union |= getCandidateMask(candidates, c)
      if (maskCount(union) !== size) continue
      // Every cell's candidates must be subset of union (true by construction of union)
      // and each cell must only use digits from union — already true.
      // Require each cell mask ⊆ union and |union| === size; also no cell outside.
      if (cells.some((c) => (getCandidateMask(candidates, c) & ~union) !== 0)) {
        continue
      }

      const digits = maskDigits(union)
      const eliminations: Elimination[] = []
      for (const cell of empties) {
        if (cells.includes(cell)) continue
        for (const d of digits) {
          if (maskHas(getCandidateMask(candidates, cell), d)) {
            eliminations.push({ cell, digit: d })
          }
        }
      }
      if (eliminations.length === 0) continue
      return {
        technique,
        placements: [],
        eliminations,
        focusCells: cells,
        focusCandidates: cells.flatMap((cell) =>
          maskDigits(getCandidateMask(candidates, cell)).map((digit) => ({
            cell,
            digit,
          })),
        ),
      }
    }
  }
  return null
}

function hiddenSubset(
  candidates: CandidateGrid,
  size: 2 | 3,
  technique: TechniqueId,
): SolveMove | null {
  for (const unit of unitLists()) {
    const digitCells: number[][] = Array.from({ length: 10 }, () => [])
    for (const cell of unit) {
      for (const d of maskDigits(getCandidateMask(candidates, cell))) {
        digitCells[d]!.push(cell)
      }
    }
    const digitsPresent = (Array.from({ length: 9 }, (_, i) => (i + 1) as Digits)).filter(
      (d) => digitCells[d]!.length > 0 && digitCells[d]!.length <= size,
    )
    if (digitsPresent.length < size) continue

    for (const idxs of combinations(digitsPresent.length, size)) {
      const digits = idxs.map((i) => digitsPresent[i]!)
      const cellSet = new Set<number>()
      for (const d of digits) {
        for (const c of digitCells[d]!) cellSet.add(c)
      }
      if (cellSet.size !== size) continue

      const cells = [...cellSet]
      const digitMask = digits.reduce((m, d) => m | (1 << (d - 1)), 0)
      const eliminations: Elimination[] = []
      for (const cell of cells) {
        for (const d of maskDigits(getCandidateMask(candidates, cell))) {
          if ((digitMask & (1 << (d - 1))) === 0) {
            eliminations.push({ cell, digit: d })
          }
        }
      }
      if (eliminations.length === 0) continue
      return {
        technique,
        placements: [],
        eliminations,
        focusCells: cells,
        focusCandidates: digits.flatMap((digit) =>
          digitCells[digit]!.map((cell) => ({ cell, digit })),
        ),
      }
    }
  }
  return null
}

export function findNakedPairs(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const m = nakedSubset(candidates, 2, 'naked_pair')
  return m ? [m] : []
}

export function findHiddenPairs(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const m = hiddenSubset(candidates, 2, 'hidden_pair')
  return m ? [m] : []
}

export function findNakedTriples(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const m = nakedSubset(candidates, 3, 'naked_triple')
  return m ? [m] : []
}

export function findHiddenTriples(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const m = hiddenSubset(candidates, 3, 'hidden_triple')
  return m ? [m] : []
}
