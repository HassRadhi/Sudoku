import { useEffect, useReducer, useRef } from 'react'
import { Board } from '../../components/Board'
import { isDigits, validateBoard } from '../../engine'
import {
  SAMPLE_GIVENS,
  createInitialPlayState,
  playReducer,
} from './playLogic'
import './PlayGame.css'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

function isMod(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey
}

export function PlayGame() {
  const [state, dispatch] = useReducer(playReducer, undefined, createInitialPlayState)
  const rootRef = useRef<HTMLDivElement>(null)
  const conflictCells = new Set(validateBoard(state.board).conflictCells)

  useEffect(() => {
    rootRef.current?.focus()

    // Board-first app: keep keyboard play working even if focus leaves the grid.
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

      // Edits/toggles: ignore key-repeat so note XOR and mode flip don't oscillate.
      if (event.repeat) return

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
  }, [dispatch])

  return (
    <div
      ref={rootRef}
      className="play-game"
      tabIndex={0}
    >
      <span className="visually-hidden" aria-live="polite">
        {state.noteMode ? 'Note mode' : 'Digit mode'}
      </span>
      <Board
        board={state.board}
        notes={state.notes}
        givens={SAMPLE_GIVENS}
        selected={state.selected}
        conflictCells={conflictCells}
        onSelect={(index) => {
          dispatch({ type: 'select', index })
          rootRef.current?.focus()
        }}
      />
    </div>
  )
}
