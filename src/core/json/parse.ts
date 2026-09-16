import type {
  JsonDocument,
  JsonNode,
  JsonValue,
  JsonObject,
  JsonPath,
  JsonPathSegment,
  JsonStats,
} from "./types"

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
      root: normalizeNode(value, null, [], 0, stats),
      stats,
    },
  }
}

type JsonStatsAccumulator = {
  -readonly [Key in keyof JsonStats]: JsonStats[Key]
}

function normalizeNode(
  value: JsonValue,
  key: JsonPathSegment | null,
  path: JsonPath,
  depth: number,
  stats: JsonStatsAccumulator,
): JsonNode {
  stats.nodes += 1
  stats.maxDepth = Math.max(stats.maxDepth, depth)

  if (value === null) {
    stats.nulls += 1
    return { kind: "null", key, path, depth, value: null }
  }

  if (Array.isArray(value)) {
    stats.arrays += 1
    return {
      kind: "array",
      key,
      path,
      depth,
      children: value.map((child, index) =>
        normalizeNode(child, index, [...path, index], depth + 1, stats),
      ),
    }
  }

  if (isJsonObject(value)) {
    stats.objects += 1
    return {
      kind: "object",
      key,
      path,
      depth,
      children: Object.keys(value).map((childKey) =>
        normalizeNode(
          value[childKey],
          childKey,
          [...path, childKey],
          depth + 1,
          stats,
        ),
      ),
    }
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

  throw new Error("Unsupported JSON value")
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
