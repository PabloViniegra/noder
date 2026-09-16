import { describe, expect, it } from "vitest"
import { parseJson } from "./parse"

describe("parseJson", () => {
  it("normalizes object and array descendants", () => {
    const result = parseJson('{"user":{"id":1,"active":true},"tags":["json",null]}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    expect(result.document.root).toEqual({
      kind: "object",
      key: null,
      path: [],
      depth: 0,
      children: [
        {
          kind: "object",
          key: "user",
          path: ["user"],
          depth: 1,
          children: [
            { kind: "number", key: "id", path: ["user", "id"], depth: 2, value: 1 },
            {
              kind: "boolean",
              key: "active",
              path: ["user", "active"],
              depth: 2,
              value: true,
            },
          ],
        },
        {
          kind: "array",
          key: "tags",
          path: ["tags"],
          depth: 1,
          children: [
            { kind: "string", key: 0, path: ["tags", 0], depth: 2, value: "json" },
            { kind: "null", key: 1, path: ["tags", 1], depth: 2, value: null },
          ],
        },
      ],
    })
  })

  it("accepts a root primitive", () => {
    const result = parseJson("null")

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    expect(result.document.root).toEqual({
      kind: "null",
      key: null,
      path: [],
      depth: 0,
      value: null,
    })
  })

  it("collects node and type statistics in one traversal", () => {
    const text = '{"user":{"id":1,"active":true},"tags":["json",null]}'
    const result = parseJson(text)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    expect(result.document.stats).toEqual({
      bytes: new TextEncoder().encode(text).byteLength,
      nodes: 7,
      objects: 2,
      arrays: 1,
      strings: 1,
      numbers: 1,
      booleans: 1,
      nulls: 1,
      maxDepth: 2,
    })
  })

  it("rejects empty text", () => {
    const result = parseJson("")
    expect(result.ok).toBe(false)
  })

  it("rejects invalid JSON with the parser message", () => {
    const result = parseJson("{")
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("expected a parse error")
    }
    expect(result.message.length).toBeGreaterThan(0)
  })
})
