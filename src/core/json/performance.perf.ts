import { describe, expect, it } from "vitest"
import { layoutMinimap } from "./minimap"
import { parseJson } from "./parse"
import { searchJson } from "./search"
import { flattenVisibleNodes, getJsonChildPosition, getJsonNodeAtPath } from "./traverse"
import type { JsonDocument, JsonPath } from "./types"

declare global {
  var gc: (() => void) | undefined
}

type WidePayload = {
  readonly text: string
  readonly path: JsonPath
  readonly nodes: number
}

type CorePerformanceResult = {
  readonly records: number
  readonly bytes: number
  readonly nodes: number
  readonly jsonParseMs: number
  readonly parseJsonMs: number
  readonly minimapMs: number
  readonly searchMs: number
  readonly flattenMs: number
  readonly coldPathMs: number
  readonly warmPathMs: number
  readonly positionMs: number
  readonly minimapSegments: number
  readonly visibleNodes: number
  readonly matches: number
}

type Measurement<T> = {
  readonly value: T
  readonly duration: number
}

function makePayload(records: number): WidePayload {
  const lastKey = `item-${records - 1}`
  const payload = Object.fromEntries(
    Array.from({ length: records }, (_, index) => [
      `item-${index}`,
      { id: index, value: index === records - 1 ? "target" : "other" },
    ]),
  )

  return {
    text: JSON.stringify(payload),
    path: [lastKey, "value"],
    nodes: 1 + records * 3,
  }
}

function measure<T>(action: () => T): Measurement<T> {
  const start = performance.now()
  const value = action()
  return { value, duration: performance.now() - start }
}

function parseDocument(text: string): JsonDocument {
  const result = parseJson(text)
  if (!result.ok) {
    throw new Error(result.message)
  }
  return result.document
}

function profilePayload(records: number): CorePerformanceResult {
  globalThis.gc?.()
  const payload = makePayload(records)
  const jsonParse = measure(() => JSON.parse(payload.text))
  const parsed = measure(() => parseDocument(payload.text))
  const root = parsed.value.root
  const coldPath = measure(() => getJsonNodeAtPath(root, payload.path))
  const targetContainer = getJsonNodeAtPath(root, payload.path.slice(0, -1))
  const target = coldPath.value

  if (targetContainer === null || target === null) {
    throw new Error("Could not resolve the performance fixture path.")
  }

  const minimap = measure(() => layoutMinimap(root))
  const search = measure(() => searchJson(root, "target"))
  const flatten = measure(() => flattenVisibleNodes(root, new Set([root, targetContainer])))
  const warmPath = measure(() => getJsonNodeAtPath(root, payload.path))
  const position = measure(() => getJsonChildPosition(root, targetContainer))

  expect(coldPath.value).toBe(target)
  expect(warmPath.value).toBe(target)
  expect(position.value).toBe(records - 1)

  return {
    records,
    bytes: new TextEncoder().encode(payload.text).byteLength,
    nodes: payload.nodes,
    jsonParseMs: jsonParse.duration,
    parseJsonMs: parsed.duration,
    minimapMs: minimap.duration,
    searchMs: search.duration,
    flattenMs: flatten.duration,
    coldPathMs: coldPath.duration,
    warmPathMs: warmPath.duration,
    positionMs: position.duration,
    minimapSegments: minimap.value.length,
    visibleNodes: flatten.value.length,
    matches: search.value.length,
  }
}

describe("core JSON performance", () => {
  it("profiles wide documents without changing engine behavior", () => {
    const results = [100_000, 250_000].map(profilePayload)

    console.info(`CORE_PERFORMANCE_BASELINE ${JSON.stringify(results)}`)
    expect(results).toHaveLength(2)
  })
})
