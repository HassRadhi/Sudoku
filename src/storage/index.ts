/** Local persistence adapters (browser storage first). Must not contain Sudoku rules. */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface KeyValueStore {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

/** Browser localStorage adapter. Safe no-op when storage is unavailable. */
export function createLocalStorageStore(
  storage: Storage | undefined = typeof localStorage === 'undefined'
    ? undefined
    : localStorage,
): KeyValueStore {
  return {
    get(key) {
      if (!storage) return null
      try {
        return storage.getItem(key)
      } catch {
        return null
      }
    },
    set(key, value) {
      if (!storage) return
      try {
        storage.setItem(key, value)
      } catch {
        // Quota or private-mode failures: ignore for now.
      }
    },
    remove(key) {
      if (!storage) return
      try {
        storage.removeItem(key)
      } catch {
        // Ignore.
      }
    },
  }
}

export {
  GAME_SESSION_KEY,
  GAME_SESSION_VERSION,
  loadGameSession,
  parseGameSession,
  saveGameSession,
  serializeGameSession,
} from './gameSession'
export type { GameSessionV1 } from './gameSession'
