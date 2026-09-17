import type { JsonNode, JsonNodeKind, JsonPath, JsonPathSegment } from "./types"
import { isJsonContainerNode } from "./traverse"

export type MinimapSegment = {
  readonly path: JsonPath
  readonly key: JsonPathSegment | null
  readonly kind: JsonNodeKind
  readonly size: number
  readonly depth: number
  readonly top: number
  readonly height: number
}

export type MinimapLayoutOptions = {
  readonly minHeight?: number
}

const defaultMinHeight = 1 / 250

export function layoutMinimap(
  root: JsonNode,
  options: MinimapLayoutOptions = {},
): readonly MinimapSegment[] {
  const minHeight = options.minHeight ?? defaultMinHeight
  const sizes = nodeSizes(root)
  const segments: MinimapSegment[] = []

  function walk(node: JsonNode, top: number, height: number, depth: number) {
    const size = sizes.get(node)
    if (size === undefined) {
      return
    }

    if (depth === 0 || isJsonContainerNode(node)) {
      segments.push({
        path: node.path,
        key: node.key,
        kind: node.kind,
        size,
        depth,
        top,
        height,
      })
    }

    if (!isJsonContainerNode(node) || node.children.length === 0 || size <= 1) {
      return
    }

    let cursor = top + height / size
    for (const child of node.children) {
      const childSize = sizes.get(child)
      if (childSize === undefined) {
        continue
      }

      const childHeight = height * (childSize / size)
      if (childHeight >= minHeight) {
        walk(child, cursor, childHeight, depth + 1)
      }
      cursor += childHeight
    }
  }

  walk(root, 0, 1, 0)
  return segments
}

function nodeSizes(root: JsonNode): Map<JsonNode, number> {
  const sizes = new Map<JsonNode, number>()

  function walk(node: JsonNode): number {
    let size = 1
    if (isJsonContainerNode(node)) {
      for (const child of node.children) {
        size += walk(child)
      }
    }
    sizes.set(node, size)
    return size
  }

  walk(root)
  return sizes
}
