export type JsonSummary =
  | { readonly kind: "object" | "array"; readonly count: number }
  | { readonly kind: "string" | "number" | "boolean" | "null" }

export function summarizeJson(text: string): JsonSummary | null {
  let root: unknown
  try {
    root = JSON.parse(text)
  } catch {
    return null
  }

  if (root === null) {
    return { kind: "null" }
  }
  if (Array.isArray(root)) {
    return { kind: "array", count: root.length }
  }
  if (root instanceof Object) {
    return { kind: "object", count: Object.keys(root).length }
  }
  if (root === true || root === false) {
    return { kind: "boolean" }
  }
  if (Number.isFinite(root)) {
    return { kind: "number" }
  }
  return { kind: "string" }
}
