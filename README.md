<div align="center">

<img src="public/logo.svg" alt="Noder logo" width="368" />

**A visual JSON explorer for understanding large structures — not just formatting them.**

Local-first and read-only. Your JSON never leaves the browser.

[![CI](https://github.com/PabloViniegra/noder/actions/workflows/ci.yml/badge.svg)](https://github.com/PabloViniegra/noder/actions/workflows/ci.yml)
![Local-first](https://img.shields.io/badge/Local--first-100%25_in_browser-5E6AD2?logo=shield&logoColor=white)
![Read-only](https://img.shields.io/badge/Read--only-no_data_leaves-828FFF)

<br />

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-828FFF)
![Zustand](https://img.shields.io/badge/Zustand-4B4B52)
![TanStack Virtual](https://img.shields.io/badge/TanStack_Virtual-FF6154?logo=tanstack&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3068B7?logo=zod&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)

</div>

## Contents

- [About](#about)
- [Features](#features)
- [Privacy](#privacy)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Testing](#testing)
- [Performance](#performance)

## About

Noder is a modern, visual JSON viewer/explorer designed to help you understand
large structures. When a payload, fixture, dump, or export is too large or too
nested to grasp as formatted text, Noder lets you locate, isolate, and
understand a branch of the document — without pretty-printing the whole thing
and without sending it anywhere.

It is not a formatter with syntax highlighting. The document is parsed into a
normalized tree and rendered so you can explore it: collapse what you don't
need, focus on the branch you do, search across keys and values, and navigate
with a structural minimap that shows depth and branch size.

## Features

- **Tree View** — the main view. Renders only visible/expanded nodes, so even
  huge documents stay fast.
- **Progressive Depth** — enormous structures are never fully expanded on
  load; you drill down at your own pace.
- **Focus Mode** — isolate a specific branch and explore it independently,
  with breadcrumbs like `root / users / 42 / profile` to show where you are.
- **Quick Search** — search by keys and values, with advanced filters.
- **JSONPath** — copy node paths and run queries to locate nodes precisely.
- **Structural Minimap** — a representation of depth and branch size across
  the document, not a text scrollbar clone.
- **Code View** — the traditional pretty-printed JSON as a secondary view.
- **Statistics** — size, node counts, objects, arrays, maximum depth, and more.
- **Command Palette** — `⌘K` / `Ctrl+K` as a primary navigation surface.
- **Web Workers** — heavy parsing and search run off the main thread.

## Privacy

Noder is **local-first**: JSON is pasted or opened from a file on your machine
and is never uploaded. There is no backend, no account, and no database.
Everything happens in your browser.

## Getting started

Requirements: Node.js and [pnpm](https://pnpm.io) (package manager is pinned
via `packageManager`).

```sh
pnpm install
pnpm dev
```

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `pnpm dev`            | Start the development server                 |
| `pnpm build`          | Type-check and build for production          |
| `pnpm lint`           | Lint with oxlint                             |
| `pnpm test`           | Run unit tests with Vitest                   |
| `pnpm test:watch`     | Run unit tests in watch mode                 |
| `pnpm test:e2e`       | Run Playwright end-to-end tests              |
| `pnpm test:perf`      | Run Playwright performance tests             |
| `pnpm test:perf:core` | Run core engine performance benchmarks       |
| `pnpm preview`        | Preview the production build                 |

## Architecture

The project is feature-based, with a clear separation between the JSON engine,
application state, and the UI:

```
src/
├── core/json       Framework-agnostic JSON engine (parsing, traversal,
│                   paths, search, summarization, minimap, workers)
├── features/       UI features
│   ├── document/   Document store (load/clear lifecycle)
│   ├── explorer/   Tree view, code view, command palette,
│   │               JSONPath, structural minimap, app shell
│   └── ingest/     Input: paste, drag & drop, file open
├── components/ui   Shared and shadcn/ui primitives
└── lib             Utilities
```

Key design decisions:

- **Normalized tree**: the UI never binds directly to the object returned by
  `JSON.parse()`. The engine produces a normalized `JsonNode` tree behind a
  parsing abstraction.
- **Virtualization**: only visible/expanded nodes are rendered.
- **Workers-ready**: the engine is designed to support Web Workers; heavy work
  is already running in one.
- **No overengineering**: no backend, no authorization, no database — just a
  clean separation of engine → state → UI.

## Testing

- **Unit tests** (`Vitest`) cover the JSON engine and stores.
- **End-to-end tests** (`Playwright`) cover the critical user flows.
- **Performance tests** (Playwright + Vitest benchmarks) guard the engine's
  speed on large documents. See [PERFORMANCE.md](PERFORMANCE.md).

## Performance

Rendering large JSON is a performance problem first. Noder keeps the main
thread free with Web Workers, virtualizes the tree, and avoids expanding
enormous structures up front. Benchmarks and thresholds live in
[PERFORMANCE.md](PERFORMANCE.md).
