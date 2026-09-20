import type { JsonNode, JsonPath, JsonValue } from "./types"
import { isJsonContainerNode } from "./traverse"

export type JsonCodeTokenKind =
  | "indent"
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "punctuation"

export type JsonCodeToken = {
  readonly kind: JsonCodeTokenKind
  readonly text: string
}

export type JsonCodeLine = {
  readonly path: JsonPath
  readonly tokens: readonly JsonCodeToken[]
}

const INDENT = "  "

type FormatTask =
  | {
      readonly kind: "node"
      readonly node: JsonNode
      readonly indent: number
      readonly comma: boolean
      readonly withKey: boolean
    }
  | {
      readonly kind: "close"
      readonly node: JsonNode
      readonly indent: number
      readonly comma: boolean
    }

export function stringifyJsonNode(node: JsonNode): string {
  return JSON.stringify(toJsonValue(node), null, 2)
}

export function formatJsonCode(root: JsonNode): readonly JsonCodeLine[] {
  const lines: JsonCodeLine[] = []
  const stack: FormatTask[] = [
    { kind: "node", node: root, indent: 0, comma: false, withKey: false },
  ]

  while (stack.length > 0) {
    const task = stack.pop()
    if (task === undefined) {
      continue
    }

    if (task.kind === "close") {
      lines.push({
        path: task.node.path,
        tokens: [
          ...indentToken(task.indent),
          { kind: "punctuation", text: task.node.kind === "object" ? "}" : "]" },
          ...commaToken(task.comma),
        ],
      })
      continue
    }

    const { node, indent, comma, withKey } = task
    if (!isJsonContainerNode(node) || node.children.length === 0) {
      lines.push({
        path: node.path,
        tokens: [...linePrefix(indent, node, withKey), ...valueTokens(node), ...commaToken(comma)],
      })
      continue
    }

    lines.push({
      path: node.path,
      tokens: [
        ...linePrefix(indent, node, withKey),
        { kind: "punctuation", text: node.kind === "object" ? "{" : "[" },
      ],
    })

    stack.push({ kind: "close", node, indent, comma })
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const child = node.children[index]
      if (child === undefined) {
        continue
      }
      stack.push({
        kind: "node",
        node: child,
        indent: indent + 1,
        comma: index < node.children.length - 1,
        withKey: node.kind === "object",
      })
    }
  }

  return lines
}

function linePrefix(indent: number, node: JsonNode, withKey: boolean): readonly JsonCodeToken[] {
  if (withKey && isStringKey(node)) {
    return [
      ...indentToken(indent),
      { kind: "key", text: JSON.stringify(node.key) },
      { kind: "punctuation", text: ": " },
    ]
  }
  return indentToken(indent)
}

function valueTokens(node: JsonNode): readonly JsonCodeToken[] {
  switch (node.kind) {
    case "string":
      return [{ kind: "string", text: JSON.stringify(node.value) }]
    case "number":
      return [{ kind: "number", text: String(node.value) }]
    case "boolean":
      return [{ kind: "boolean", text: String(node.value) }]
    case "null":
      return [{ kind: "null", text: "null" }]
    case "object":
      return [{ kind: "punctuation", text: "{}" }]
    case "array":
      return [{ kind: "punctuation", text: "[]" }]
  }
}

function indentToken(indent: number): readonly JsonCodeToken[] {
  return indent > 0 ? [{ kind: "indent", text: INDENT.repeat(indent) }] : []
}

function commaToken(comma: boolean): readonly JsonCodeToken[] {
  return comma ? [{ kind: "punctuation", text: "," }] : []
}

function isStringKey(node: JsonNode): node is JsonNode & { readonly key: string } {
  return Object.prototype.toString.call(node.key) === "[object String]"
}

function toJsonValue(node: JsonNode): JsonValue {
  switch (node.kind) {
    case "object": {
      const value: { [key: string]: JsonValue } = {}
      for (const child of node.children) {
        if (isStringKey(child)) {
          value[child.key] = toJsonValue(child)
        }
      }
      return value
    }
    case "array":
      return node.children.map(toJsonValue)
    case "string":
    case "number":
    case "boolean":
    case "null":
      return node.value
  }
}
