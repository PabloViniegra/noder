import type { JsonNode, JsonPath, JsonSearchIndexEntry } from "./types"
import { isJsonContainerNode, isJsonStringKeyNode } from "./traverse"
import { isJsonPathWithin } from "./path"

export type JsonSearchField = "key" | "value"

export type JsonSearchMatch = {
  readonly node: JsonNode
  readonly matchedBy: readonly JsonSearchField[]
}

export type JsonSearchIndexMatch = {
  readonly path: JsonPath
  readonly matchedBy: readonly JsonSearchField[]
}

export function searchJson(root: JsonNode, query: string): readonly JsonSearchMatch[] {
  const term = query.trim().toLowerCase()
  if (term === "") {
    return []
  }

  const matches: JsonSearchMatch[] = []
  const pending: JsonNode[] = [root]

  while (pending.length > 0) {
    const node = pending.pop()
    if (node === undefined) {
      continue
    }

    const matchedBy: JsonSearchField[] = []
    if (isJsonStringKeyNode(node) && node.key.toLowerCase().includes(term)) {
      matchedBy.push("key")
    }
    const value = scalarValue(node)
    if (value !== null && value.toLowerCase().includes(term)) {
      matchedBy.push("value")
    }
    if (matchedBy.length > 0) {
      matches.push({ node, matchedBy })
    }

    if (isJsonContainerNode(node)) {
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        const child = node.children[index]
        if (child !== undefined) {
          pending.push(child)
        }
      }
    }
  }

  return matches
}

export function searchJsonIndex(
  index: readonly JsonSearchIndexEntry[],
  query: string,
  pathPrefix: JsonPath = [],
): readonly JsonSearchIndexMatch[] {
  const term = query.trim().toLowerCase()
  if (term === "") {
    return []
  }

  const matches: JsonSearchIndexMatch[] = []
  for (const entry of index) {
    if (!isJsonPathWithin(entry.path, pathPrefix)) {
      continue
    }

    const matchedBy: JsonSearchField[] = []
    if (entry.key !== null && entry.key.toLowerCase().includes(term)) {
      matchedBy.push("key")
    }
    if (entry.value !== null && entry.value.toLowerCase().includes(term)) {
      matchedBy.push("value")
    }
    if (matchedBy.length > 0) {
      matches.push({ path: entry.path, matchedBy })
    }
  }

  return matches
}

function scalarValue(node: JsonNode): string | null {
  switch (node.kind) {
    case "string":
    case "number":
    case "boolean":
      return String(node.value)
    case "null":
      return "null"
    case "object":
    case "array":
      return null
  }
}
