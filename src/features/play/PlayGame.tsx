import { useEffect, useReducer, useRef, useState } from 'react'
import { Board } from '../../components/Board'
import { hitTestCandidate } from '../../components/candidateLayout'
import {
  generatePuzzle,
  isDigits,
  validateBoard,
  type DifficultyBand,
} from '../../engine'
import {
  createLocalStorageStore,
  loadGameSession,
  saveGameSession,
} from '../../storage'
import type { Digits } from '../../types'
import { AnnotationOverlay } from './AnnotationOverlay'
import {
  createInitialPlayState,
  playReducer,
  playStateFromSession,
  sessionFromPlayState,
} from './playLogic'
import './PlayGame.css'
import '../../components/Board.css'

/** Debounce window for persisting meaningful play changes. */
const SAVE_DEBOUNCE_MS = 300

const BANDS: DifficultyBand[] = ['easy', 'medium', 'hard', 'expert']

const store = createLocalStorageStore()

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

export function PlayGame() {
  const [state, dispatch] = useReducer(playReducer, undefined, loadInitialPlayState)
  const [band, setBand] = useState<DifficultyBand>('easy')
  const [status, setStatus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [cellSize, setCellSize] = useState(0)
  const [preview, setPreview] = useState<{
    from: { cell: number; digit: Digits }
    to: { x: number; y: number }
  } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const dragFrom = useRef<{ cell: number; digit: Digits } | null>(null)
  const suppressNextSelect = useRef(false)
  const conflictCells = new Set(validateBoard(state.board).conflictCells)

  useEffect(() => {
    const flush = () => {
      saveGameSession(store, sessionFromPlayState(state))
    }
    const timer = window.setTimeout(flush, SAVE_DEBOUNCE_MS)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', flush)
    }
  }, [state])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const measure = () => {
      // Content box inside the board's 2px border (overlay uses inset: 2px).
      const width = shell.getBoundingClientRect().width - 4
      setCellSize(width / 9)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    rootRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return

      if (isMod(event) && !event.altKey) {
        const key = event.key.toLowerCase()
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault()
          dispatch({ type: 'undo' })
          return
        }
        if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault()
          dispatch({ type: 'redo' })
          return
        }
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          dispatch({ type: 'move', dRow: -1, dCol: 0 })
          return
        case 'ArrowDown':
          event.preventDefault()
          dispatch({ type: 'move', dRow: 1, dCol: 0 })
          return
        case 'ArrowLeft':
          event.preventDefault()
          dispatch({ type: 'move', dRow: 0, dCol: -1 })
          return
        case 'ArrowRight':
          event.preventDefault()
          dispatch({ type: 'move', dRow: 0, dCol: 1 })
          return
        default:
          break
      }

      if (event.repeat) return

      if (event.key === 'Delete' && event.shiftKey) {
        event.preventDefault()
        dispatch({ type: 'clearAnnotations' })
        return
      }

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        state.annotations.selectedArrowId !== null
      ) {
        event.preventDefault()
        dispatch({ type: 'deleteArrow' })
        return
      }

      switch (event.key) {
        case 'Backspace':
        case 'Delete':
        case '0':
          event.preventDefault()
          dispatch({ type: 'clear' })
          return
        case 'n':
        case 'N':
          event.preventDefault()
          dispatch({ type: 'toggleNoteMode' })
          return
        case 'h':
        case 'H':
          event.preventDefault()
          dispatch({ type: 'toggleCellHighlight' })
          return
        case '.':
          event.preventDefault()
          dispatch({
            type: 'setArrowStyle',
            style: state.arrowStyle === 'solid' ? 'dotted' : 'solid',
          })
          return
        case ',': {
          event.preventDefault()
          const order = ['a', 'b', 'c'] as const
          const idx = order.indexOf(state.arrowColour)
          dispatch({
            type: 'setArrowColour',
            colour: order[(idx + 1) % order.length]!,
          })
          return
        }
        default:
          break
      }

      if (event.key >= '1' && event.key <= '9') {
        const digit = Number(event.key)
        if (!isDigits(digit)) return
        event.preventDefault()
        dispatch({ type: 'enterDigit', digit })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, state.annotations.selectedArrowId, state.arrowStyle, state.arrowColour])

  const localPoint = (event: React.PointerEvent) => {
    const shell = shellRef.current
    if (!shell) return null
    const rect = shell.getBoundingClientRect()
    // Overlay is inset by the 2px board border.
    return {
      x: event.clientX - rect.left - 2,
      y: event.clientY - rect.top - 2,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.altKey || cellSize <= 0) return
    const pt = localPoint(event)
    if (!pt) return
    const hit = hitTestCandidate(pt.x, pt.y, cellSize)
    if (!hit) return
    event.preventDefault()
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
    dispatch({ type: 'addArrow', from, to: hit })
  }

  return (
    <div ref={rootRef} className="play-game" tabIndex={0}>
      <div className="play-toolbar" role="toolbar" aria-label="Puzzle controls">
        <label className="play-band">
          <span className="visually-hidden">Difficulty</span>
          <select
            value={band}
            onChange={(event) => setBand(event.target.value as DifficultyBand)}
            aria-label="Difficulty band"
          >
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="play-new"
          disabled={generating}
          onClick={() => {
            setGenerating(true)
            setStatus('Generating…')
            // Yield so the status paint lands before the sync search.
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
              dispatch({ type: 'loadPuzzle', puzzle: result.puzzle })
              setStatus(`${result.band} puzzle`)
            }, 0)
          }}
        >
          New
        </button>
        <span className="play-hint" aria-hidden="true">
          Alt+drag arrow · h highlight · . style · , colour · Shift+Del clear
        </span>
        {status ? (
          <span className="play-status" role="status">
            {status}
          </span>
        ) : null}
      </div>
      <span className="visually-hidden" aria-live="polite">
        {state.noteMode ? 'Note mode' : 'Digit mode'}
      </span>
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
          conflictCells={conflictCells}
          onSelect={(index) => {
            if (suppressNextSelect.current) {
              suppressNextSelect.current = false
              return
            }
            dispatch({ type: 'select', index })
            rootRef.current?.focus()
          }}
        />
        <AnnotationOverlay
          annotations={state.annotations}
          cellSize={cellSize}
          preview={
            preview
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
    </div>
  )
}
