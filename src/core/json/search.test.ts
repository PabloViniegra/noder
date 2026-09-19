import { describe, expect, it } from "vitest"
import { parseJson, parseJsonWithSearchIndex } from "./parse"
import { searchJson, searchJsonIndex } from "./search"

describe("searchJson", () => {
  it("matches keys and scalar values case-insensitively", () => {
    const result = parseJson('{"users":[{"name":"Ada","role":"admin"}],"meta":true}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    const keyMatches = searchJson(result.document.root, "USER")
    const valueMatches = searchJson(result.document.root, "ada")
    const booleanMatches = searchJson(result.document.root, "TRUE")

    expect(keyMatches.map((match) => match.node.path)).toEqual([["users"]])
    expect(keyMatches[0]?.matchedBy).toEqual(["key"])
    expect(valueMatches.map((match) => match.node.path)).toEqual([["users", 0, "name"]])
    expect(valueMatches[0]?.matchedBy).toEqual(["value"])
    expect(booleanMatches.map((match) => match.node.path)).toEqual([["meta"]])
  })

  it("returns no matches for an empty query", () => {
    const result = parseJson('{"id":1}')

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    expect(searchJson(result.document.root, "  ")).toEqual([])
  })

  it("searches the normalized index within a focused path", () => {
    const result = parseJsonWithSearchIndex(
      '{"users":[{"name":"Ada"}],"meta":{"owner":"Ada"}}',
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("expected a parsed document")
    }

    expect(searchJsonIndex(result.searchIndex, "ada", ["users"])).toEqual([
      { path: ["users", 0, "name"], matchedBy: ["value"] },
    ])
  })
})
