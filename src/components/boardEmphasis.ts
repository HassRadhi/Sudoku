import type { Board } from '../engine'
import { EMPTY, boxOf, colOf, getCell, rowOf } from '../engine'
import type { Digits } from '../types'

export type CellEmphasis = {
  inUnit: boolean
  sameDigit: boolean
  activeMatch: boolean
}

/** Derived Board emphasis flags for a cell (no engine mutation). */
export function cellEmphasis(
  board: Board,
  index: number,
  selected: number,
  activeDigit: Digits | null,
): CellEmphasis {
  const value = getCell(board, index)
  const selectedValue = getCell(board, selected)
  const inUnit =
    index !== selected &&
    (rowOf(index) === rowOf(selected) ||
      colOf(index) === colOf(selected) ||
      boxOf(index) === boxOf(selected))
  const sameDigit =
    index !== selected &&
    selectedValue !== EMPTY &&
    value === selectedValue
  const activeMatch = activeDigit !== null && value === activeDigit
  return { inUnit, sameDigit, activeMatch }
}
