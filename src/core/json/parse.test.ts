import { describe, expect, it } from "vitest"
import { parseJson } from "./parse"

describe("parseJson", () => {
  it("accepts an object", () => {
    expect(parseJson('{"id": 1}')).toEqual({ ok: true })
  })

  it("accepts a root primitive", () => {
    expect(parseJson("null")).toEqual({ ok: true })
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
