import type { Digits } from '../../types'

/** Technique catalogue ids, cheapest → hardest. */
export type TechniqueId =
  | 'naked_single'
  | 'hidden_single'
  | 'locked_candidates'
  | 'naked_pair'
  | 'hidden_pair'
  | 'naked_triple'
  | 'hidden_triple'
  | 'x_wing'
  | 'swordfish'
  | 'xy_wing'

export type CandidateRef = {
  cell: number
  digit: Digits
}

export type Placement = {
  cell: number
  digit: Digits
}

export type Elimination = CandidateRef

/** One logical finding from a technique. */
export type SolveMove = {
  technique: TechniqueId
  placements: Placement[]
  eliminations: Elimination[]
  focusCells: number[]
  focusCandidates: CandidateRef[]
}

export type SolveStep = {
  move: SolveMove
}

export type SolveOutcome =
  | { kind: 'solved'; steps: SolveStep[] }
  | { kind: 'stuck'; steps: SolveStep[]; boardIncomplete: true }

export type Technique = {
  id: TechniqueId
  /** Return the first useful move(s); empty if none. */
  find: (
    board: import('../board').Board,
    candidates: import('../candidates').CandidateGrid,
  ) => SolveMove[]
}
