import { useEffect, useReducer, useRef, useState } from 'react'
import { Board } from '../../components/Board'
import { hitTestCandidate } from '../../components/candidateLayout'
import {
  applyMove,
  computeCandidates,
  generatePuzzle,
  isBoardComplete,
  isDigits,
  validateBoard,
  type DifficultyBand,
  type SolveMove,
} from '../../engine'
import {
  createLocalStorageStore,
  loadGameSession,
  saveGameSession,
} from '../../storage'
import type { Digits } from '../../types'
import { AnnotationOverlay } from './AnnotationOverlay'
import { ARROW_COLOURS, type ArrowColour } from './annotations'
import {
  createInitialPlayState,
  describeHintMove,
  peekHintMove,
  playReducer,
  playStateFromSession,
  sessionFromPlayState,
  techniqueLabel,
} from './playLogic'
import './PlayGame.css'
import '../../components/Board.css'

const SAVE_DEBOUNCE_MS = 300
const BANDS: DifficultyBand[] = ['easy', 'medium', 'hard', 'expert']
const DIGITS: Digits[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const store = createLocalStorageStore()

type DrawTool = 'highlight' | 'solid' | 'dotted'

function loadInitialPlayState() {
  const session = loadGameSession(store)
  if (session === null) return createInitialPlayState()
  return playStateFromSession(session) ?? createInitialPlayState()
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

function isMod(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type PlayGameProps = {
  onMenu: () => void
}

export function PlayGame({ onMenu }: PlayGameProps) {
  const [state, dispatch] = useReducer(playReducer, undefined, loadInitialPlayState)
  const [band, setBand] = useState<DifficultyBand>('easy')
  const [status, setStatus] = useState('')
  const [liveMessage, setLiveMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawTool, setDrawTool] = useState<DrawTool>('solid')
  const [pendingHint, setPendingHint] = useState<SolveMove | null>(null)
  const [cellSize, setCellSize] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [preview, setPreview] = useState<{
    from: { cell: number; digit: Digits }
    to: { x: number; y: number }
  } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dragFrom = useRef<{ cell: number; digit: Digits } | null>(null)
  const suppressNextSelect = useRef(false)
  const elapsedRef = useRef(state.elapsedMs)
  const runningSinceRef = useRef<number | null>(null)
  const stateRef = useRef(state)
  const completeRef = useRef(false)
  const pendingHintRef = useRef<SolveMove | null>(null)
  const conflictCells = new Set(validateBoard(state.board).conflictCells)
  const complete = isBoardComplete(state.board)
  const timerActive = timerRunning && !complete

  useEffect(() => {
    stateRef.current = state
    completeRef.current = complete
    elapsedRef.current = state.elapsedMs
    pendingHintRef.current = pendingHint
  }, [state, complete, pendingHint])

  useEffect(() => {
    const flush = () => {
      const live =
        timerActive && runningSinceRef.current !== null
          ? elapsedRef.current + (Date.now() - runningSinceRef.current)
          : elapsedRef.current
      saveGameSession(
        store,
        sessionFromPlayState({ ...stateRef.current, elapsedMs: live }),
      )
    }
    const timer = window.setTimeout(flush, SAVE_DEBOUNCE_MS)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', flush)
    }
  }, [state, timerActive])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const measure = () => {
      const width = shell.getBoundingClientRect().width - 4
      setCellSize(width / 9)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!timerActive) {
      runningSinceRef.current = null
      return
    }
    runningSinceRef.current = Date.now()
    const id = window.setInterval(() => {
      const since = runningSinceRef.current
      if (since === null) return
      const now = Date.now()
      const next = elapsedRef.current + (now - since)
      runningSinceRef.current = now
      elapsedRef.current = next
      dispatch({ type: 'setElapsedMs', elapsedMs: next })
    }, 1000)
    return () => {
      window.clearInterval(id)
      if (runningSinceRef.current === null) return
      const next =
        elapsedRef.current + (Date.now() - runningSinceRef.current)
      runningSinceRef.current = null
      elapsedRef.current = next
      dispatch({ type: 'setElapsedMs', elapsedMs: next })
    }
  }, [timerActive])

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) return
      if (runningSinceRef.current !== null) {
        const next = elapsedRef.current + (Date.now() - runningSinceRef.current)
        elapsedRef.current = next
        runningSinceRef.current = null
        dispatch({ type: 'setElapsedMs', elapsedMs: next })
      }
      setTimerRunning(false)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [menuOpen])

  const markPlayed = () => {
    if (!completeRef.current) setTimerRunning(true)
  }

  const flushAndMenu = () => {
    const live =
      timerActive && runningSinceRef.current !== null
        ? elapsedRef.current + (Date.now() - runningSinceRef.current)
        : elapsedRef.current
    setTimerRunning(false)
    saveGameSession(
      store,
      sessionFromPlayState({ ...stateRef.current, elapsedMs: live }),
    )
    onMenu()
  }

  const syncArrowStyle = (tool: DrawTool) => {
    if (tool === 'solid' || tool === 'dotted') {
      dispatch({ type: 'setArrowStyle', style: tool })
    }
  }

  const runHint = () => {
    markPlayed()
    const current = stateRef.current
    const pending = pendingHintRef.current
    if (pending !== null) {
      const candidates = computeCandidates(current.board)
      const next = applyMove({ board: current.board, candidates }, pending)
      dispatch({
        type: 'applyHint',
        step: {
          board: next.board,
          notes: next.candidates,
          move: pending,
        },
      })
      const detail = describeHintMove(pending)
      setStatus(detail)
      setLiveMessage(detail)
      setPendingHint(null)
      return
    }
    const move = peekHintMove(current.board)
    if (move === null) {
      setPendingHint(null)
      setLiveMessage('No hint')
      setStatus('No hint')
      return
    }
    setPendingHint(move)
    dispatch({ type: 'previewHint', move })
    const label = techniqueLabel(move.technique)
    setStatus(`${label} — hint again to apply`)
    setLiveMessage(label)
  }
  const runHintRef = useRef(runHint)
  useEffect(() => {
    runHintRef.current = runHint
  })

  const runNewPuzzle = () => {
    setMenuOpen(false)
    setGenerating(true)
    setStatus('Generating…')
    setLiveMessage('')
    setPendingHint(null)
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
      setTimerRunning(false)
      elapsedRef.current = 0
      dispatch({ type: 'loadPuzzle', puzzle: result.puzzle })
      setStatus(`${result.band} puzzle`)
      rootRef.current?.focus()
    }, 0)
  }

  useEffect(() => {
    rootRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return
      const current = stateRef.current

      if (isMod(event) && !event.altKey) {
        const key = event.key.toLowerCase()
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault()
          markPlayed()
          setPendingHint(null)
          dispatch({ type: 'undo' })
          return
        }
        if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault()
          markPlayed()
          setPendingHint(null)
          dispatch({ type: 'redo' })
          return
        }
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          markPlayed()
          dispatch({ type: 'move', dRow: -1, dCol: 0 })
          return
        case 'ArrowDown':
          event.preventDefault()
          markPlayed()
          dispatch({ type: 'move', dRow: 1, dCol: 0 })
          return
        case 'ArrowLeft':
          event.preventDefault()
          markPlayed()
          dispatch({ type: 'move', dRow: 0, dCol: -1 })
          return
        case 'ArrowRight':
          event.preventDefault()
          markPlayed()
          dispatch({ type: 'move', dRow: 0, dCol: 1 })
          return
        case 'Escape':
          event.preventDefault()
          setPendingHint(null)
          setMenuOpen(false)
          dispatch({ type: 'clearActiveDigit' })
          return
        default:
          break
      }

      if (event.repeat) return

      if (event.key === 'Delete' && event.shiftKey) {
        event.preventDefault()
        markPlayed()
        setPendingHint(null)
        dispatch({ type: 'clearAnnotations' })
        return
      }

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        current.annotations.selectedArrowId !== null
      ) {
        event.preventDefault()
        markPlayed()
        dispatch({ type: 'deleteArrow' })
        return
      }

      switch (event.key) {
        case 'Backspace':
        case 'Delete':
        case '0':
          event.preventDefault()
          markPlayed()
          setPendingHint(null)
          dispatch({ type: 'clear' })
          return
        case 'n':
        case 'N':
          event.preventDefault()
          markPlayed()
          dispatch({ type: 'toggleNoteMode' })
          return
        case 'a':
        case 'A':
          event.preventDefault()
          markPlayed()
          setPendingHint(null)
          dispatch({ type: 'refillNotes' })
          return
        case 'h':
        case 'H':
          event.preventDefault()
          runHintRef.current()
          return
        case 'r':
        case 'R':
          event.preventDefault()
          setTimerRunning(false)
          elapsedRef.current = 0
          setPendingHint(null)
          dispatch({ type: 'resetPuzzle' })
          setStatus('Reset')
          setLiveMessage('')
          return
        default:
          break
      }

      if (event.key >= '1' && event.key <= '9') {
        const digit = Number(event.key)
        if (!isDigits(digit)) return
        event.preventDefault()
        markPlayed()
        setPendingHint(null)
        dispatch({ type: 'enterDigit', digit })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const localPoint = (event: React.PointerEvent) => {
    const shell = shellRef.current
    if (!shell) return null
    const rect = shell.getBoundingClientRect()
    return {
      x: event.clientX - rect.left - 2,
      y: event.clientY - rect.top - 2,
    }
  }

  const arrowDrawing = drawTool === 'solid' || drawTool === 'dotted'

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const wantArrow = arrowDrawing || event.altKey
    if (!wantArrow || cellSize <= 0 || state.arrowColour === null) return
    const pt = localPoint(event)
    if (!pt) return
    const hit = hitTestCandidate(pt.x, pt.y, cellSize)
    if (!hit) return
    event.preventDefault()
    markPlayed()
    setPendingHint(null)
    if (arrowDrawing) syncArrowStyle(drawTool)
    suppressNextSelect.current = true
    dragFrom.current = hit
    setPreview({ from: hit, to: pt })
    shellRef.current?.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragFrom.current) return
    const pt = localPoint(event)
    if (!pt) return
    setPreview({ from: dragFrom.current, to: pt })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragFrom.current || cellSize <= 0) return
    const pt = localPoint(event)
    const from = dragFrom.current
    dragFrom.current = null
    setPreview(null)
    if (!pt) return
    const hit = hitTestCandidate(pt.x, pt.y, cellSize)
    if (!hit) return
    markPlayed()
    dispatch({ type: 'addArrow', from, to: hit })
  }

  return (
    <div ref={rootRef} className="play-game" tabIndex={0}>
      <div className="play-toolbar" role="toolbar" aria-label="Puzzle controls">
        <button
          type="button"
          className="play-btn"
          title="Back to menu"
          onClick={flushAndMenu}
        >
          Menu
        </button>

        <div className="play-overflow" ref={menuRef}>
          <button
            type="button"
            className="play-btn play-hamburger"
            title="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="play-hamburger__bar" />
            <span className="play-hamburger__bar" />
            <span className="play-hamburger__bar" />
          </button>
          {menuOpen ? (
            <div className="play-overflow__menu" role="menu">
              <div className="play-overflow__section" role="group" aria-label="Difficulty">
                {BANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    role="menuitemradio"
                    aria-checked={band === b}
                    className={
                      band === b
                        ? 'play-overflow__item is-active'
                        : 'play-overflow__item'
                    }
                    onClick={() => setBand(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <button
                type="button"
                role="menuitem"
                className="play-overflow__item"
                disabled={generating}
                title="New puzzle"
                onClick={runNewPuzzle}
              >
                New puzzle
              </button>
              <button
                type="button"
                role="menuitem"
                className="play-overflow__item"
                title="Reset puzzle (R)"
                onClick={() => {
                  setMenuOpen(false)
                  setTimerRunning(false)
                  elapsedRef.current = 0
                  setPendingHint(null)
                  dispatch({ type: 'resetPuzzle' })
                  setStatus('Reset')
                  setLiveMessage('')
                  rootRef.current?.focus()
                }}
              >
                Reset
              </button>
              <button
                type="button"
                role="menuitem"
                className="play-overflow__item"
                title="Undo (Ctrl+Z)"
                onClick={() => {
                  setMenuOpen(false)
                  markPlayed()
                  setPendingHint(null)
                  dispatch({ type: 'undo' })
                }}
              >
                Undo
              </button>
              <button
                type="button"
                role="menuitem"
                className="play-overflow__item"
                title="Redo (Ctrl+Y)"
                onClick={() => {
                  setMenuOpen(false)
                  markPlayed()
                  setPendingHint(null)
                  dispatch({ type: 'redo' })
                }}
              >
                Redo
              </button>
              <button
                type="button"
                role="menuitem"
                className="play-overflow__item"
                title="Recompute notes (A)"
                onClick={() => {
                  setMenuOpen(false)
                  markPlayed()
                  setPendingHint(null)
                  dispatch({ type: 'refillNotes' })
                  setStatus('Notes recomputed')
                  rootRef.current?.focus()
                }}
              >
                Recompute notes
              </button>
              <button
                type="button"
                role="menuitem"
                className="play-overflow__item"
                title="Clear all notes"
                onClick={() => {
                  setMenuOpen(false)
                  markPlayed()
                  setPendingHint(null)
                  dispatch({ type: 'clearAllNotes' })
                  setStatus('Notes cleared')
                  rootRef.current?.focus()
                }}
              >
                Clear all notes
              </button>
              <button
                type="button"
                role="menuitem"
                className="play-overflow__item"
                title="Clear annotations (Shift+Delete)"
                onClick={() => {
                  setMenuOpen(false)
                  markPlayed()
                  setPendingHint(null)
                  dispatch({ type: 'clearAnnotations' })
                }}
              >
                Clear marks
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={pendingHint ? 'play-btn is-active' : 'play-btn'}
          title="Hint (H) — once for technique, twice for details"
          onClick={() => {
            runHint()
            rootRef.current?.focus()
          }}
        >
          Hint
        </button>

        <span className="play-timer" aria-label="Elapsed time">
          {formatElapsed(state.elapsedMs)}
        </span>

        {status ? (
          <span className="play-status" role="status">
            {status}
          </span>
        ) : null}
      </div>

      <span className="visually-hidden" aria-live="polite">
        {[
          state.noteMode ? 'Note mode' : 'Digit mode',
          complete ? 'Puzzle complete' : '',
          liveMessage,
        ]
          .filter(Boolean)
          .join('. ')}
      </span>

      <div className="play-main">
        <div
          ref={shellRef}
          className="board-shell"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragFrom.current = null
            setPreview(null)
          }}
        >
          <Board
            board={state.board}
            notes={state.notes}
            givens={state.givens}
            selected={state.selected}
            activeDigit={state.activeDigit}
            hintFocus={state.hintFocus}
            conflictCells={conflictCells}
            onSelect={(index) => {
              if (suppressNextSelect.current) {
                suppressNextSelect.current = false
                return
              }
              markPlayed()
              setPendingHint(null)
              dispatch({ type: 'select', index })
              if (drawTool === 'highlight') {
                dispatch({ type: 'toggleCellHighlight', cell: index })
              }
              rootRef.current?.focus()
            }}
          />
          <AnnotationOverlay
            annotations={state.annotations}
            cellSize={cellSize}
            preview={
              preview && state.arrowColour !== null
                ? {
                    ...preview,
                    style: state.arrowStyle,
                    colour: state.arrowColour,
                  }
                : null
            }
            onSelectArrow={(id) => dispatch({ type: 'selectArrow', id })}
          />
        </div>

        <div className="play-side">
          <div className="number-pad" role="group" aria-label="Number pad">
            {DIGITS.map((digit) => (
              <button
                key={digit}
                type="button"
                className={
                  state.activeDigit === digit
                    ? 'number-pad__btn is-active'
                    : 'number-pad__btn'
                }
                title={`Enter ${digit} (again to deselect)`}
                onClick={() => {
                  markPlayed()
                  setPendingHint(null)
                  dispatch({ type: 'enterDigit', digit })
                  rootRef.current?.focus()
                }}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              className={
                state.noteMode
                  ? 'number-pad__btn number-pad__btn--wide is-active'
                  : 'number-pad__btn number-pad__btn--wide'
              }
              title="Toggle note mode (N)"
              aria-pressed={state.noteMode}
              onClick={() => {
                markPlayed()
                dispatch({ type: 'toggleNoteMode' })
                rootRef.current?.focus()
              }}
            >
              Notes
            </button>
          </div>

          <div className="mark-pad" role="group" aria-label="Mark tools">
            <button
              type="button"
              className={
                drawTool === 'highlight'
                  ? 'mark-pad__tool is-active'
                  : 'mark-pad__tool'
              }
              title="Highlight cells"
              aria-pressed={drawTool === 'highlight'}
              onClick={() => setDrawTool('highlight')}
            >
              Fill
            </button>
            <button
              type="button"
              className={
                drawTool === 'solid' ? 'mark-pad__tool is-active' : 'mark-pad__tool'
              }
              title="Solid arrows — drag between candidates"
              aria-pressed={drawTool === 'solid'}
              onClick={() => {
                setDrawTool('solid')
                dispatch({ type: 'setArrowStyle', style: 'solid' })
              }}
            >
              Solid
            </button>
            <button
              type="button"
              className={
                drawTool === 'dotted'
                  ? 'mark-pad__tool is-active'
                  : 'mark-pad__tool'
              }
              title="Dotted arrows — drag between candidates"
              aria-pressed={drawTool === 'dotted'}
              onClick={() => {
                setDrawTool('dotted')
                dispatch({ type: 'setArrowStyle', style: 'dotted' })
              }}
            >
              Dotted
            </button>
          </div>

          <div className="colour-pad" role="group" aria-label="Mark colours">
            {ARROW_COLOURS.map((colour) => (
              <button
                key={colour}
                type="button"
                className={
                  state.arrowColour === colour
                    ? `colour-pad__swatch colour-pad__swatch--${colour} is-active`
                    : `colour-pad__swatch colour-pad__swatch--${colour}`
                }
                title={`Colour ${colour.toUpperCase()} (again to deselect)`}
                aria-label={`Colour ${colour}`}
                aria-pressed={state.arrowColour === colour}
                onClick={() =>
                  dispatch({
                    type: 'setArrowColour',
                    colour: colour as ArrowColour,
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
