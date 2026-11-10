import type { Digits } from '../../types'
import type { Board } from '../board'
import { EMPTY, setCell } from '../board'
import {
  type CandidateGrid,
  computeCandidates,
  digitBit,
  removeCandidate,
} from '../candidates'
import type { SolveMove } from './types'

export type SolveState = {
  board: Board
  candidates: CandidateGrid
}

/** Apply one move. Placements trigger full candidate recalc; then eliminations shrink the grid. */
export function applyMove(state: SolveState, move: SolveMove): SolveState {
  let board = state.board
  let candidates = state.candidates
  let placed = false

  for (const p of move.placements) {
    if (board[p.cell] !== EMPTY) continue
    board = setCell(board, p.cell, p.digit)
    placed = true
  }

  if (placed) {
    candidates = computeCandidates(board)
  }

  for (const e of move.eliminations) {
    if (board[e.cell] !== EMPTY) continue
    candidates = removeCandidate(candidates, e.cell, e.digit)
  }

  return { board, candidates }
}

export function applyMoves(state: SolveState, moves: SolveMove[]): SolveState {
  let next = state
  for (const move of moves) {
    next = applyMove(next, move)
  }
  return next
}

/** True when a move changes board or candidates. */
export function moveChangesState(state: SolveState, move: SolveMove): boolean {
  for (const p of move.placements) {
    if (state.board[p.cell] === EMPTY) return true
  }
  for (const e of move.eliminations) {
    const mask = state.candidates[e.cell] ?? 0
    if ((mask & digitBit(e.digit as Digits)) !== 0) return true
  }
  return false
}
