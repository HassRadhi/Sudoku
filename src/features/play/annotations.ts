import type { Digits } from '../../types'
import type { SessionAnnotations } from '../../storage/gameSession'

export type CandidateRef = {
  cell: number
  digit: Digits
}

export type ArrowStyle = 'solid' | 'dotted'
export type ArrowColour = 'a' | 'b' | 'c'

export type AnnotationArrow = {
  id: string
  from: CandidateRef
  to: CandidateRef
  style: ArrowStyle
  colour: ArrowColour
}

export type AnnotationHighlights = {
  cells: number[]
  candidates: CandidateRef[]
}

/** Visual overlays — separate from engine/game rules. */
export type Annotations = {
  arrows: AnnotationArrow[]
  highlights: AnnotationHighlights
  selectedArrowId: string | null
}

export function createEmptyAnnotations(): Annotations {
  return {
    arrows: [],
    highlights: { cells: [], candidates: [] },
    selectedArrowId: null,
  }
}

export function annotationsToSession(
  annotations: Annotations,
): SessionAnnotations {
  return {
    arrows: annotations.arrows.map((a) => ({
      id: a.id,
      from: { cell: a.from.cell, digit: a.from.digit },
      to: { cell: a.to.cell, digit: a.to.digit },
      style: a.style,
      colour: a.colour,
    })),
    highlights: {
      cells: annotations.highlights.cells.slice(),
      candidates: annotations.highlights.candidates.map((c) => ({
        cell: c.cell,
        digit: c.digit,
      })),
    },
  }
}

export function annotationsFromSession(
  session: SessionAnnotations,
): Annotations {
  return {
    arrows: session.arrows.map((a) => ({
      id: a.id,
      from: { cell: a.from.cell, digit: a.from.digit as Digits },
      to: { cell: a.to.cell, digit: a.to.digit as Digits },
      style: a.style,
      colour: a.colour,
    })),
    highlights: {
      cells: session.highlights.cells.slice(),
      candidates: session.highlights.candidates.map((c) => ({
        cell: c.cell,
        digit: c.digit as Digits,
      })),
    },
    selectedArrowId: null,
  }
}

let arrowSeq = 0

export function nextArrowId(): string {
  arrowSeq += 1
  return `a${arrowSeq}`
}

export function sameCandidateRef(a: CandidateRef, b: CandidateRef): boolean {
  return a.cell === b.cell && a.digit === b.digit
}
