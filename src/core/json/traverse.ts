import type { JsonArrayNode, JsonNode, JsonObjectNode, JsonPath } from "./types"
import { serializeJsonPath } from "./path"

type ContainerNode = JsonObjectNode | JsonArrayNode

export function isJsonContainerNode(node: JsonNode): node is ContainerNode {
  return node.kind === "object" || node.kind === "array"
}

export function getJsonNodeAtPath(root: JsonNode, path: JsonPath): JsonNode | null {
  let current = root

  for (const segment of path) {
    if (!isJsonContainerNode(current)) {
      return null
    }

    const child = current.children.find((candidate) => candidate.key === segment)
    if (child === undefined) {
      return null
    }
    current = child
  }

  return current
}

export function flattenVisibleNodes(
  root: JsonNode,
  expandedPaths: ReadonlySet<string>,
): readonly JsonNode[] {
  const visible: JsonNode[] = []
  const pending: JsonNode[] = [root]

  while (pending.length > 0) {
    const node = pending.pop()
    if (node === undefined) {
      continue
    }

    visible.push(node)
    if (!isJsonContainerNode(node) || !expandedPaths.has(serializeJsonPath(node.path))) {
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
