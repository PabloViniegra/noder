import { describe, expect, it } from "vitest"
import { parseJson } from "./parse"
import { flattenVisibleNodes, getJsonChildPosition, getJsonNodeAtPath } from "./traverse"

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

    const user = getJsonNodeAtPath(result.document.root, ["user"])
    expect(user).not.toBeNull()
    if (user === null) {
      throw new Error("expected the user node")
    }

    const visible = flattenVisibleNodes(result.document.root, new Set([result.document.root, user]))

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

  it("resolves a child position from the same indexed container", () => {
    const result = parseJson('{"first":true,"second":false}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    const second = getJsonNodeAtPath(result.document.root, ["second"])
    expect(second).not.toBeNull()
    if (second === null) {
      throw new Error("expected the second child")
    }

    expect(getJsonChildPosition(result.document.root, second)).toBe(1)
  })
})
