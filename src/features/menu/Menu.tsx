import { useState } from 'react'
import {
  computeCandidates,
  generatePuzzle,
  parseBoard,
  type DifficultyBand,
} from '../../engine'
import {
  SLOT_COUNT,
  clearPuzzleSlot,
  createLocalStorageStore,
  loadGameSession,
  loadPuzzleSlots,
  saveGameSession,
  writePuzzleSlot,
  type GameSessionV3,
  type PuzzleSlotsDocument,
} from '../../storage'
import './Menu.css'

const BANDS: DifficultyBand[] = ['easy', 'medium', 'hard', 'expert']
const store = createLocalStorageStore()

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSavedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return 'Saved'
  }
}

function clueCount(puzzle: string): number {
  let n = 0
  for (const ch of puzzle) {
    if (ch >= '1' && ch <= '9') n += 1
  }
  return n
}

function sessionFromPuzzle(puzzle: string): GameSessionV3 | null {
  const parsed = parseBoard(puzzle)
  if (!parsed.ok) return null
  return {
    version: 3,
    puzzle,
    board: puzzle,
    notes: computeCandidates(parsed.board),
    selected: 0,
    noteMode: false,
    annotations: { arrows: [], highlights: { cells: [], candidates: [] } },
    activeDigit: null,
    elapsedMs: 0,
  }
}

type MenuProps = {
  onPlay: () => void
}

export function Menu({ onPlay }: MenuProps) {
  const [band, setBand] = useState<DifficultyBand>('easy')
  const [slotsDoc, setSlotsDoc] = useState<PuzzleSlotsDocument>(() =>
    loadPuzzleSlots(store),
  )
  const [session, setSession] = useState<GameSessionV3 | null>(() =>
    loadGameSession(store),
  )
  const [status, setStatus] = useState('')
  const [generating, setGenerating] = useState(false)

  const refresh = () => {
    setSlotsDoc(loadPuzzleSlots(store))
    setSession(loadGameSession(store))
  }

  const openSession = (next: GameSessionV3) => {
    if (
      session !== null &&
      !window.confirm('Replace the current in-progress puzzle with this save?')
    ) {
      return
    }
    saveGameSession(store, next)
    onPlay()
  }

  const saveToSlot = (index: number) => {
    if (session === null) return
    const existing = slotsDoc.slots[index]
    if (
      existing?.occupied === true &&
      !window.confirm(`Overwrite slot ${index + 1}?`)
    ) {
      return
    }
    writePuzzleSlot(store, index, session)
    refresh()
    setStatus(`Saved to slot ${index + 1}`)
  }

  return (
    <div className="menu">
      <header className="menu-header">
        <h1 className="menu-title">Sudoku</h1>
        {session ? (
          <p className="menu-sub">
            In progress · {clueCount(session.puzzle)} clues ·{' '}
            {formatElapsed(session.elapsedMs)}
          </p>
        ) : (
          <p className="menu-sub">Offline · local saves only</p>
        )}
      </header>

      <section className="menu-section" aria-label="Play">
        {session ? (
          <button
            type="button"
            className="menu-btn menu-btn--primary"
            onClick={() => onPlay()}
          >
            Continue
          </button>
        ) : null}

        <div className="menu-new">
          <div className="band-toggle" role="group" aria-label="Difficulty">
            {BANDS.map((b) => (
              <button
                key={b}
                type="button"
                className={
                  band === b ? 'band-toggle__btn is-active' : 'band-toggle__btn'
                }
                aria-pressed={band === b}
                onClick={() => setBand(b)}
              >
                {b}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="menu-btn menu-btn--primary"
            disabled={generating}
            onClick={() => {
              setGenerating(true)
              setStatus('Generating…')
              window.setTimeout(() => {
                const result = generatePuzzle({
                  band,
                  seed: Date.now() >>> 0,
                  maxAttempts: band === 'easy' ? 40 : 100,
                })
                setGenerating(false)
                if (!result.ok) {
                  setStatus(result.error)
                  return
                }
                const next = sessionFromPuzzle(result.puzzle)
                if (next === null) {
                  setStatus('Could not open puzzle')
                  return
                }
                setStatus('')
                openSession(next)
              }, 0)
            }}
          >
            {generating ? 'Generating…' : 'New puzzle'}
          </button>
        </div>
        {status ? (
          <p className="menu-status" role="status">
            {status}
          </p>
        ) : null}
      </section>

      <section className="menu-section" aria-label="Saved puzzles">
        <h2 className="menu-section-title">Saves</h2>
        <div className="slot-grid">
          {slotsDoc.slots.map((slot, index) => (
            <div key={index} className="slot-card">
              <div className="slot-card__label">Slot {index + 1}</div>
              {slot.occupied ? (
                <>
                  <div className="slot-card__meta">
                    {formatSavedAt(slot.savedAt)}
                    <br />
                    {clueCount(slot.session.puzzle)} clues ·{' '}
                    {formatElapsed(slot.session.elapsedMs)}
                  </div>
                  <div className="slot-card__actions">
                    <button
                      type="button"
                      className="menu-btn"
                      onClick={() => openSession(slot.session)}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className="menu-btn"
                      disabled={session === null}
                      title={
                        session
                          ? 'Overwrite this slot with the current puzzle'
                          : 'No active puzzle to save'
                      }
                      onClick={() => saveToSlot(index)}
                    >
                      Save current
                    </button>
                    <button
                      type="button"
                      className="menu-btn menu-btn--ghost"
                      title="Clear this slot"
                      onClick={() => {
                        clearPuzzleSlot(store, index)
                        refresh()
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="slot-card__meta slot-card__meta--empty">
                    Empty
                  </div>
                  <div className="slot-card__actions">
                    <button
                      type="button"
                      className="menu-btn"
                      disabled={session === null}
                      title={
                        session
                          ? 'Save the current puzzle here'
                          : 'No active puzzle to save'
                      }
                      onClick={() => saveToSlot(index)}
                    >
                      Save current
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="menu-footnote">{SLOT_COUNT} slots · stored on this device</p>
      </section>
    </div>
  )
}
