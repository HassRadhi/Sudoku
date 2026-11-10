/** Pure Sudoku logic. Must not import React, DOM, or storage. */

export type { CellValue, Digits } from '../types'

export {
  BOX_SIZE,
  CELL_COUNT,
  GRID_SIZE,
  boxIndices,
  boxOf,
  cellIndex,
  colIndices,
  colOf,
  peersOf,
  rowIndices,
  rowOf,
} from './geometry'

export {
  EMPTY,
  EMPTY_CHAR,
  createEmptyBoard,
  getCell,
  isDigits,
  parseBoard,
  serialiseBoard,
  setCell,
} from './board'
export type { Board, ParseResult } from './board'

export {
  isBoardComplete,
  isBoardValid,
  validateBoard,
} from './validate'
export type { Conflict, UnitKind, ValidationResult } from './validate'
