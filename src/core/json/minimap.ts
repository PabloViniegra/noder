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
  readonly headerMin?: number
}

const defaultMinHeight = 1 / 250

// Iterative because JSON.parse accepts nesting depths that exceed the call-stack limit (~10k).
export function layoutMinimap(
  root: JsonNode,
  options: MinimapLayoutOptions = {},
): readonly MinimapSegment[] {
  const minHeight = options.minHeight ?? defaultMinHeight
  const headerMin = options.headerMin ?? 0
  const sizes = nodeSizes(root)
  const segments: MinimapSegment[] = []

  type Frame = {
    readonly node: JsonNode
    readonly top: number
    readonly height: number
    readonly depth: number
    childIndex: number
    cursor: number
    childScale: number
    started: boolean
  }

  const stack: Frame[] = [
    { node: root, top: 0, height: 1, depth: 0, childIndex: 0, cursor: 0, childScale: 0, started: false },
  ]

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (frame === undefined) {
      break
    }
    const size = sizes.get(frame.node)
    if (size === undefined) {
      stack.pop()
      continue
    }

    if (!frame.started) {
      if (frame.depth === 0 || isJsonContainerNode(frame.node)) {
        segments.push({
          path: frame.node.path,
          key: frame.node.key,
          kind: frame.node.kind,
          size,
          depth: frame.depth,
          top: frame.top,
          height: frame.height,
        })
      }

      if (!isJsonContainerNode(frame.node) || frame.node.children.length === 0 || size <= 1) {
        stack.pop()
        continue
      }

      const naturalHeader = frame.height / size
      const header = Math.min(frame.height, Math.max(naturalHeader, headerMin))
      const naturalChildSpace = frame.height - naturalHeader
      frame.childScale =
        naturalChildSpace > 0 ? (frame.height - header) / naturalChildSpace : 0
      frame.cursor = frame.top + header
      frame.started = true
      continue
    }

    if (!isJsonContainerNode(frame.node)) {
      stack.pop()
      continue
    }
    const child = frame.node.children[frame.childIndex]
    if (child === undefined) {
      stack.pop()
      continue
    }
    frame.childIndex += 1

    const childSize = sizes.get(child)
    if (childSize === undefined) {
      continue
    }

    const childHeight = frame.height * (childSize / size) * frame.childScale
    if (childHeight >= minHeight) {
      stack.push({
        node: child,
        top: frame.cursor,
        height: childHeight,
        depth: frame.depth + 1,
        childIndex: 0,
        cursor: 0,
        childScale: 0,
        started: false,
      })
    }
    frame.cursor += childHeight
  }

  return segments
}

// Iterative for the same reason as layoutMinimap.
function nodeSizes(root: JsonNode): Map<JsonNode, number> {
  const sizes = new Map<JsonNode, number>()

  type Frame = {
    readonly node: JsonNode
    childIndex: number
    collectedSize: number
  }

  const stack: Frame[] = [{ node: root, childIndex: 0, collectedSize: 0 }]

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (frame === undefined) {
      break
    }

    const nextChild = isJsonContainerNode(frame.node)
      ? frame.node.children[frame.childIndex]
      : undefined
    if (nextChild === undefined) {
      stack.pop()
      const size = frame.collectedSize + 1
      sizes.set(frame.node, size)
      const parent = stack[stack.length - 1]
      if (parent !== undefined) {
        parent.collectedSize += size
        parent.childIndex += 1
      }
      continue
    }

    stack.push({ node: nextChild, childIndex: 0, collectedSize: 0 })
  }

  return sizes
}
