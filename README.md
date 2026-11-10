# Sudoku

Personal offline-first Sudoku application (React + TypeScript + Vite).

Single-player, no accounts, no network requirements, no ads or analytics.

Desktop packaging with Tauri will be added later, after the browser app is working.

## Prerequisites

- Node.js 22+ and [pnpm](https://pnpm.io/)

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Typecheck + production build |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Run Vitest once |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm lint` | ESLint |

## Project layout

```text
src/
  components/   Reusable UI
  engine/       Pure Sudoku logic (no React)
  features/     Application features
  hooks/        React hooks
  storage/      Local persistence
  styles/       Global CSS
  types/        Shared types
```

## Licence

MIT — see [LICENSE](LICENSE).
