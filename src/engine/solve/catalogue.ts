import type { Technique, TechniqueId } from './types'
import { findHiddenSingles, findNakedSingles } from './techniques/singles'
import { findLockedCandidates } from './techniques/lockedCandidates'
import {
  findHiddenPairs,
  findHiddenTriples,
  findNakedPairs,
  findNakedTriples,
} from './techniques/subsets'
import { findSwordfish, findXWing } from './techniques/fish'
import { findXyWing } from './techniques/xyWing'

/** Cheapest → hardest. Rank = index. */
export const TECHNIQUE_ORDER: TechniqueId[] = [
  'naked_single',
  'hidden_single',
  'locked_candidates',
  'naked_pair',
  'hidden_pair',
  'naked_triple',
  'hidden_triple',
  'x_wing',
  'swordfish',
  'xy_wing',
]

export const TECHNIQUE_RANK: Record<TechniqueId, number> = Object.fromEntries(
  TECHNIQUE_ORDER.map((id, i) => [id, i]),
) as Record<TechniqueId, number>

export const TECHNIQUES: Technique[] = [
  { id: 'naked_single', find: findNakedSingles },
  { id: 'hidden_single', find: findHiddenSingles },
  { id: 'locked_candidates', find: findLockedCandidates },
  { id: 'naked_pair', find: findNakedPairs },
  { id: 'hidden_pair', find: findHiddenPairs },
  { id: 'naked_triple', find: findNakedTriples },
  { id: 'hidden_triple', find: findHiddenTriples },
  { id: 'x_wing', find: findXWing },
  { id: 'swordfish', find: findSwordfish },
  { id: 'xy_wing', find: findXyWing },
]
