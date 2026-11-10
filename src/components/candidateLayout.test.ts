import { describe, expect, it } from 'vitest'
import { candidateSlotCentre, candidateSlotCentres } from './candidateLayout'

describe('candidateSlotCentres', () => {
  it('returns nine centres in a 3×3 layout for a square cell', () => {
    const centres = candidateSlotCentres(90)
    expect(centres).toHaveLength(9)

    // Digit 1 top-left, 5 centre, 9 bottom-right.
    expect(centres[0]).toEqual({ x: 15, y: 15 })
    expect(centres[4]).toEqual({ x: 45, y: 45 })
    expect(centres[8]).toEqual({ x: 75, y: 75 })

    // Row-major order: 1 2 3 / 4 5 6 / 7 8 9
    expect(centres[1]).toEqual({ x: 45, y: 15 })
    expect(centres[2]).toEqual({ x: 75, y: 15 })
    expect(centres[3]).toEqual({ x: 15, y: 45 })
    expect(centres[6]).toEqual({ x: 15, y: 75 })
  })

  it('scales with non-square cell size', () => {
    expect(candidateSlotCentre(1, 60, 90)).toEqual({ x: 10, y: 15 })
    expect(candidateSlotCentre(9, 60, 90)).toEqual({ x: 50, y: 75 })
  })

  it('matches candidateSlotCentre for each digit', () => {
    const size = 120
    const centres = candidateSlotCentres(size)
    for (let digit = 1; digit <= 9; digit++) {
      expect(centres[digit - 1]).toEqual(
        candidateSlotCentre(digit as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, size),
      )
    }
  })
})
