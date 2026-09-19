export type JsonPrimitive = null | boolean | number | string
export type JsonObject = { readonly [key: string]: JsonValue }
export type JsonArray = readonly JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export type JsonPathSegment = string | number
export type JsonPath = readonly JsonPathSegment[]

type JsonNodeBase<K extends JsonNodeKind> = {
  readonly kind: K
  readonly key: JsonPathSegment | null
  readonly path: JsonPath
  readonly depth: number
}

export type JsonObjectNode = JsonNodeBase<"object"> & {
  readonly children: readonly JsonNode[]
}

export type JsonArrayNode = JsonNodeBase<"array"> & {
  readonly children: readonly JsonNode[]
}

export type JsonStringNode = JsonNodeBase<"string"> & {
  readonly value: string
}

export type JsonNumberNode = JsonNodeBase<"number"> & {
  readonly value: number
}

export type JsonBooleanNode = JsonNodeBase<"boolean"> & {
  readonly value: boolean
}

export type JsonNullNode = JsonNodeBase<"null"> & {
  readonly value: null
}

export type JsonNode =
  | JsonObjectNode
  | JsonArrayNode
  | JsonStringNode
  | JsonNumberNode
  | JsonBooleanNode
  | JsonNullNode

export type JsonNodeKind = JsonNode["kind"]

export type JsonStats = {
  readonly bytes: number
  readonly nodes: number
  readonly objects: number
  readonly arrays: number
  readonly strings: number
  readonly numbers: number
  readonly booleans: number
  readonly nulls: number
  readonly maxDepth: number
}

export type JsonDocument = {
  readonly root: JsonNode
  readonly stats: JsonStats
}

export type JsonSearchIndexEntry = {
  readonly path: JsonPath
  readonly key: string | null
  readonly value: string | null
}
