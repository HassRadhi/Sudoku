export const GRID_SIZE = 9
export const CELL_COUNT = GRID_SIZE * GRID_SIZE
export const BOX_SIZE = 3

export function cellIndex(row: number, col: number): number {
  return row * GRID_SIZE + col
}

export function rowOf(index: number): number {
  return Math.floor(index / GRID_SIZE)
}

export function colOf(index: number): number {
  return index % GRID_SIZE
}

/** Box index 0–8, left-to-right then top-to-bottom. */
export function boxOf(index: number): number {
  const row = rowOf(index)
  const col = colOf(index)
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE)
}

export function rowIndices(row: number): number[] {
  const start = row * GRID_SIZE
  return Array.from({ length: GRID_SIZE }, (_, col) => start + col)
}

export function colIndices(col: number): number[] {
  return Array.from({ length: GRID_SIZE }, (_, row) => cellIndex(row, col))
}

export function boxIndices(box: number): number[] {
  const startRow = Math.floor(box / BOX_SIZE) * BOX_SIZE
  const startCol = (box % BOX_SIZE) * BOX_SIZE
  const indices: number[] = []
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      indices.push(cellIndex(startRow + r, startCol + c))
    }
  }
  return indices
}

/** Same row, column, or box as `index`, excluding itself. Sorted ascending. */
export function peersOf(index: number): number[] {
  const peers = new Set<number>()
  for (const i of rowIndices(rowOf(index))) peers.add(i)
  for (const i of colIndices(colOf(index))) peers.add(i)
  for (const i of boxIndices(boxOf(index))) peers.add(i)
  peers.delete(index)
  return [...peers].sort((a, b) => a - b)
}
