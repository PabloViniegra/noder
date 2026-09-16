import { describe, expect, it } from "vitest"
import { summarizeJson } from "./summarize"

describe("summarizeJson", () => {
  it("counts the keys of a root object", () => {
    expect(summarizeJson('{"id": 1, "name": "noder"}')).toEqual({ kind: "object", count: 2 })
  })

  it("counts the items of a root array", () => {
    expect(summarizeJson("[1, 2, 3]")).toEqual({ kind: "array", count: 3 })
  })

  it("names a root primitive", () => {
    expect(summarizeJson('"payload"')).toEqual({ kind: "string" })
    expect(summarizeJson("42")).toEqual({ kind: "number" })
    expect(summarizeJson("false")).toEqual({ kind: "boolean" })
    expect(summarizeJson("null")).toEqual({ kind: "null" })
  })

  it("returns null while the draft is not yet valid", () => {
    expect(summarizeJson("{")).toBeNull()
    expect(summarizeJson("")).toBeNull()
  })
})
