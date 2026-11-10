import type { Board } from '../board'
import { uniquenessOf } from '../search/unique'
import { TECHNIQUE_RANK } from './catalogue'
import { solveLogical } from './loop'
import type { SolveStep, TechniqueId } from './types'

/** Playable difficulty bands from hardest technique used. */
export type DifficultyBand = 'easy' | 'medium' | 'hard' | 'expert'

export type RateResult =
  | {
      kind: 'rated'
      band: DifficultyBand
      hardest: TechniqueId
      steps: SolveStep[]
    }
  | {
      /** Catalogue stuck on a unique grid — needs search; not a playable band. */
      kind: 'beyond'
      steps: SolveStep[]
    }
  | {
      /** Not uniquely determined (or invalid); not a playable band. */
      kind: 'ambiguous'
      steps: SolveStep[]
    }

/**
 * Band from technique rank (hardest on a successful path):
 * easy ≤ hidden_single (1); medium ≤ hidden_pair (4);
 * hard ≤ x_wing (7); expert ≤ xy_wing (9).
 */
export function bandFromRank(rank: number): DifficultyBand {
  if (rank <= 1) return 'easy'
  if (rank <= 4) return 'medium'
  if (rank <= 7) return 'hard'
  return 'expert'
}

export function hardestTechnique(steps: SolveStep[]): TechniqueId | null {
  let best: TechniqueId | null = null
  let bestRank = -1
  for (const step of steps) {
    const rank = TECHNIQUE_RANK[step.move.technique]
    if (rank > bestRank) {
      bestRank = rank
      best = step.move.technique
    }
  }
  return best
}

/**
 * Rate a puzzle by logical solve.
 * Stuck + unique → beyond; stuck + not unique → ambiguous; never fakes a band.
 */
export function rateDifficulty(board: Board): RateResult {
  const outcome = solveLogical(board)
  if (outcome.kind === 'stuck') {
    return uniquenessOf(board) === 'unique'
      ? { kind: 'beyond', steps: outcome.steps }
      : { kind: 'ambiguous', steps: outcome.steps }
  }
  const hardest = hardestTechnique(outcome.steps)
  // Empty puzzle already solved? treat as easy naked path with no steps.
  if (hardest === null) {
    return {
      kind: 'rated',
      band: 'easy',
      hardest: 'naked_single',
      steps: outcome.steps,
    }
  }
  return {
    kind: 'rated',
    band: bandFromRank(TECHNIQUE_RANK[hardest]),
    hardest,
    steps: outcome.steps,
  }
}
