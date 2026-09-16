import { describe, expect, it } from "vitest"
import { parseJson } from "./parse"
import { flattenVisibleNodes, getJsonNodeAtPath } from "./traverse"
import { serializeJsonPath } from "./path"

describe("flattenVisibleNodes", () => {
  it("keeps the root visible while descendants stay collapsed", () => {
    const result = parseJson('{"user":{"id":1},"items":[true]}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    const visible = flattenVisibleNodes(result.document.root, new Set())

    expect(visible.map((node) => node.path)).toEqual([[]])
  })

  it("visits expanded descendants in document order", () => {
    const result = parseJson('{"user":{"id":1},"items":[true]}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    const expandedPaths = new Set([
      serializeJsonPath([]),
      serializeJsonPath(["user"]),
    ])
    const visible = flattenVisibleNodes(result.document.root, expandedPaths)

    expect(visible.map((node) => node.path)).toEqual([
      [],
      ["user"],
      ["user", "id"],
      ["items"],
    ])
  })

  it("resolves a node by its absolute path", () => {
    const result = parseJson('{"user":{"id":1},"items":[true]}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    expect(getJsonNodeAtPath(result.document.root, ["user", "id"])?.kind).toBe("number")
    expect(getJsonNodeAtPath(result.document.root, ["missing"])).toBeNull()
  })
})
