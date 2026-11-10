import type { Board } from '../board'
import type { CandidateGrid } from '../candidates'
import { computeCandidates } from '../candidates'
import { isBoardComplete } from '../validate'
import { applyMove, moveChangesState, type SolveState } from './apply'
import { TECHNIQUES } from './catalogue'
import type { SolveMove, SolveOutcome, SolveStep } from './types'

/** First catalogue move that changes state, or null if stuck. */
export function findNextMove(
  board: Board,
  candidates: CandidateGrid = computeCandidates(board),
): SolveMove | null {
  const state: SolveState = { board, candidates }
  for (const technique of TECHNIQUES) {
    for (const move of technique.find(board, candidates)) {
      if (moveChangesState(state, move)) return move
    }
  }
  return null
}

/** Logical solve using the technique catalogue in rank order. */
export function solveLogical(board: Board): SolveOutcome {
  let state: SolveState = {
    board: board.slice(),
    candidates: computeCandidates(board),
  }
  const steps: SolveStep[] = []

  for (;;) {
    if (isBoardComplete(state.board)) {
      return { kind: 'solved', steps }
    }

    const move = findNextMove(state.board, state.candidates)
    if (move === null) {
      return { kind: 'stuck', steps, boardIncomplete: true }
    }
    state = applyMove(state, move)
    steps.push({ move })
  }
}
