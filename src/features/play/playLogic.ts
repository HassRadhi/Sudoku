import {
  EMPTY,
  GRID_SIZE,
  cellIndex,
  colOf,
  parseBoard,
  rowOf,
  setCell,
  type Board,
} from '../../engine'
import type { Digits } from '../../types'

/** Classic valid incomplete puzzle (Wikipedia sample). */
export const SAMPLE_PUZZLE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'

export function loadSampleBoard(): Board {
  const parsed = parseBoard(SAMPLE_PUZZLE)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.board
}

/** True where the initial puzzle had a digit (immutable givens). */
export function buildGivens(board: Board): boolean[] {
  return board.map((value) => value !== EMPTY)
}

/** Move selection by row/col delta; stops at board edges. */
export function moveSelection(
  selected: number,
  dRow: number,
  dCol: number,
): number {
  const nextRow = Math.min(GRID_SIZE - 1, Math.max(0, rowOf(selected) + dRow))
  const nextCol = Math.min(GRID_SIZE - 1, Math.max(0, colOf(selected) + dCol))
  return cellIndex(nextRow, nextCol)
}

export function setDigit(
  board: Board,
  givens: readonly boolean[],
  index: number,
  digit: Digits,
): Board {
  if (givens[index]) return board
  return setCell(board, index, digit)
}

export function clearDigit(
  board: Board,
  givens: readonly boolean[],
  index: number,
): Board {
  if (givens[index]) return board
  return setCell(board, index, EMPTY)
}
