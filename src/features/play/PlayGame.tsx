import { useEffect, useReducer, useRef, useState } from 'react'
import { Board } from '../../components/Board'
import { hitTestCandidate } from '../../components/candidateLayout'
import {
  generatePuzzle,
  isBoardComplete,
  isDigits,
  validateBoard,
  type DifficultyBand,
} from '../../engine'
import {
  createLocalStorageStore,
  loadGameSession,
  loadPlaySettings,
  saveGameSession,
  savePlaySettings,
  type PlaySettings,
} from '../../storage'
import type { Digits } from '../../types'
import { AnnotationOverlay } from './AnnotationOverlay'
import {
  applyHintStep,
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

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function PlayGame() {
  const [state, dispatch] = useReducer(playReducer, undefined, loadInitialPlayState)
  const [band, setBand] = useState<DifficultyBand>('easy')
  const [settings, setSettings] = useState<PlaySettings>(() =>
    loadPlaySettings(store),
  )
  const [status, setStatus] = useState('')
  const [liveMessage, setLiveMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [cellSize, setCellSize] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [preview, setPreview] = useState<{
    from: { cell: number; digit: Digits }
    to: { x: number; y: number }
  } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const dragFrom = useRef<{ cell: number; digit: Digits } | null>(null)
  const suppressNextSelect = useRef(false)
  const elapsedRef = useRef(state.elapsedMs)
  const runningSinceRef = useRef<number | null>(null)
  const stateRef = useRef(state)
  const settingsRef = useRef(settings)
  const completeRef = useRef(false)
  const conflictCells = new Set(validateBoard(state.board).conflictCells)
  const complete = isBoardComplete(state.board)
  const timerActive = timerRunning && !complete

  useEffect(() => {
    stateRef.current = state
    settingsRef.current = settings
    completeRef.current = complete
    elapsedRef.current = state.elapsedMs
  }, [state, settings, complete])

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
    savePlaySettings(store, settings)
  }, [settings])

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

  const markPlayed = () => {
    if (!completeRef.current) setTimerRunning(true)
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
          dispatch({ type: 'undo' })
          return
        }
        if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault()
          markPlayed()
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
          dispatch({ type: 'clearActiveDigit' })
          return
        default:
          break
      }

      if (event.repeat) return

      if (event.key === 'Delete' && event.shiftKey) {
        event.preventDefault()
        markPlayed()
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
          dispatch({ type: 'refillNotes' })
          return
        case 'h':
        case 'H': {
          event.preventDefault()
          markPlayed()
          const step = applyHintStep(current.board)
          if (step === null) {
            setLiveMessage('No hint')
            return
          }
          dispatch({ type: 'applyHint', step })
          setLiveMessage('Hint applied')
          return
        }
        case 'r':
        case 'R':
          event.preventDefault()
          setTimerRunning(false)
          elapsedRef.current = 0
          dispatch({
            type: 'resetPuzzle',
            autoNotes: settingsRef.current.autoNotes,
          })
          setStatus('Reset')
          setLiveMessage('')
          return
        case '.':
          event.preventDefault()
          markPlayed()
          dispatch({
            type: 'setArrowStyle',
            style: current.arrowStyle === 'solid' ? 'dotted' : 'solid',
          })
          return
        case ',': {
          event.preventDefault()
          markPlayed()
          const order = ['a', 'b', 'c'] as const
          const idx = order.indexOf(current.arrowColour)
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
        markPlayed()
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
    markPlayed()
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
            setLiveMessage('')
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
              setTimerRunning(false)
              elapsedRef.current = 0
              dispatch({
                type: 'loadPuzzle',
                puzzle: result.puzzle,
                autoNotes: settings.autoNotes,
              })
              setStatus(`${result.band} puzzle`)
            }, 0)
          }}
        >
          New
        </button>
        <button
          type="button"
          className="play-reset"
          onClick={() => {
            setTimerRunning(false)
            elapsedRef.current = 0
            dispatch({ type: 'resetPuzzle', autoNotes: settings.autoNotes })
            setStatus('Reset')
            setLiveMessage('')
            rootRef.current?.focus()
          }}
        >
          Reset
        </button>
        {settings.showTimer ? (
          <span className="play-timer" aria-label="Elapsed time">
            {formatElapsed(state.elapsedMs)}
          </span>
        ) : null}
        <label className="play-setting">
          <input
            type="checkbox"
            checked={settings.showTimer}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                showTimer: event.target.checked,
              }))
            }
          />
          Timer
        </label>
        <label className="play-setting">
          <input
            type="checkbox"
            checked={settings.autoNotes}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                autoNotes: event.target.checked,
              }))
            }
          />
          Auto notes
        </label>
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
