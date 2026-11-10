# Sudoku

Personal offline-first Sudoku application (React + TypeScript + Vite).

Single-player, no accounts, no network requirements, no ads or analytics.

Linux desktop packaging uses [Tauri 2](https://v2.tauri.app/).

## Prerequisites

- Node.js 22+ and [pnpm](https://pnpm.io/)
- For desktop: Rust via [rustup](https://rustup.rs/), and Tauri’s Linux packages
  (e.g. on Ubuntu: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`,
  `librsvg2-dev`, `libdbus-1-dev`, `pkg-config`, `build-essential`).
  See [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux).

## Setup

```bash
pnpm install
```

## Web development

```bash
pnpm dev
```

Open the URL Vite prints (default `http://localhost:5173`).

Session progress is stored in the browser `localStorage` key `sudoku.gameSession`.

## Desktop (Tauri / Linux)

```bash
# Dev window (starts Vite, then opens the webview)
pnpm tauri:dev

# Production bundle (deb / AppImage under src-tauri/target/release/bundle/)
pnpm tauri:build
```

The desktop app loads the same Vite frontend. `localStorage` works inside the
webview; saves are per webview profile (not shared with a separate browser
profile unless you copy them).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` / `pnpm web:dev` | Vite dev server |
| `pnpm build` / `pnpm web:build` | Typecheck + production build |
| `pnpm preview` | Preview the production build |
| `pnpm test` / `pnpm web:test` | Run Vitest once |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm lint` / `pnpm web:lint` | ESLint |
| `pnpm tauri:dev` | Tauri desktop dev |
| `pnpm tauri:build` | Tauri desktop release bundle |

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
src-tauri/      Tauri 2 desktop shell (Rust)
```

## Licence

MIT — see [LICENSE](LICENSE).
