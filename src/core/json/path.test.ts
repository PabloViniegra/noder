import { describe, expect, it } from "vitest"
import { formatJsonPath, isJsonPathWithin, parentJsonPath, parseJsonPath } from "./path"

describe("JSON paths", () => {
  it("formats object keys and array indexes as JSONPath", () => {
    expect(formatJsonPath([])).toBe("$")
    expect(formatJsonPath(["users", 0, "profile"])).toBe("$.users[0].profile")
  })

  it("quotes keys that cannot use dot notation", () => {
    expect(formatJsonPath(["user-name", "a.b", 'say"hi'])).toBe(
      '$["user-name"]["a.b"]["say\\\"hi"]',
    )
  })

  it("parses paths produced by the formatter", () => {
    const paths = [[], ["users", 0, "profile"], ["user-name", 'say"hi']]

    for (const path of paths) {
      expect(parseJsonPath(formatJsonPath(path))).toEqual({ ok: true, path })
    }
  })

  it("rejects unsupported or malformed paths", () => {
    expect(parseJsonPath("users").ok).toBe(false)
    expect(parseJsonPath("$.users[*]").ok).toBe(false)
    expect(parseJsonPath("$.users[-1]").ok).toBe(false)
    expect(parseJsonPath('$["unterminated]').ok).toBe(false)
  })

  it("returns a parent path and checks containment", () => {
    expect(parentJsonPath([])).toBeNull()
    expect(parentJsonPath(["users", 0, "profile"])).toEqual(["users", 0])
    expect(isJsonPathWithin(["users", 0, "profile"], ["users", 0])).toBe(true)
    expect(isJsonPathWithin(["users", 0], ["users", 0])).toBe(true)
    expect(isJsonPathWithin(["settings"], ["users"])).toBe(false)
  })
})
