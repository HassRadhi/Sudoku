import { BOX_SIZE, GRID_SIZE } from '../engine'
import type { Digits } from '../types'

export type Point = { readonly x: number; readonly y: number }

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
