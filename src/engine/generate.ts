import type { Digits } from '../types'
import type { Board } from './board'
import { EMPTY, createEmptyBoard, serialiseBoard } from './board'
import { computeCandidates, getCandidates } from './candidates'
import { CELL_COUNT } from './geometry'
import { uniquenessOf } from './search/unique'
import { type DifficultyBand, rateDifficulty } from './solve/rate'
import { isBoardComplete, isBoardValid } from './validate'

export type GenerateOptions = {
  band: DifficultyBand
  seed: number
  /** Max dig/fill attempts before giving up. */
  maxAttempts?: number
  /** Keep 180° rotational symmetry when digging. */
  symmetric?: boolean
}

export type GenerateResult =
  | { ok: true; puzzle: string; solution: string; band: DifficultyBand }
  | { ok: false; error: string }

/** Tiny mulberry32 PRNG — deterministic generation for tests. */
export function createRng(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

function mirror180(index: number): number {
  return CELL_COUNT - 1 - index
}

function clueCount(board: Board): number {
  let n = 0
  for (const v of board) if (v !== EMPTY) n++
  return n
}

/** Fill an empty board into a complete valid grid. */
export function fillGrid(rand: () => number): Board | null {
  const board = createEmptyBoard()
  if (!fillCell(board, rand)) return null
  return board
}

function fillCell(board: Board, rand: () => number): boolean {
  const candidates = computeCandidates(board)
  let best = -1
  let bestOpts: Digits[] = []
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board[i] !== EMPTY) continue
    const opts = getCandidates(candidates, i)
    if (opts.length === 0) return false
    if (best < 0 || opts.length < bestOpts.length) {
      best = i
      bestOpts = opts
      if (opts.length === 1) break
    }
  }
  if (best < 0) return true

  for (const digit of shuffle(bestOpts, rand)) {
    board[best] = digit
    if (fillCell(board, rand)) return true
    board[best] = EMPTY
  }
  return false
}

/**
 * Generate a unique puzzle whose logical rating hits `band`.
 * Clue count is a dig heuristic only — rating decides acceptance.
 */
export function generatePuzzle(options: GenerateOptions): GenerateResult {
  const maxAttempts = options.maxAttempts ?? 80
  const rand = createRng(options.seed)
  const symmetric = options.symmetric ?? true

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const filled = fillGrid(createRng((options.seed + attempt * 9973) >>> 0))
    if (filled === null || !isBoardComplete(filled)) continue
    const solution = filled.slice()
    const puzzle = digClues(solution, rand, symmetric, options.band)
    if (puzzle === null) continue
    if (uniquenessOf(puzzle) !== 'unique') continue
    const rated = rateDifficulty(puzzle)
    if (rated.kind !== 'rated' || rated.band !== options.band) continue
    return {
      ok: true,
      puzzle: serialiseBoard(puzzle),
      solution: serialiseBoard(solution),
      band: rated.band,
    }
  }

  return {
    ok: false,
    error: `Could not generate a ${options.band} puzzle in ${maxAttempts} attempts`,
  }
}

/**
 * Remove clues while uniqueness holds. Target remaining clues roughly by band
 * (search heuristic only).
 */
function digClues(
  solution: Board,
  rand: () => number,
  symmetric: boolean,
  band: DifficultyBand,
): Board | null {
  const board = solution.slice()
  const targetClues = clueTarget(band, rand)

  const order = shuffle(
    Array.from({ length: CELL_COUNT }, (_, i) => i),
    rand,
  )

  for (const index of order) {
    if (clueCount(board) <= targetClues) break
    if (board[index] === EMPTY) continue
    const pair = symmetric ? mirror180(index) : index
    const saved = board[index]!
    const savedPair = board[pair]!
    board[index] = EMPTY
    if (pair !== index) board[pair] = EMPTY

    if (uniquenessOf(board) !== 'unique') {
      board[index] = saved
      if (pair !== index) board[pair] = savedPair
    }
  }

  if (clueCount(board) >= CELL_COUNT) return null
  if (!isBoardValid(board)) return null
  return board
}

function clueTarget(band: DifficultyBand, rand: () => number): number {
  const ranges: Record<DifficultyBand, [number, number]> = {
    easy: [36, 42],
    medium: [30, 36],
    hard: [26, 32],
    expert: [22, 28],
  }
  const [lo, hi] = ranges[band]
  return lo + Math.floor(rand() * (hi - lo + 1))
}
