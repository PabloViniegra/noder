import type { JsonPath } from "./types"

export type JsonPathParseResult =
  | { readonly ok: true; readonly path: JsonPath }
  | { readonly ok: false; readonly message: string }

export function serializeJsonPath(path: JsonPath): string {
  return JSON.stringify(path)
}

export function formatJsonPath(path: JsonPath): string {
  let formatted = "$"
  for (const segment of path) {
    if (isJsonPathIndex(segment)) {
      formatted += `[${segment}]`
      continue
    }
    formatted += isIdentifier(segment)
      ? `.${segment}`
      : `[${JSON.stringify(segment)}]`
  }
  return formatted
}

export function parseJsonPath(input: string): JsonPathParseResult {
  const source = input.trim()
  if (source.length === 0) {
    return invalidPath("Enter a JSONPath.")
  }
  if (source[0] !== "$") {
    return invalidPath("A JSONPath must start with '$'.")
  }

  const path: Array<string | number> = []
  let index = 1

  while (index < source.length) {
    const token = source[index]
    if (token === ".") {
      const match = source.slice(index + 1).match(/^[A-Za-z_$][A-Za-z0-9_$]*/u)
      if (match === null) {
        return invalidPath("Expected a property name after '.'.")
      }
      path.push(match[0])
      index += match[0].length + 1
      continue
    }

    if (token === "[") {
      const next = source[index + 1]
      if (next === '"') {
        const parsedKey = parseQuotedKey(source, index + 1)
        if (parsedKey === null) {
          return invalidPath("Expected a valid quoted property name inside brackets.")
        }
        path.push(parsedKey.value)
        index = parsedKey.nextIndex
        continue
      }

      const match = source.slice(index + 1).match(/^(0|[1-9][0-9]*)\]/u)
      if (match === null) {
        return invalidPath("Expected a non-negative array index inside brackets.")
      }
      path.push(Number(match[1]))
      index += match[0].length + 1
      continue
    }

    return invalidPath(`Unexpected token at position ${index}.`)
  }

  return { ok: true, path }
}

export function parentJsonPath(path: JsonPath): JsonPath | null {
  return path.length === 0 ? null : path.slice(0, -1)
}

export function isJsonPathWithin(path: JsonPath, ancestor: JsonPath): boolean {
  return (
    path.length >= ancestor.length &&
    ancestor.every((segment, index) => segment === path[index])
  )
}

export function jsonPathsEqual(left: JsonPath, right: JsonPath): boolean {
  return left.length === right.length && isJsonPathWithin(left, right)
}

function isJsonPathIndex(segment: string | number): segment is number {
  return Object.prototype.toString.call(segment) === "[object Number]"
}

function parseQuotedKey(
  source: string,
  quoteIndex: number,
): { readonly value: string; readonly nextIndex: number } | null {
  let index = quoteIndex + 1
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2
      continue
    }
    if (source[index] !== '"') {
      index += 1
      continue
    }

    if (source[index + 1] !== "]") {
      return null
    }

    let value: string
    try {
      value = JSON.parse(source.slice(quoteIndex, index + 1))
    } catch {
      return null
    }
    return { value, nextIndex: index + 2 }
  }
  return null
}

function invalidPath(message: string): JsonPathParseResult {
  return { ok: false, message }
}

function isIdentifier(segment: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(segment)
}
