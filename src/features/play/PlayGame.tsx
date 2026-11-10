import { useEffect, useReducer, useRef } from 'react'
import { Board } from '../../components/Board'
import { isDigits, type Board as BoardModel } from '../../engine'
import type { Digits } from '../../types'
import {
  buildGivens,
  clearCell,
  createEmptyNotes,
  loadSampleBoard,
  moveSelection,
  placeDigit,
  toggleNote,
  type NotesGrid,
} from './playLogic'
import './PlayGame.css'

const GIVENS = buildGivens(loadSampleBoard())

type PlayState = {
  board: BoardModel
  notes: NotesGrid
  selected: number
  noteMode: boolean
}

type PlayAction =
  | { type: 'select'; index: number }
  | { type: 'move'; dRow: number; dCol: number }
  | { type: 'enterDigit'; digit: Digits }
  | { type: 'clear' }
  | { type: 'toggleNoteMode' }

function createInitialState(): PlayState {
  return {
    board: loadSampleBoard(),
    notes: createEmptyNotes(),
    selected: 0,
    noteMode: false,
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
    case 'enterDigit': {
      if (state.noteMode) {
        return {
          ...state,
          notes: toggleNote(
            state.board,
            state.notes,
            GIVENS,
            state.selected,
            action.digit,
          ),
        }
      }
      const next = placeDigit(
        state.board,
        state.notes,
        GIVENS,
        state.selected,
        action.digit,
      )
      return { ...state, board: next.board, notes: next.notes }
    }
    case 'clear': {
      const next = clearCell(state.board, state.notes, GIVENS, state.selected)
      return { ...state, board: next.board, notes: next.notes }
    }
    case 'toggleNoteMode':
      return { ...state, noteMode: !state.noteMode }
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
