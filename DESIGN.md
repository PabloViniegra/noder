---
version: alpha
name: Noder
description: Dark-first JSON explorer. Linear density and a single lavender accent on graphite surfaces, with Apple Liquid Glass reserved for floating chrome.
colors:
  canvas: "#08090a"
  surface: "#0f1011"
  surface-raised: "#141516"
  surface-high: "#191a1b"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  primary: "#5e6ad2"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  on-primary: "#ffffff"
  inverse: "#f7f8f8"
  on-inverse: "#08090a"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  glass: "rgba(15, 16, 17, 0.62)"
  glass-border: "rgba(255, 255, 255, 0.12)"
  glass-highlight: "rgba(255, 255, 255, 0.18)"
  overlay: "rgba(0, 0, 0, 0.48)"
  selection: "#18182f"
  error: "#eb5757"
  success: "#27a644"
  warning: "#f2994a"
  json-key: "#c0caf5"
  json-string: "#9ece6a"
  json-number: "#7aa2f7"
  json-boolean: "#bb9af7"
  json-null: "#8a8f98"
  json-punctuation: "#8a8f98"
typography:
  title:
    fontFamily: Geist Variable
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.02em
  title-sm:
    fontFamily: Geist Variable
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: -0.015em
  body:
    fontFamily: Geist Variable
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.011em
  body-strong:
    fontFamily: Geist Variable
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.011em
  label:
    fontFamily: Geist Variable
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption:
    fontFamily: Geist Variable
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0.01em
  button:
    fontFamily: Geist Variable
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  code:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  kbd:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  row: 28px
  indent: 16px
components:
  button-primary:
    backgroundColor: "{colors.inverse}"
    textColor: "{colors.on-inverse}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 32px
  button-primary-hover:
    backgroundColor: "{colors.ink-muted}"
    textColor: "{colors.on-inverse}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 32px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 32px
  button-ghost:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 28px
  button-destructive:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.error}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 32px
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px
    height: 32px
  input-focus:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px
    height: 32px
  link:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary-hover}"
    typography: "{typography.body}"
  link-hover:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  link-focus:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary-hover}"
    typography: "{typography.body}"
  tree-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
    height: "{spacing.row}"
    padding: 4px
  tree-row-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
    height: "{spacing.row}"
  tree-row-selected:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
    height: "{spacing.row}"
  tree-key:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.json-key}"
    typography: "{typography.code}"
    height: "{spacing.row}"
  tree-string:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.json-string}"
    typography: "{typography.code}"
    height: "{spacing.row}"
  tree-number:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.json-number}"
    typography: "{typography.code}"
    height: "{spacing.row}"
  tree-boolean:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.json-boolean}"
    typography: "{typography.code}"
    height: "{spacing.row}"
  tree-null:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.json-null}"
    typography: "{typography.code}"
    height: "{spacing.row}"
  tree-punctuation:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.json-punctuation}"
    typography: "{typography.code}"
    height: "{spacing.row}"
  tree-disclosure:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    typography: "{typography.code}"
    height: "{spacing.row}"
  command-backdrop:
    backgroundColor: "{colors.overlay}"
    textColor: "{colors.ink}"
  command-palette:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 8px
    width: 640px
  dialog:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 16px
  popover:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 8px
  tooltip:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-subtle}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-success:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-warning:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px
  separator:
    backgroundColor: "{colors.hairline}"
    height: 1px
  separator-strong:
    backgroundColor: "{colors.hairline-strong}"
    height: 1px
  focus-ring:
    backgroundColor: "{colors.primary-focus}"
    rounded: "{rounded.md}"
  glass-stroke:
    backgroundColor: "{colors.glass-border}"
    height: 1px
  glass-sheen:
    backgroundColor: "{colors.glass-highlight}"
    height: 1px
  kbd:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.kbd}"
    rounded: "{rounded.sm}"
    padding: 4px
    height: 20px
  chrome:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    height: 44px
  breadcrumb:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink-subtle}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: 28px
