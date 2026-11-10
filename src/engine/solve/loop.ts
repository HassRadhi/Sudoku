import type { Board } from '../board'
import { computeCandidates } from '../candidates'
import { isBoardComplete } from '../validate'
import { applyMove, moveChangesState, type SolveState } from './apply'
import { TECHNIQUES } from './catalogue'
import type { SolveOutcome, SolveStep } from './types'

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

    let progressed = false
    for (const technique of TECHNIQUES) {
      const moves = technique.find(state.board, state.candidates)
      for (const move of moves) {
        if (!moveChangesState(state, move)) continue
        state = applyMove(state, move)
        steps.push({ move })
        progressed = true
        break
      }
      if (progressed) break
    }

    if (!progressed) {
      return { kind: 'stuck', steps, boardIncomplete: true }
    }
  }
}
