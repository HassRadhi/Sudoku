import { useEffect, useReducer, useRef } from 'react'
import { Board } from '../../components/Board'
import { isDigits, type Board as BoardModel } from '../../engine'
import type { Digits } from '../../types'
import {
  buildGivens,
  clearDigit,
  loadSampleBoard,
  moveSelection,
  setDigit,
} from './playLogic'
import './PlayGame.css'

const GIVENS = buildGivens(loadSampleBoard())

type PlayState = {
  board: BoardModel
  selected: number
}

type PlayAction =
  | { type: 'select'; index: number }
  | { type: 'move'; dRow: number; dCol: number }
  | { type: 'setDigit'; digit: Digits }
  | { type: 'clear' }

function createInitialState(): PlayState {
  return {
    board: loadSampleBoard(),
    selected: 0,
  }
}

function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case 'select':
      return { ...state, selected: action.index }
    case 'move':
      return {
        ...state,
        selected: moveSelection(state.selected, action.dRow, action.dCol),
      }
    case 'setDigit':
      return {
        ...state,
        board: setDigit(state.board, GIVENS, state.selected, action.digit),
      }
    case 'clear':
      return {
        ...state,
        board: clearDigit(state.board, GIVENS, state.selected),
      }
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

export function PlayGame() {
  const [state, dispatch] = useReducer(playReducer, undefined, createInitialState)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    rootRef.current?.focus()

    // Board-first app: keep keyboard play working even if focus leaves the grid.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return

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
        case 'Backspace':
        case 'Delete':
        case '0':
          event.preventDefault()
          dispatch({ type: 'clear' })
          return
        default:
          break
      }

      if (event.key >= '1' && event.key <= '9') {
        const digit = Number(event.key)
        if (!isDigits(digit)) return
        event.preventDefault()
        dispatch({ type: 'setDigit', digit })
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
      <Board
        board={state.board}
        givens={GIVENS}
        selected={state.selected}
        onSelect={(index) => {
          dispatch({ type: 'select', index })
          rootRef.current?.focus()
        }}
      />
    </div>
  )
}
