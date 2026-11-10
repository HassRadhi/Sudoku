import { describe, expect, it } from 'vitest'
import { parseBoard } from './board'
import { generatePuzzle } from './generate'
import { uniquenessOf } from './search/unique'
import { rateDifficulty } from './solve/rate'
import type { DifficultyBand } from './solve/rate'

function expectBand(band: DifficultyBand, seed: number, maxAttempts: number) {
  const result = generatePuzzle({ band, seed, maxAttempts, symmetric: true })
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.band).toBe(band)
  const parsed = parseBoard(result.puzzle)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(uniquenessOf(parsed.board)).toBe('unique')
  const rated = rateDifficulty(parsed.board)
  expect(rated.kind).toBe('rated')
  if (rated.kind !== 'rated') return
  expect(rated.band).toBe(band)
}

describe('generatePuzzle', () => {
  it('produces a unique easy puzzle for a fixed seed', () => {
    expectBand('easy', 42, 40)
  })

  it('produces a unique medium puzzle for a fixed seed', () => {
    expectBand('medium', 7, 80)
  })

  it('produces a unique hard puzzle for a fixed seed', () => {
    expectBand('hard', 11, 100)
  })
})
