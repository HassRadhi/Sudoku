# Agent development rules — Sudoku

Personal, offline-first Sudoku app. Not a commercial platform.

## Product constraints

- Offline-first, single-player only.
- No accounts, backend, networking, ads, analytics, tracking, or subscriptions.
- Minimal dependencies. Easy to maintain.
- Highly customisable gameplay — add settings when needed, not frameworks.

## Stack (current)

- React + TypeScript + Vite
- Vitest
- ESLint
- pnpm
- Strict TypeScript
- Plain CSS
- React `useReducer` for game state (no Redux/Zustand)
- Browser `localStorage` via `src/storage` (no cloud)

Tauri / Rust desktop packaging comes later, after the browser app works. Do not add it until requested.

Python is not part of this application.

## Folder structure

Keep this layout. Do not introduce separate `app/`, `ui/`, or `persistence/` layers without a concrete reason.

| Area | Path | Rules |
| --- | --- | --- |
| Components | `src/components/` | Reusable UI pieces. |
| Engine | `src/engine/` | Pure Sudoku logic. No React, DOM, or storage imports. |
| Features | `src/features/` | Application feature UI and wiring. |
| Hooks | `src/hooks/` | Reusable React hooks. |
| Storage | `src/storage/` | Local persistence only. No Sudoku rules. |
| Styles | `src/styles/` | Global CSS. |
| Types | `src/types/` | Shared TypeScript types. |

## Engine roadmap (do not implement until tasked)

The engine should eventually support:

1. Board representation and validation
2. Candidate calculation
3. Logical solving techniques
4. Difficulty classification based on the hardest technique required
5. Puzzle generation with uniqueness verification

Valid puzzles alone are not enough. Difficulty must reflect actual solving complexity. Do not prioritise generation before the solving/technique stack exists.

## Annotations vs game state

Visual annotations (highlights, candidate arrows, overlays) must stay separate from Sudoku game state. They must not leak into or corrupt the engine model.

## Working style

1. Build incrementally. One feature per task unless asked otherwise.
2. Before substantial work: inspect the project, propose the change, list files, note architectural impact, wait for approval when the user asks for it.
3. After implementation: summarise changes, list files, run relevant tests, note outstanding issues.
4. Do not overengineer. Simplicity and maintainability beat clever abstractions.
5. No new dependency if the standard library, existing code, or an already-installed package covers it.
6. Strict TypeScript at boundaries. No `any`.
7. Unit-test important engine and storage logic with Vitest.
8. Keep the app fully functional offline. Do not introduce networking.

## Out of scope unless explicitly requested

Accounts, sync, multiplayer, ads, analytics, backend services, Tauri/Rust packaging, Python tooling for the app itself.
