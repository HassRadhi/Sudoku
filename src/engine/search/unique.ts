import type { Digits } from '../../types'
import type { Board } from '../board'
import { EMPTY } from '../board'
import { computeCandidates, getCandidates } from '../candidates'
import { CELL_COUNT } from '../geometry'
import { isBoardValid } from '../validate'

export type Uniqueness = 'none' | 'unique' | 'multiple'

/**
 * Brute-force solution counter (stops at 2). Separate from logical rating.
 * ponytail: O(search) DFS; fine for generation/tests, not for interactive hints.
 */
export function countSolutions(board: Board, limit = 2): number {
  if (!isBoardValid(board)) return 0
  const work = board.slice()
  return search(work, limit)
}

export function uniquenessOf(board: Board): Uniqueness {
  const n = countSolutions(board, 2)
  if (n === 0) return 'none'
  if (n === 1) return 'unique'
  return 'multiple'
}

function search(board: Board, limit: number): number {
  const candidates = computeCandidates(board)
  let best = -1
  let bestCount = 10
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] !== EMPTY) continue
    const opts = getCandidates(candidates, i)
    if (opts.length === 0) return 0
    if (opts.length < bestCount) {
      bestCount = opts.length
      best = i
      if (bestCount === 1) break
    }
  }
  if (best < 0) return 1

  let found = 0
  for (const digit of getCandidates(candidates, best)) {
    board[best] = digit as Digits
    found += search(board, limit - found)
    board[best] = EMPTY
    if (found >= limit) return found
  }
  return found
}