---

## Overview

Noder is a local-first JSON explorer. People stare at structure for a long time, so the product is a dark, dense tool — not a marketing canvas. Graphite surfaces, hairline structure, and one lavender-blue accent come from Linear-style product craft. Apple Liquid Glass is the floating layer for chrome, command palette, dialogs, and menus. The JSON tree, code view, and minimap stay in the content layer so the document remains the protagonist.

The register is quiet, precise, and premium. Keyboard-first. No decorative color, no atmospheric gradients, no glass wallpaper.

## Colors

Paint the shell with `{colors.canvas}` and lift in-flow panels through `{colors.surface}` → `{colors.surface-raised}` → `{colors.surface-high}`. Separate those surfaces with `{colors.hairline}`, not shadow. `{colors.ink}` is the only body text on canvas; `{colors.ink-subtle}` is metadata, placeholders, and idle breadcrumbs.

`{colors.primary}` is punctuation: focus rings and selected-state wash. JSONPath and in-tree links use `{colors.primary-hover}` so they meet AA on `{colors.canvas}`. Selected tree rows use `{colors.selection}`, a dark indigo wash, not a primary fill. Do not fill cards, sidebars, or the canvas with `{colors.primary}`. The one high-emphasis control inverts to `{colors.inverse}` so it is the brightest object on screen.

JSON syntax uses its own family so data never impersonates chrome. Keys `{colors.json-key}`, strings `{colors.json-string}`, numbers `{colors.json-number}`, booleans `{colors.json-boolean}`, null `{colors.json-null}`, punctuation `{colors.json-punctuation}`. Do not reuse `{colors.primary}` for keys or numbers.

Glass fills use `{colors.glass}` with `{colors.glass-border}` and a top-edge `{colors.glass-highlight}`. `{colors.overlay}` dims the tree only under modal chrome.

## Typography

UI copy is Geist Variable. JSON, file paths, JSONPath, and keyboard glyphs are Geist Mono. Do not introduce a third family.

The working size is `{typography.body}` / `{typography.code}` at 13px / 12px. Tree rows, search, command results, and inspector fields all sit on that density. `{typography.title}` is for empty states and the product name, not for in-app section headers. Tighten tracking only on titles. Captions and kbd stay at or above 11px.

Tree keys use `{typography.code}` even when they are identifiers, so path, key, and value share one rhythm.

## Layout

The product is a full-viewport app shell. Content is edge-to-edge under a floating chrome bar (`{components.chrome}`). Do not wrap the tree in a max-width reading column.

Use a 4px grid. Default control height is 32px; tree rows are `{spacing.row}` (28px); each nested level indents `{spacing.indent}` (16px). Group related chrome with `{spacing.xs}` gaps; separate inspector from tree with `{spacing.md}`.

Progressive depth: render the root collapsed enough to scan, not fully expanded. Focus mode replaces the tree root with the isolated branch and keeps the path in breadcrumbs. Command palette (`⌘K` / `Ctrl+K`) is a centered overlay at `{components.command-palette}` width 640px, not a full-screen takeover. Code view is a secondary pane beside or in place of the tree, never a nested glass card.

Breadcrumbs read `root / users / 42 / profile` in `{typography.label}`, with the current segment in `{colors.ink}` and ancestors in `{colors.ink-subtle}`.

## Elevation & Depth

Two layers only.

**Content layer** (tree, code, minimap, statistics): opaque tonal steps and 1px `{colors.hairline}` separators. No drop shadow. No backdrop blur. Hover is `{colors.surface-raised}`; selection is `{colors.selection}`. Disclosure chevrons use `{colors.ink-subtle}` until hover.

**Chrome layer** (top bar, command palette, dialog, dropdown, popover): Regular Liquid Glass. Approximate lensing on the web with `backdrop-filter: blur(20px) saturate(1.6)`, fill `{colors.glass}`, border `{colors.glass-border}`, and an inset top highlight `{colors.glass-highlight}`. Treat SVG/displacement refraction as Chromium progressive enhancement; Safari and reduced-transparency get the same frost without warping.

