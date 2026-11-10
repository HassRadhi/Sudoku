import type { Digits } from '../../../types'
import type { Board } from '../../board'
import { type CandidateGrid, hasCandidate } from '../../candidates'
import { GRID_SIZE, cellIndex } from '../../geometry'
import type { Elimination, SolveMove } from '../types'

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

/**
 * Basic fish: N rows where digit appears in exactly the same N columns (or vice versa).
 * size 2 = X-Wing, size 3 = Swordfish.
 */
function findFish(
  candidates: CandidateGrid,
  size: 2 | 3,
  technique: 'x_wing' | 'swordfish',
): SolveMove | null {
  for (let digit = 1; digit <= GRID_SIZE; digit++) {
    const d = digit as Digits

    // Row-based: choose `size` rows; union of candidate cols has size `size`.
    const rowCols: number[][] = []
    for (let r = 0; r < GRID_SIZE; r++) {
      const cols: number[] = []
      for (let c = 0; c < GRID_SIZE; c++) {
        if (hasCandidate(candidates, cellIndex(r, c), d)) cols.push(c)
      }
      rowCols.push(cols)
    }
    for (const rows of combinations(GRID_SIZE, size)) {
      if (rows.some((r) => rowCols[r]!.length === 0 || rowCols[r]!.length > size)) {
        continue
      }
      const colSet = new Set<number>()
      for (const r of rows) for (const c of rowCols[r]!) colSet.add(c)
      if (colSet.size !== size) continue
      const cols = [...colSet]
      const eliminations: Elimination[] = []
      for (const c of cols) {
        for (let r = 0; r < GRID_SIZE; r++) {
          if (rows.includes(r)) continue
          const cell = cellIndex(r, c)
          if (!hasCandidate(candidates, cell, d)) continue
          eliminations.push({ cell, digit: d })
        }
      }
      if (eliminations.length === 0) continue
      const focusCells = rows.flatMap((r) =>
        cols
          .filter((c) => hasCandidate(candidates, cellIndex(r, c), d))
          .map((c) => cellIndex(r, c)),
      )
      return {
        technique,
        placements: [],
        eliminations,
        focusCells,
        focusCandidates: focusCells.map((cell) => ({ cell, digit: d })),
      }
    }

    // Column-based
    const colRows: number[][] = []
    for (let c = 0; c < GRID_SIZE; c++) {
      const rows: number[] = []
      for (let r = 0; r < GRID_SIZE; r++) {
        if (hasCandidate(candidates, cellIndex(r, c), d)) rows.push(r)
      }
      colRows.push(rows)
    }
    for (const cols of combinations(GRID_SIZE, size)) {
      if (cols.some((c) => colRows[c]!.length === 0 || colRows[c]!.length > size)) {
        continue
      }
      const rowSet = new Set<number>()
      for (const c of cols) for (const r of colRows[c]!) rowSet.add(r)
      if (rowSet.size !== size) continue
      const rows = [...rowSet]
      const eliminations: Elimination[] = []
      for (const r of rows) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (cols.includes(c)) continue
          const cell = cellIndex(r, c)
          if (!hasCandidate(candidates, cell, d)) continue
          eliminations.push({ cell, digit: d })
        }
      }
      if (eliminations.length === 0) continue
      const focusCells = cols.flatMap((c) =>
        rows
          .filter((r) => hasCandidate(candidates, cellIndex(r, c), d))
          .map((r) => cellIndex(r, c)),
      )
      return {
        technique,
        placements: [],
        eliminations,
        focusCells,
        focusCandidates: focusCells.map((cell) => ({ cell, digit: d })),
      }
    }
  }
  return null
}

export function findXWing(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const m = findFish(candidates, 2, 'x_wing')
  return m ? [m] : []
}

export function findSwordfish(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const m = findFish(candidates, 3, 'swordfish')
  return m ? [m] : []
}
