import type {
  JsonArrayNode,
  JsonNode,
  JsonObjectNode,
  JsonPath,
  JsonPathSegment,
} from "./types"

export type JsonNodeSummary = {
  readonly nodes: number
  readonly objects: number
  readonly arrays: number
  readonly maxDepth: number
}

type ContainerNode = JsonObjectNode | JsonArrayNode
// Weak keys prevent released documents from being retained by the traversal cache.
const childIndexCache = new WeakMap<ContainerNode, ReadonlyMap<JsonPathSegment, number>>()

export function isJsonContainerNode(node: JsonNode): node is ContainerNode {
  return node.kind === "object" || node.kind === "array"
}

export function isJsonStringKeyNode(
  node: JsonNode,
): node is JsonNode & { readonly key: string } {
  return Object.prototype.toString.call(node.key) === "[object String]"
}

export function getJsonNodeAtPath(root: JsonNode, path: JsonPath): JsonNode | null {
  let current = root

  for (const segment of path) {
    if (!isJsonContainerNode(current)) {
      return null
    }

    const childIndex = getChildIndex(current).get(segment)
    if (childIndex === undefined) {
      return null
    }
    current = current.children[childIndex] ?? null
    if (current === null) {
      return null
    }
  }

  return current
}

export function getJsonChildPosition(parent: JsonNode, child: JsonNode): number {
  if (!isJsonContainerNode(parent) || child.key === null) {
    return -1
  }

  return getChildIndex(parent).get(child.key) ?? -1
}

export function flattenVisibleNodes(
  root: JsonNode,
  expandedNodes: ReadonlySet<JsonNode>,
): readonly JsonNode[] {
  const visible: JsonNode[] = []
  const pending: JsonNode[] = [root]

  while (pending.length > 0) {
    const node = pending.pop()
    if (node === undefined) {
      continue
    }

    visible.push(node)
    if (!isJsonContainerNode(node) || !expandedNodes.has(node)) {
      continue
    }

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const child = node.children[index]
      if (child !== undefined) {
        pending.push(child)
      }
    }
  }

  return visible
}

function getChildIndex(parent: ContainerNode): ReadonlyMap<JsonPathSegment, number> {
  const cached = childIndexCache.get(parent)
  if (cached !== undefined) {
    return cached
  }

  const index = new Map<JsonPathSegment, number>()
  parent.children.forEach((child, childIndex) => {
    if (child.key !== null) {
      index.set(child.key, childIndex)
    }
  })
  childIndexCache.set(parent, index)
  return index
}

export function summarizeJsonNode(node: JsonNode): JsonNodeSummary {
  let nodes = 0
  let objects = 0
  let arrays = 0
  let maxDepth = 0
  const pending: JsonNode[] = [node]

  while (pending.length > 0) {
    const current = pending.pop()
    if (current === undefined) {
      continue
    }

    nodes += 1
    maxDepth = Math.max(maxDepth, current.depth - node.depth)
    if (!isJsonContainerNode(current)) {
      continue
    }
    if (current.kind === "object") {
      objects += 1
    } else {
      arrays += 1
    }
    for (let index = current.children.length - 1; index >= 0; index -= 1) {
      const child = current.children[index]
      if (child !== undefined) {
        pending.push(child)
      }
    }
  }

  return { nodes, objects, arrays, maxDepth }
}
