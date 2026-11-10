import type { Board as BoardModel } from '../engine'
import { EMPTY, GRID_SIZE, cellIndex, getCell } from '../engine'
import './Board.css'

type BoardProps = {
  board: BoardModel
  givens: readonly boolean[]
  selected: number
  onSelect: (index: number) => void
}

export function Board({ board, givens, selected, onSelect }: BoardProps) {
  return (
    <div className="board" role="grid" aria-label="Sudoku board">
      {Array.from({ length: GRID_SIZE }, (_, row) => (
        <div key={row} className="board-row" role="row">
          {Array.from({ length: GRID_SIZE }, (_, col) => {
            const index = cellIndex(row, col)
            const value = getCell(board, index)
            const isGiven = givens[index] === true
            const isSelected = index === selected

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
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-selected={isSelected}
                aria-label={
                  value === EMPTY
                    ? `Row ${row + 1}, column ${col + 1}, empty`
                    : `Row ${row + 1}, column ${col + 1}, ${value}${isGiven ? ', given' : ''}`
                }
                onClick={() => onSelect(index)}
              >
                {value === EMPTY ? '' : value}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
