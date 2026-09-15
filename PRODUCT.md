# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Technical people who need to understand JSON structure: developers, backend engineers, support, and data folks. No single persona. They open Noder when a payload, fixture, dump, or export is too large or nested to grasp as formatted text, and they stay in the structure for a long time.

## Product Purpose

Noder is a visual JSON explorer. Success is that someone can locate, isolate, and understand a branch of a large document without pretty-printing the whole thing or sending it anywhere.

## Positioning

Noder is for understanding large structures, not for formatting them. Tree view, progressive depth, focus mode, search, JSONPath, a structural minimap, and statistics are the product. Code view (pretty-print) is secondary.

## Operating Context

A local-first browser SPA. JSON is pasted or opened from a file on the user's machine and never uploaded. Sessions are long, keyboard-driven inspections of one document at a time. There is no account, server, or shared workspace.

## Capabilities and Constraints

Confirmed for MVP:

- Read-only. JSON is not edited.
- Local-first: the document never leaves the browser. No backend, authorization, or database.
- Input is in-client only: paste and/or file. Remote URL fetch is out of scope unless later decided.
- Main view is Tree View with progressive depth (do not fully expand huge documents on load).
- Focus mode isolates a branch; breadcrumbs show the path (`root / users / 42 / profile`).
- Quick search by keys/values, then advanced filters.
- Command palette (`⌘K` / `Ctrl+K`) is a primary navigation surface.
- JSONPath for locating/copying paths and then running queries.
- Structural minimap of depth and branch size, not a text scrollbar clone.
- Code view as a secondary representation.
- Statistics: size, node counts, objects, arrays, max depth.
- JSON engine is framework-agnostic (`JSON.parse()` behind an abstraction, normalized `JsonNode` tree). UI renders only visible/expanded nodes. Web Workers are deferred until metrics warrant them.

Undecided: hosting/deploy target, accessibility standard, when workers ship, and the exact advanced-filter set.

## Brand Commitments

Product name is Noder. No other binding identity, voice, or asset commitments.

## Evidence on Hand

Product decisions live in `AGENTS.md`. The running app is a placeholder shell (`Noder` / `JSON explorer`). `DESIGN.md` records an incumbent visual system; it is not product evidence. No customer testimonials, benchmarks, datasets, or marketing claims exist — do not fabricate them.

## Product Principles

1. Structure over formatting: exploration features outrank pretty-print.
2. The document never leaves the machine.
3. Large JSON is navigated, not dumped: progressive depth and focus over full expansion.
4. Keyboard-first: palette, paths, and shortcuts are how people move, not decoration.
5. Read-only until a later, explicit decision to edit.
