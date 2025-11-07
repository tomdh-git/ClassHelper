# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This is a Create React App (CRA) project with an optional Electron wrapper for a desktop build. The UI is a single-page React app (`src/App.js`) that queries a remote GraphQL API to generate class schedules and displays preferences (campus, term, free time window, dark mode). Electron is used for local desktop packaging and loads the CRA dev server in development.

Key entry points:
- Web: `src/index.js` bootstraps `<App />` with React StrictMode.
- App UI: `src/App.js` holds most state and UI, including GraphQL calls.
- Electron main: `public/electron.js` creates a `BrowserWindow` and loads `http://localhost:3000` in dev.
- Tests setup: `src/setupTests.js` configures Testing Library + jest-dom.

Electron packaging is configured via `package.json > build` (electron-builder). Windows target is `nsis`. The packaged app includes the CRA production build (`build/**/*`) and `public/electron.js`.

## Commands

Install dependencies (uses `package-lock.json`):
- npm ci

Web development server (CRA on http://localhost:3000):
- npm start

Electron development (runs CRA dev server and launches Electron):
- npm run electron-start

Build production web assets (outputs to `build/`):
- npm run build

Package the desktop app (build React, then create installers in `dist/`):
- npm run build && npm run dist

Run tests (Jest via react-scripts):
- All tests (watch mode): npm test
- Single test file: npm test -- src/App.test.js
- By name pattern: npm test -- -t "renders learn react link"
- Run once (CI mode): npm test -- --watchAll=false

Linting:
- CRA surfaces ESLint issues in the dev server and during `npm run build`.
- There is no standalone lint script in `package.json`. If a manual run is needed, add ESLint and run `npx eslint src`.

## High-level architecture and data flow

- State and routing-in-component: `src/App.js` manages a simple internal "page" state (`planner`, `search`, `prefs`) instead of using a router. It also keeps user preferences (campus, term, optimizeFreeTime, darkMode, preferred time range) and the generated schedules, handling loading and error states.
- External services: The app talks to a hosted API (`https://courseapi-production-3751.up.railway.app`).
  - Liveness check: GET `/alive` before querying.
  - Schedule generation: POST `/graphql` with a dynamically constructed GraphQL query containing selected courses, campus, term, optimization flags, and preferred time window.
- UI composition: The left pane collects courses and triggers schedule generation. Results render as a vertical, snap-style list you can page through. The right pane is a placeholder for a schedule visualization.
- Preferences: Sliders and toggles (via `react-range` and custom switches) control optimization/time range and theme.
- Testing: Jest + Testing Library via CRA’s defaults (`src/setupTests.js`). The template test in `src/App.test.js` references the CRA starter text and may require updating to reflect the current UI.
- Electron integration: `public/electron.js` creates the main window and loads the CRA dev server URL in development. For packaging, electron-builder uses `package.json > build` to include `build/**/*` and the Electron main file. Ensure `npm run build` completes before `npm run dist` so assets are available.

## Notable configuration

- `package.json`
  - scripts: `start`, `test`, `build`, `electron-start`, `dist`
  - electron-builder `build` section: `{ appId, files, win.target = "nsis" }`
  - `eslintConfig` extends `react-app` and `react-app/jest`
- Test setup: `src/setupTests.js` imports `@testing-library/jest-dom`
