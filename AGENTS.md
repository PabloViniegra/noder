# Overview

Noder is a modern, visual JSON viewer/explorer designed to help you understand large structures - not just a formatter.

## Important Rules & Decisions

- **Philosophy**: **local-first and read-only** in the MVP. The JSON never leaves the browser.
- **Frontend**: `React 19` + `Vite` + `TypeScript`. `Pnpm` is mandatory.
- **Styles**: `Tailwind CSS 4`.
- **Components**: `Shadcn/ui` is the preferred choice for building *interfaces*, *layouts* and *pages*. If no use cases exist, custom components are built.
- **Animations**: `Motion`.
- **Global State**: `Zustand`.
- **Virtualization**: `Tanstack Virtual`.
- **Testing**: `Vitest` + `Playwright`.
- There is no backend, authorization and database.

---

- **Initial parsing**: `JSON.parse()`, maintaining an abstraction that allows the implementation to be changed.
- **JSON Engine**: independent of `React` and responsible for parsing, normalization, traversal, paths, statistics, and indexing.
- **Internal representation**: a normalized `JsonNode` tree, rather than binding the UI directly to the object returned by `JSON.parse()`.
- **Performance**: Render only visible/expanded nodes.
- **Web Workers**: an architecture designed to support them; implementation when performance metrics warrant it.
- **Architecture**: feature-based, with a `core/JSON` that is completely framework-agnostic.
- **Main view**: *Tree View*.
- **Navigation**: *Progressive Depth*, avoiding the initial display of enormous structures.
- **Focus Mode**: Isolate a specific branch of the JSON and explore it independently.
- **Breadcrumbs**: navigation like `root / users / 42 / profile`.
- **Search**: Quick search by keys/values, followed by advanced filters.
- **Command Palette**: `⌘K / Ctrl+K` as an important navigation element.
- **JSONPath**: Support for locating/copying paths and then executing queries.
- **Structural minimap**: a representation of the depth and size of the different branches, not just a simple minimap of the text.
- **Code View**: Traditional representation of JSON as a secondary view.
- **Statistics**: size, number of nodes, objects, arrays, maximum depth, etc.
- No overengineering: no full Clean Architecture, DDD, CQRS, etc. Clear separation between the `JSON engine → application state → UI`.