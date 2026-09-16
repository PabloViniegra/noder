import type { JsonPath } from "./types"

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

export function parentJsonPath(path: JsonPath): JsonPath | null {
  return path.length === 0 ? null : path.slice(0, -1)
}

export function isJsonPathWithin(path: JsonPath, ancestor: JsonPath): boolean {
  return (
    path.length >= ancestor.length &&
    ancestor.every((segment, index) => segment === path[index])
  )
}

function isJsonPathIndex(segment: string | number): segment is number {
  return Object.prototype.toString.call(segment) === "[object Number]"
}

function isIdentifier(segment: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(segment)
}
