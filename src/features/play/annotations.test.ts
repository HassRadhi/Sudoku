import { describe, expect, it } from 'vitest'
import {
  annotationsFromSession,
  annotationsToSession,
  createEmptyAnnotations,
} from './annotations'

describe('annotations persistence mapping', () => {
  it('round-trips arrows and highlights', () => {
    const annotations = createEmptyAnnotations()
    annotations.arrows = [
      {
        id: 'a1',
        from: { cell: 2, digit: 4 },
        to: { cell: 11, digit: 5 },
        style: 'dotted',
        colour: 'c',
      },
    ]
    annotations.highlights = {
      cells: [
        { cell: 2, colour: 'a' },
        { cell: 11, colour: 'b' },
      ],
      candidates: [{ cell: 2, digit: 4 }],
    }
    annotations.selectedArrowId = 'a1'

    const session = annotationsToSession(annotations)
    expect(session.arrows).toHaveLength(1)
    expect(session.highlights.cells).toEqual([
      { cell: 2, colour: 'a' },
      { cell: 11, colour: 'b' },
    ])

    const restored = annotationsFromSession(session)
    expect(restored.arrows).toEqual(annotations.arrows)
    expect(restored.highlights).toEqual(annotations.highlights)
    expect(restored.selectedArrowId).toBeNull()
  })
})
