import { describe, expect, it } from "vitest"
import { parseJson } from "./parse"
import { getJsonNodeAtPath } from "./traverse"
import { layoutMinimap } from "./minimap"
import type { JsonNode } from "./types"

function parsedRoot(text: string): JsonNode {
  const result = parseJson(text)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error("expected a parsed document")
  }
  return result.document.root
}

describe("layoutMinimap", () => {
  it("maps a primitive root to a single full-height slab", () => {
    const segments = layoutMinimap(parsedRoot("null"), { minHeight: 0 })

    expect(segments).toEqual([
      {
        path: [],
        key: null,
        kind: "null",
        size: 1,
        depth: 0,
        top: 0,
        height: 1,
      },
    ])
  })

  it("sizes sibling branches by subtree mass and reserves a root header", () => {
    const segments = layoutMinimap(
      parsedRoot('{"small":{"n":1},"big":{"a":1,"b":2,"c":3}}'),
      { minHeight: 0 },
    )

    expect(segments).toEqual([
      {
        path: [],
        key: null,
        kind: "object",
        size: 7,
        depth: 0,
        top: 0,
        height: 1,
      },
      {
        path: ["small"],
        key: "small",
        kind: "object",
        size: 2,
        depth: 1,
        top: 1 / 7,
        height: 2 / 7,
      },
      {
        path: ["big"],
        key: "big",
        kind: "object",
        size: 4,
        depth: 1,
        top: 3 / 7,
        height: 4 / 7,
      },
    ])
  })

  it("nests container descendants and skips scalar leaves", () => {
    const segments = layoutMinimap(parsedRoot('{"user":{"id":1}}'), { minHeight: 0 })

    expect(segments).toEqual([
      {
        path: [],
        key: null,
        kind: "object",
        size: 3,
        depth: 0,
        top: 0,
        height: 1,
      },
      {
        path: ["user"],
        key: "user",
        kind: "object",
        size: 2,
        depth: 1,
        top: 1 / 3,
        height: 2 / 3,
      },
    ])
  })

  it("starts depth at the layout root so focus mode can zoom", () => {
    const root = parsedRoot('{"users":[{"id":1}],"meta":true}')
    const users = getJsonNodeAtPath(root, ["users"])
    expect(users).not.toBeNull()
    if (users === null) {
      throw new Error("expected users node")
    }

    const segments = layoutMinimap(users, { minHeight: 0 })

    expect(segments[0]).toMatchObject({
      path: ["users"],
      key: "users",
      depth: 0,
      top: 0,
      height: 1,
    })
    expect(segments.some((segment) => segment.key === "meta")).toBe(false)
  })

  it("omits slabs shorter than minHeight without dropping heavier siblings", () => {
    const segments = layoutMinimap(
      parsedRoot('{"a":1,"b":{"c":{"d":1},"e":{"f":1}}}'),
      { minHeight: 0.5 },
    )

    expect(segments.map((segment) => segment.key)).toEqual([null, "b"])
    expect(segments[1]?.height).toBeGreaterThan(0.5)
  })

  it("reserves a minimum header so nested containers stay clickable", () => {
    const segments = layoutMinimap(
      parsedRoot('{"big":{"a":{"b":1},"c":2},"small":{"d":3}}'),
      { minHeight: 0, headerMin: 0.3 },
    )

    const [root, big, a, small] = segments
    expect(root?.top).toBe(0)
    expect(root?.height).toBe(1)
    expect(big?.top).toBeCloseTo(0.3, 5)
    expect(a?.top).toBeCloseTo(0.6, 5)
    expect((small?.top ?? 0) + (small?.height ?? 0)).toBeCloseTo(1, 5)
  })

  it("keeps the mass layout unchanged when headerMin is omitted", () => {
    const doc = '{"big":{"a":{"b":1},"c":2},"small":{"d":3}}'
    const withDefault = layoutMinimap(parsedRoot(doc), { minHeight: 0 })
    const withZero = layoutMinimap(parsedRoot(doc), { minHeight: 0, headerMin: 0 })

    expect(withZero).toEqual(withDefault)
  })

  it("lays out nesting deeper than the call-stack limit", () => {
    const depth = 12_000
    const root = parsedRoot(`[${"[".repeat(depth)}${"]".repeat(depth)}]`)

    const segments = layoutMinimap(root, { minHeight: 0 })

    expect(segments).toHaveLength(depth + 1)
    expect(segments[0]).toMatchObject({ path: [], depth: 0, top: 0, height: 1 })
    expect(segments[segments.length - 1]).toMatchObject({ depth })
  })
})
