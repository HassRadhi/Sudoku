import type { Digits } from '../types'
import type { Board } from './board'
import { EMPTY, isDigits } from './board'
import {
  CELL_COUNT,
  GRID_SIZE,
  boxIndices,
  colIndices,
  rowIndices,
} from './geometry'

export type UnitKind = 'row' | 'column' | 'box'

export type Conflict = {
  unit: UnitKind
  unitIndex: number
  digit: Digits
  cells: number[]
}

export type ValidationResult = {
  valid: boolean
  /** Cell indices that participate in at least one duplicate. Sorted unique. */
  conflictCells: number[]
  conflicts: Conflict[]
}

function findUnitConflicts(
  board: Board,
  unit: UnitKind,
  unitIndex: number,
  indices: number[],
): Conflict[] {
  const byDigit = new Map<Digits, number[]>()

  for (const index of indices) {
    const value = board[index] ?? EMPTY
    if (value === EMPTY || !isDigits(value)) continue
    const list = byDigit.get(value)
    if (list) list.push(index)
    else byDigit.set(value, [index])
  }

  const conflicts: Conflict[] = []
  for (const [digit, cells] of byDigit) {
    if (cells.length > 1) {
      conflicts.push({ unit, unitIndex, digit, cells })
    }
  }
  return conflicts
}

/** Check filled cells only: duplicates in any row, column, or box are conflicts. */
export function validateBoard(board: Board): ValidationResult {
  if (board.length !== CELL_COUNT) {
    return {
      valid: false,
      conflictCells: [],
      conflicts: [],
    }
  }

  const conflicts: Conflict[] = []

  for (let row = 0; row < GRID_SIZE; row++) {
    conflicts.push(...findUnitConflicts(board, 'row', row, rowIndices(row)))
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    conflicts.push(
      ...findUnitConflicts(board, 'column', col, colIndices(col)),
    )
  }
  for (let box = 0; box < GRID_SIZE; box++) {
    conflicts.push(...findUnitConflicts(board, 'box', box, boxIndices(box)))
  }

  const conflictCells = [
    ...new Set(conflicts.flatMap((conflict) => conflict.cells)),
  ].sort((a, b) => a - b)

  return {
    valid: conflicts.length === 0,
    conflictCells,
    conflicts,
  }
}

export function isBoardValid(board: Board): boolean {
  return validateBoard(board).valid
}

/** True when every cell is filled 1–9 and the board has no rule conflicts. */
export function isBoardComplete(board: Board): boolean {
  if (board.length !== CELL_COUNT) return false
  for (let i = 0; i < CELL_COUNT; i++) {
    if (!isDigits(board[i] ?? EMPTY)) return false
  }
  return isBoardValid(board)
}
