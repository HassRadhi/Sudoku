import type { Board as BoardModel } from '../engine'
import { EMPTY, GRID_SIZE, cellIndex, getCell, maskDigits, maskHas } from '../engine'
import type { Digits } from '../types'
import './Board.css'

type BoardProps = {
  board: BoardModel
  notes: readonly number[]
  givens: readonly boolean[]
  selected: number
  conflictCells?: ReadonlySet<number>
  onSelect: (index: number) => void
}

const NOTE_SLOTS: Digits[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Board({
  board,
  notes,
  givens,
  selected,
  conflictCells,
  onSelect,
}: BoardProps) {
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
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-selected={isSelected}
                aria-label={cellAriaLabel(row, col, value, isGiven, noteList, isConflict)}
                onClick={() => onSelect(index)}
              >
                {value === EMPTY ? (
                  <span className="board-notes" aria-hidden="true">
                    {NOTE_SLOTS.map((digit) => (
                      <span key={digit} className="board-note">
                        {maskHas(noteMask, digit) ? digit : ''}
                      </span>
                    ))}
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
