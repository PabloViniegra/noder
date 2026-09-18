# Noder

Visual JSON viewer/explorer. Local-first and read-only: JSON never leaves the browser.

## Stack

React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui, Motion, Zustand, TanStack Virtual. pnpm is required.

## Scripts

```sh
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm test:perf
pnpm test:perf:core
```

## Layout

```
src/core/json   framework-agnostic JSON engine
src/features    UI features (tree view, search, …)
src/stores      Zustand stores
src/components  shared and shadcn UI
src/lib         utilities
```
