import type { JsonNode } from "./types"
import { isJsonContainerNode } from "./traverse"

export type JsonSearchField = "key" | "value"

export type JsonSearchMatch = {
  readonly node: JsonNode
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
    if (isStringKey(node) && node.key.toLowerCase().includes(term)) {
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

function isStringKey(node: JsonNode): node is JsonNode & { readonly key: string } {
  return Object.prototype.toString.call(node.key) === "[object String]"
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
