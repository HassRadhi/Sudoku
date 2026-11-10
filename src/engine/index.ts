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

export {
  ALL_CANDIDATES_MASK,
  addCandidate,
  computeCandidates,
  digitBit,
  getCandidateMask,
  getCandidates,
  hasCandidate,
  isNakedSingleMask,
  maskCount,
  maskDigits,
  maskHas,
  recomputeCandidates,
  removeCandidate,
} from './candidates'
export type { CandidateGrid } from './candidates'

export {
  TECHNIQUES,
  TECHNIQUE_ORDER,
  TECHNIQUE_RANK,
  applyMove,
  applyMoves,
  bandFromRank,
  findHiddenPairs,
  findHiddenSingles,
  findHiddenTriples,
  findLockedCandidates,
  findNakedPairs,
  findNakedSingles,
  findNakedTriples,
  findSwordfish,
  findXWing,
  findXyWing,
  hardestTechnique,
  moveChangesState,
  rateDifficulty,
  solveLogical,
} from './solve'
export type {
  CandidateRef,
  DifficultyBand,
  Elimination,
  Placement,
  RateResult,
  SolveMove,
  SolveOutcome,
  SolveState,
  SolveStep,
  Technique,
  TechniqueId,
} from './solve'

export { uniquenessOf, countSolutions } from './search/unique'
export type { Uniqueness } from './search/unique'

export { createRng, fillGrid, generatePuzzle } from './generate'
export type { GenerateOptions, GenerateResult } from './generate'
