import { describe, expect, it } from "vitest"
import { formatJsonPath, isJsonPathWithin, parentJsonPath } from "./path"

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

  it("returns a parent path and checks containment", () => {
    expect(parentJsonPath([])).toBeNull()
    expect(parentJsonPath(["users", 0, "profile"])).toEqual(["users", 0])
    expect(isJsonPathWithin(["users", 0, "profile"], ["users", 0])).toBe(true)
    expect(isJsonPathWithin(["users", 0], ["users", 0])).toBe(true)
    expect(isJsonPathWithin(["settings"], ["users"])).toBe(false)
  })
})
