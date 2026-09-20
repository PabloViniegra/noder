import { describe, expect, it } from "vitest"
import { parseJson } from "./parse"
import {
  flattenVisibleNodes,
  getJsonChildPosition,
  getJsonNodeAtPath,
  summarizeJsonNode,
} from "./traverse"

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

describe("summarizeJsonNode", () => {
  it("counts a document from the root", () => {
    const result = parseJson('{"user":{"id":1},"items":[true]}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    expect(summarizeJsonNode(result.document.root)).toEqual({
      nodes: 5,
      objects: 2,
      arrays: 1,
      maxDepth: 2,
    })
  })

  it("counts a focused branch relative to that node", () => {
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

    expect(summarizeJsonNode(user)).toEqual({
      nodes: 2,
      objects: 1,
      arrays: 0,
      maxDepth: 1,
    })
  })
})
