import type { Board as BoardModel } from '../engine'
import {
  EMPTY,
  GRID_SIZE,
  cellIndex,
  getCell,
  maskDigits,
  maskHas,
} from '../engine'
import type { Digits } from '../types'
import { cellEmphasis } from './boardEmphasis'
import './Board.css'

export type BoardHintFocus = {
  cells: readonly number[]
  candidates: readonly { cell: number; digit: Digits }[]
}

type BoardProps = {
  board: BoardModel
  notes: readonly number[]
  givens: readonly boolean[]
  selected: number
  activeDigit?: Digits | null
  hintFocus?: BoardHintFocus | null
  conflictCells?: ReadonlySet<number>
  onSelect: (index: number) => void
}

const NOTE_SLOTS: Digits[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Board({
  board,
  notes,
  givens,
  selected,
  activeDigit = null,
  hintFocus = null,
  conflictCells,
  onSelect,
}: BoardProps) {
  const hintCells = hintFocus ? new Set(hintFocus.cells) : null
  const hintCandidates = hintFocus
    ? new Set(hintFocus.candidates.map((c) => `${c.cell}:${c.digit}`))
    : null

  return (
    <div className="board" role="grid" aria-label="Sudoku board">
      {Array.from({ length: GRID_SIZE }, (_, row) => (
        <div key={row} className="board-row" role="row">
          {Array.from({ length: GRID_SIZE }, (_, col) => {
            const index = cellIndex(row, col)
            const value = getCell(board, index)
            const noteMask = notes[index] ?? 0
            const isGiven = givens[index] === true
            const isSelected = index === selected
            const isConflict = conflictCells?.has(index) === true
            const noteList = value === EMPTY ? maskDigits(noteMask) : []
            const emphasis = cellEmphasis(board, index, selected, activeDigit)
            const isHintCell = hintCells?.has(index) === true

            return (
              <button
                key={index}
                type="button"
                role="gridcell"
                tabIndex={-1}
                className={[
                  'board-cell',
                  isGiven ? 'board-cell--given' : 'board-cell--entry',
                  isSelected ? 'board-cell--selected' : '',
                  isConflict ? 'board-cell--conflict' : '',
                  emphasis.inUnit ? 'board-cell--unit' : '',
                  emphasis.sameDigit ? 'board-cell--same-digit' : '',
                  emphasis.activeMatch ? 'board-cell--active-digit' : '',
                  isHintCell ? 'board-cell--hint' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-selected={isSelected}
                aria-label={cellAriaLabel(row, col, value, isGiven, noteList, isConflict)}
                onClick={() => onSelect(index)}
              >
                {value === EMPTY ? (
                  <span className="board-notes" aria-hidden="true">
                    {NOTE_SLOTS.map((digit) => {
                      const show = maskHas(noteMask, digit)
                      const isActiveNote =
                        show && activeDigit !== null && digit === activeDigit
                      const isHintNote =
                        show &&
                        hintCandidates?.has(`${index}:${digit}`) === true
                      return (
                        <span
                          key={digit}
                          className={[
                            'board-note',
                            isActiveNote ? 'board-note--active' : '',
                            isHintNote ? 'board-note--hint' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {show ? digit : ''}
                        </span>
                      )
                    })}
                  </span>
                ) : (
                  value
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function cellAriaLabel(
  row: number,
  col: number,
  value: number,
  isGiven: boolean,
  noteList: Digits[],
  isConflict: boolean,
): string {
  const where = `Row ${row + 1}, column ${col + 1}`
  const conflict = isConflict ? ', conflict' : ''
  if (value !== EMPTY) {
    return `${where}, ${value}${isGiven ? ', given' : ''}${conflict}`
  }
  if (noteList.length === 0) return `${where}, empty`
  return `${where}, notes ${noteList.join(' ')}`
}
