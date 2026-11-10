import { candidateAnchorInBoard } from '../../components/candidateLayout'
import type { Digits } from '../../types'
import { ARROW_COLOURS, type Annotations, type ArrowColour } from './annotations'

type PreviewArrow = {
  from: { cell: number; digit: Digits }
  to: { x: number; y: number }
  style: 'solid' | 'dotted'
  colour: ArrowColour
}

type AnnotationOverlayProps = {
  annotations: Annotations
  cellSize: number
  preview?: PreviewArrow | null
  onSelectArrow: (id: string) => void
}

export function AnnotationOverlay({
  annotations,
  cellSize,
  preview,
  onSelectArrow,
}: AnnotationOverlayProps) {
  if (cellSize <= 0) return null
  const boardSize = cellSize * 9

  return (
    <svg
      className="annotation-overlay"
      width={boardSize}
      height={boardSize}
      viewBox={`0 0 ${boardSize} ${boardSize}`}
      aria-hidden="true"
    >
      <defs>
        {ARROW_COLOURS.map((colour) => (
          <marker
            key={colour}
            id={`arrowhead-${colour}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path
              d="M0,0 L6,3 L0,6 Z"
              className={`annotation-arrowhead annotation-arrow--${colour}`}
            />
          </marker>
        ))}
      </defs>

      {annotations.highlights.cells.map((highlight) => {
        const col = highlight.cell % 9
        const row = Math.floor(highlight.cell / 9)
        return (
          <rect
            key={`hc-${highlight.cell}`}
            className={`annotation-cell-highlight annotation-cell-highlight--${highlight.colour}`}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
          />
        )
      })}

      {annotations.highlights.candidates.map((cand) => {
        const p = candidateAnchorInBoard(cand.cell, cand.digit, cellSize)
        return (
          <circle
            key={`hn-${cand.cell}-${cand.digit}`}
            className="annotation-candidate-highlight"
            cx={p.x}
            cy={p.y}
            r={cellSize / 8}
          />
        )
      })}

      {annotations.arrows.map((arrow) => {
        const from = candidateAnchorInBoard(
          arrow.from.cell,
          arrow.from.digit,
          cellSize,
        )
        const to = candidateAnchorInBoard(arrow.to.cell, arrow.to.digit, cellSize)
        const selected = arrow.id === annotations.selectedArrowId
        return (
          <line
            key={arrow.id}
            className={[
              'annotation-arrow',
              `annotation-arrow--${arrow.colour}`,
              arrow.style === 'dotted' ? 'annotation-arrow--dotted' : '',
              selected ? 'annotation-arrow--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            markerEnd={`url(#arrowhead-${arrow.colour})`}
            onClick={(event) => {
              event.stopPropagation()
              onSelectArrow(arrow.id)
            }}
          />
        )
      })}

      {preview ? (
        <line
          className={[
            'annotation-arrow',
            'annotation-arrow--preview',
            `annotation-arrow--${preview.colour}`,
            preview.style === 'dotted' ? 'annotation-arrow--dotted' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          x1={
            candidateAnchorInBoard(preview.from.cell, preview.from.digit, cellSize)
              .x
          }
          y1={
            candidateAnchorInBoard(preview.from.cell, preview.from.digit, cellSize)
              .y
          }
          x2={preview.to.x}
          y2={preview.to.y}
          markerEnd={`url(#arrowhead-${preview.colour})`}
        />
      ) : null}
    </svg>
  )
}