Glass is Regular everywhere in Noder. Do not mix in Clear. Larger glass (palette, dialog) may use a slightly deeper dim and `{rounded.xl}`; compact glass (menus) stays `{rounded.lg}`. Controls that rest on glass use fills, vibrancy, and hairlines — never a second glass stack.

On scroll under the top bar, apply a short edge fade/dim so labels stay readable. `{prefers-reduced-transparency}` replaces glass with opaque `{colors.surface-high}` plus `{colors.hairline-strong}`. `{prefers-reduced-motion}` disables morphing, elastic scale, and highlight travel; opacity and color still change.

Pressed in-flow controls scale to `0.97`. Glass morphs from the triggering control into the palette or menu instead of fading in from 0.

## Shapes

Interactive controls use `{rounded.sm}` (6px). Inputs use `{rounded.md}`. In-flow content cards and the minimap use `{rounded.lg}`. Glass chrome, command palette, and dialogs use `{rounded.xl}` so the floating layer reads concentric and softer than the tree. Pills and badges use `{rounded.full}`. Tree rows keep `{rounded.sm}` and never become pills.

Do not mix a 6px button beside a 16px in-flow card in the same control cluster. Keep a cluster on one radius step.

## Components

Build from shadcn/ui primitives (Button, Input, Command, Dialog, DropdownMenu, Popover, Tooltip, Breadcrumb, Badge, Kbd, Tabs, ScrollArea, Separator). Style them to this contract; do not keep Nova light neutrals.

**Buttons.** One `{components.button-primary}` inverted fill per view. Secondary is transparent with `{colors.hairline}` border. Ghost is for icon and chrome actions. Destructive is text `{colors.error}` on transparent, never a red fill in the chrome layer. Height 32px in forms, 28px in chrome.

**Input and search.** `{components.input}` sits on `{colors.canvas}` with `{colors.hairline}`. Focus uses a 2px ring in `{colors.primary-focus}` at 40% opacity, not a glow. Placeholder is `{colors.ink-subtle}`.

**Tree row.** `{components.tree-row}` is the atomic line of the product. Monospace. Type-colored values. Disclosure chevron in `{colors.ink-subtle}` until hover. Do not zebra-stripe. Do not put glass on rows.

**Command palette.** `{components.command-palette}` is Regular glass over `{colors.overlay}`. Input is borderless inside the glass. Results are tree-row density. Shortcut hints use `{components.kbd}`.

**Dialog and popover.** Same Regular glass as the palette. Dialogs dim the tree; popovers and dropdowns do not.

**Tooltip.** Opaque `{colors.surface-high}`, not glass. Delay short; never block tree hover.

**Badge and kbd.** Hairline or `{colors.surface-raised}` fills, `{typography.caption}` / `{typography.kbd}`. Status color only in the badge label, not as a large fill.

**Chrome bar.** Floating, inset from the viewport edge by `{spacing.xs}`, Regular glass, `{rounded.xl}`. Holds breadcrumbs, view switch, and the command trigger.

## Do's and Don'ts

- Do keep the tree, code view, and minimap in the opaque content layer.
- Do use `{colors.primary}` only for focus, selection tint, and links.
- Do use Geist Mono for JSON, paths, and shortcuts.
- Do honor reduced transparency with an opaque `{colors.surface-high}` fallback.
- Do honor reduced motion by dropping morph, lens travel, and press-scale.
- Don't put Liquid Glass on lists, tree rows, code panes, or statistics.
- Don't stack glass on glass.
- Don't mix Regular and Clear glass.
- Don't use `#000000` as canvas.
- Don't fill surfaces with `{colors.primary}`.
- Don't introduce a second chromatic accent in chrome.
- Don't use drop shadows to separate in-flow panels.
- Don't ship the light Nova theme as the product look.
