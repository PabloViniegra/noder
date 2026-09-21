import type {
  JsonDocument,
  JsonNode,
  JsonValue,
  JsonObject,
  JsonArray,
  JsonObjectNode,
  JsonArrayNode,
  JsonPath,
  JsonPathSegment,
  JsonStats,
  JsonSearchIndexEntry,
} from "./types"
import { isJsonContainerNode } from "./traverse"

export type JsonParseOk = {
  readonly ok: true
  readonly document: JsonDocument
}

export type JsonParseErr = {
  readonly ok: false
  readonly message: string
}

export type JsonParseResult = JsonParseOk | JsonParseErr

export function parseJson(text: string): JsonParseResult {
  return parseJsonInternal(text, null)
}

export type JsonParseWithSearchIndexResult =
  | (JsonParseOk & { readonly searchIndex: readonly JsonSearchIndexEntry[] })
  | JsonParseErr

export function parseJsonWithSearchIndex(text: string): JsonParseWithSearchIndexResult {
  const searchIndex: JsonSearchIndexEntry[] = []
  const result = parseJsonInternal(text, searchIndex)
  if (!result.ok) {
    return result
  }

  return { ...result, searchIndex }
}

function parseJsonInternal(
  text: string,
  searchIndex: JsonSearchIndexEntry[] | null,
): JsonParseResult {
  let value: JsonValue

  try {
    value = JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, message: error.message }
    }
    return { ok: false, message: "Could not parse JSON." }
  }

  const stats: JsonStatsAccumulator = {
    bytes: new TextEncoder().encode(text).byteLength,
    nodes: 0,
    objects: 0,
    arrays: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    maxDepth: 0,
  }

  return {
    ok: true,
    document: {
      root: normalizeNode(value, null, [], 0, stats, searchIndex),
      stats,
    },
  }
}

type JsonStatsAccumulator = {
  -readonly [Key in keyof JsonStats]: JsonStats[Key]
}

// Iterative because JSON.parse accepts nesting depths that exceed the call-stack limit (~10k).
type NormalizeFrame = {
  readonly node: JsonObjectNode | JsonArrayNode
  readonly entries: readonly (readonly [JsonPathSegment, JsonValue])[]
  next: number
  readonly collected: JsonNode[]
}

function normalizeNode(
  value: JsonValue,
  key: JsonPathSegment | null,
  path: JsonPath,
  depth: number,
  stats: JsonStatsAccumulator,
  searchIndex: JsonSearchIndexEntry[] | null = null,
): JsonNode {
  const root = createNode(value, key, path, depth, stats, searchIndex)
  if (root === null) {
    throw new Error("Unsupported JSON value")
  }
  if (!isJsonContainerNode(root) || !isJsonContainerValue(value)) {
    return root
  }

  const stack: NormalizeFrame[] = [
    { node: root, entries: containerEntries(value), next: 0, collected: [] },
  ]

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (frame === undefined) {
      break
    }

    if (frame.next >= frame.entries.length) {
      stack.pop()
      const completed = Object.assign(frame.node, { children: frame.collected })
      const parent = stack[stack.length - 1]
      if (parent === undefined) {
        break
      }
      parent.collected.push(completed)
      parent.next += 1
      continue
    }

    const entry = frame.entries[frame.next]
    if (entry === undefined) {
      frame.next += 1
      continue
    }
    const [childKey, childValue] = entry
    const child = createNode(
      childValue,
      childKey,
      [...frame.node.path, childKey],
      frame.node.depth + 1,
      stats,
      searchIndex,
    )
    if (child === null) {
      throw new Error("Unsupported JSON value")
    }
    if (isJsonContainerValue(childValue)) {
      // SAFETY: createNode maps container values to container nodes one-to-one.
      const containerChild = child as JsonObjectNode | JsonArrayNode
      stack.push({
        node: containerChild,
        entries: containerEntries(childValue),
        next: 0,
        collected: [],
      })
      continue
    }
    frame.collected.push(child)
    frame.next += 1
  }

  return root
}

function createNode(
  value: JsonValue,
  key: JsonPathSegment | null,
  path: JsonPath,
  depth: number,
  stats: JsonStatsAccumulator,
  searchIndex: JsonSearchIndexEntry[] | null,
): JsonNode | null {
  stats.nodes += 1
  stats.maxDepth = Math.max(stats.maxDepth, depth)

  if (searchIndex !== null) {
    searchIndex.push({
      key: isStringPathSegment(key) ? key : null,
      path,
      value: scalarSearchValue(value),
    })
  }

  if (value === null) {
    stats.nulls += 1
    return { kind: "null", key, path, depth, value: null }
  }

  if (Array.isArray(value)) {
    stats.arrays += 1
    return { kind: "array", key, path, depth, children: [] }
  }

  if (isJsonObject(value)) {
    stats.objects += 1
    return { kind: "object", key, path, depth, children: [] }
  }

  if (isJsonString(value)) {
    stats.strings += 1
    return { kind: "string", key, path, depth, value }
  }

  if (isJsonNumber(value)) {
    stats.numbers += 1
    return { kind: "number", key, path, depth, value }
  }

  if (isJsonBoolean(value)) {
    stats.booleans += 1
    return { kind: "boolean", key, path, depth, value }
  }

  return null
}

function containerEntries(value: JsonObject | JsonArray): readonly (readonly [JsonPathSegment, JsonValue])[] {
  return Array.isArray(value)
    ? value.map((entry, index) => [index, entry] as const)
    : Object.entries(value)
}

function isJsonContainerValue(value: JsonValue): value is JsonObject | JsonArray {
  return Array.isArray(value) || isJsonObject(value)
}

function scalarSearchValue(value: JsonValue): string | null {
  if (value === null) {
    return "null"
  }
  if (Array.isArray(value) || isJsonObject(value)) {
    return null
  }
  return String(value)
}

function isStringPathSegment(segment: JsonPathSegment | null): segment is string {
  return Object.prototype.toString.call(segment) === "[object String]"
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return Object.prototype.toString.call(value) === "[object Object]"
}

function isJsonString(value: JsonValue): value is string {
  return Object.prototype.toString.call(value) === "[object String]"
}

function isJsonNumber(value: JsonValue): value is number {
  return Object.prototype.toString.call(value) === "[object Number]"
}

function isJsonBoolean(value: JsonValue): value is boolean {
  return Object.prototype.toString.call(value) === "[object Boolean]"
}
