import type { Digits } from '../../../types'
import type { Board } from '../../board'
import {
  type CandidateGrid,
  getCandidateMask,
  maskCount,
  maskDigits,
  maskHas,
} from '../../candidates'
import { CELL_COUNT, peersOf } from '../../geometry'
import type { Elimination, SolveMove } from '../types'

/** XY-Wing: pivot with {X,Y}; pincer A {X,Z}; pincer B {Y,Z}; eliminate Z from common peers. */
export function findXyWing(
  _board: Board,
  candidates: CandidateGrid,
): SolveMove[] {
  const bivalue: number[] = []
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (maskCount(getCandidateMask(candidates, cell)) === 2) bivalue.push(cell)
  }

  for (const pivot of bivalue) {
    const [x, y] = maskDigits(getCandidateMask(candidates, pivot))
    if (x === undefined || y === undefined) continue
    const pivotPeers = new Set(peersOf(pivot))

    const pincers = bivalue.filter((c) => c !== pivot && pivotPeers.has(c))
    for (let i = 0; i < pincers.length; i++) {
      for (let j = i + 1; j < pincers.length; j++) {
        const a = pincers[i]!
        const b = pincers[j]!
        const aMask = getCandidateMask(candidates, a)
        const bMask = getCandidateMask(candidates, b)
        if (maskCount(aMask) !== 2 || maskCount(bMask) !== 2) continue

        // One pincer shares X only (plus Z), other shares Y only (plus Z).
        const aDigits = maskDigits(aMask)
        const bDigits = maskDigits(bMask)
        let z: Digits | null = null

        const tryWing = (pxMask: number, pyMask: number): Digits | null => {
          if (!maskHas(pxMask, x) || maskHas(pxMask, y)) return null
          if (!maskHas(pyMask, y) || maskHas(pyMask, x)) return null
          const zx = maskDigits(pxMask).find((d) => d !== x)
          const zy = maskDigits(pyMask).find((d) => d !== y)
          if (zx === undefined || zy === undefined || zx !== zy) return null
          return zx
        }

        z = tryWing(aMask, bMask) ?? tryWing(bMask, aMask)
        if (z === null) continue

        // Pincers must not see each other? Classic XY-Wing allows them not to share a unit
        // (otherwise it degenerates). Require they are not peers.
        if (peersOf(a).includes(b)) continue

        const aPeers = new Set(peersOf(a))
        const eliminations: Elimination[] = []
        for (const cell of peersOf(b)) {
          if (!aPeers.has(cell) || cell === pivot) continue
          if (!maskHas(getCandidateMask(candidates, cell), z)) continue
          eliminations.push({ cell, digit: z })
        }
        if (eliminations.length === 0) continue

        return [
          {
            technique: 'xy_wing',
            placements: [],
            eliminations,
            focusCells: [pivot, a, b],
            focusCandidates: [
              { cell: pivot, digit: x },
              { cell: pivot, digit: y },
              ...aDigits.map((digit) => ({ cell: a, digit })),
              ...bDigits.map((digit) => ({ cell: b, digit })),
            ],
          },
        ]
      }
    }
  }
  return []
}
