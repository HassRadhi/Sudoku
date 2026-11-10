import { BOX_SIZE, CELL_COUNT, GRID_SIZE, colOf, rowOf } from '../engine'
import type { Digits } from '../types'

export type Point = { readonly x: number; readonly y: number }

export type CandidateAnchor = {
  cell: number
  digit: Digits
  x: number
  y: number
}

/**
 * Local centres for candidate slots 1–9 inside a cell (top-left origin).
 * Digit d is at index d - 1, laid out left-to-right, top-to-bottom.
 * Pure geometry — callers pass current cell size; never store pixels in game state.
 */
export function candidateSlotCentres(
  cellWidth: number,
  cellHeight: number = cellWidth,
): readonly Point[] {
  const centres: Point[] = []
  for (let digit = 1; digit <= GRID_SIZE; digit++) {
    centres.push(candidateSlotCentre(digit as Digits, cellWidth, cellHeight))
  }
  return centres
}

/** Centre of one candidate slot in cell-local coordinates. */
export function candidateSlotCentre(
  digit: Digits,
  cellWidth: number,
  cellHeight: number = cellWidth,
): Point {
  const slot = digit - 1
  const col = slot % BOX_SIZE
  const row = Math.floor(slot / BOX_SIZE)
  return {
    x: ((col + 0.5) / BOX_SIZE) * cellWidth,
    y: ((row + 0.5) / BOX_SIZE) * cellHeight,
  }
}

/** Board-space centre of a candidate slot. */
export function candidateAnchorInBoard(
  cell: number,
  digit: Digits,
  cellWidth: number,
  cellHeight: number = cellWidth,
): Point {
  const local = candidateSlotCentre(digit, cellWidth, cellHeight)
  return {
    x: colOf(cell) * cellWidth + local.x,
    y: rowOf(cell) * cellHeight + local.y,
  }
}

/**
 * Nearest candidate slot to a board-local point, within `maxDist`.
 * Returns null if none are close enough.
 */
export function hitTestCandidate(
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number = cellWidth,
  maxDist: number = Math.min(cellWidth, cellHeight) / 6,
): { cell: number; digit: Digits } | null {
  if (cellWidth <= 0 || cellHeight <= 0) return null
  const col = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(x / cellWidth)))
  const row = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(y / cellHeight)))
  // Search selected cell and neighbours — slots near edges may belong to adjacent cells.
  let best: { cell: number; digit: Digits } | null = null
  let bestDist = maxDist
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr
      const c = col + dc
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue
      const cell = r * GRID_SIZE + c
      if (cell < 0 || cell >= CELL_COUNT) continue
      for (let digit = 1; digit <= GRID_SIZE; digit++) {
        const d = digit as Digits
        const p = candidateAnchorInBoard(cell, d, cellWidth, cellHeight)
        const dist = Math.hypot(p.x - x, p.y - y)
        if (dist <= bestDist) {
          bestDist = dist
          best = { cell, digit: d }
        }
      }
    }
  }
  return best
}
