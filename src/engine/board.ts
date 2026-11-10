import type { CellValue, Digits } from '../types'
import { CELL_COUNT } from './geometry'

/** Flat 81-cell board. Index = row * 9 + col. Empty cells are 0. */
export type Board = CellValue[]

export const EMPTY: CellValue = 0

/** Puzzle string empty-cell character. Digits are '1'–'9'. */
export const EMPTY_CHAR = '.'

export type ParseResult =
  | { ok: true; board: Board }
  | { ok: false; error: string }

export function createEmptyBoard(): Board {
  return Array.from({ length: CELL_COUNT }, () => EMPTY)
}

export function isDigits(value: number): value is Digits {
  return Number.isInteger(value) && value >= 1 && value <= 9
}

export function getCell(board: Board, index: number): CellValue {
  return board[index] ?? EMPTY
}

export function setCell(board: Board, index: number, value: CellValue): Board {
  const next = board.slice()
  next[index] = value
  return next
}

/**
 * Parse an 81-character puzzle string.
 * Digits '1'–'9' are filled; '.' is empty. Other characters are rejected.
 */
export function parseBoard(input: string): ParseResult {
  if (input.length !== CELL_COUNT) {
    return {
      ok: false,
      error: `Puzzle string must be ${CELL_COUNT} characters, got ${input.length}`,
    }
  }

  const board = createEmptyBoard()
  for (let i = 0; i < CELL_COUNT; i++) {
    const ch = input[i]!
    if (ch === EMPTY_CHAR) {
      board[i] = EMPTY
      continue
    }
    if (ch < '1' || ch > '9') {
      return {
        ok: false,
        error: `Invalid character '${ch}' at position ${i}; expected '1'-'9' or '${EMPTY_CHAR}'`,
      }
    }
    board[i] = Number(ch) as Digits
  }

  return { ok: true, board }
}

/** Serialise a board to an 81-character string (empty = '.'). */
export function serialiseBoard(board: Board): string {
  if (board.length !== CELL_COUNT) {
    throw new Error(`Board must have ${CELL_COUNT} cells, got ${board.length}`)
  }

  let out = ''
  for (let i = 0; i < CELL_COUNT; i++) {
    const value = board[i] ?? EMPTY
    if (value === EMPTY) {
      out += EMPTY_CHAR
      continue
    }
    if (!isDigits(value)) {
      throw new Error(`Invalid cell value ${value} at index ${i}`)
    }
    out += String(value)
  }
  return out
}
