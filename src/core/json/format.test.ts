import { describe, expect, it } from "vitest"
import { formatJsonCode, stringifyJsonNode, type JsonCodeLine } from "./format"
import { parseJson } from "./parse"
import { getJsonNodeAtPath } from "./traverse"

describe("formatJsonCode", () => {
  it("pretty-prints like JSON.stringify with two-space indent", () => {
    const text = '{"user":{"id":1,"name":"Ada"},"tags":["json",null],"ok":true}'
    const root = parsedRoot(text)

    expect(lineText(formatJsonCode(root))).toBe(JSON.stringify(JSON.parse(text), null, 2))
  })

  it("keeps empty containers on one line", () => {
    const root = parsedRoot('{"a":{},"b":[]}')

    expect(lineText(formatJsonCode(root))).toBe(JSON.stringify({ a: {}, b: [] }, null, 2))
  })

  it("pretty-prints a focused branch without wrapping it in a key", () => {
    const root = parsedRoot('{"users":[{"id":1}],"meta":true}')
    const users = getJsonNodeAtPath(root, ["users"])

    expect(users).not.toBeNull()
    if (users === null) {
      throw new Error("expected users node")
    }

    expect(lineText(formatJsonCode(users))).toBe(JSON.stringify([{ id: 1 }], null, 2))
  })

  it("maps opening, value, and closing lines back to node paths", () => {
    const root = parsedRoot('{"user":{"id":1}}')
    const lines = formatJsonCode(root)

    expect(lines.map((line) => [lineText([line]), line.path])).toEqual([
      ["{", []],
      ['  "user": {', ["user"]],
      ['    "id": 1', ["user", "id"]],
      ["  }", ["user"]],
      ["}", []],
    ])
  })

  it("escapes keys and strings the same way JSON.stringify does", () => {
    const text = '{"user-name":"say\\"hi\\n"}'
    const root = parsedRoot(text)

    expect(lineText(formatJsonCode(root))).toBe(JSON.stringify(JSON.parse(text), null, 2))
  })
})

describe("stringifyJsonNode", () => {
  it("pretty-prints the full document like JSON.stringify", () => {
    const text = '{"user":{"id":1,"name":"Ada"},"tags":["json",null],"ok":true}'
    const root = parsedRoot(text)

    expect(stringifyJsonNode(root)).toBe(JSON.stringify(JSON.parse(text), null, 2))
  })

  it("pretty-prints a nested node without wrapping it in its key", () => {
    const root = parsedRoot('{"users":[{"id":1}],"meta":true}')
    const users = getJsonNodeAtPath(root, ["users"])

    expect(users).not.toBeNull()
    if (users === null) {
      throw new Error("expected users node")
    }

    expect(stringifyJsonNode(users)).toBe(JSON.stringify([{ id: 1 }], null, 2))
  })

  it("stringifies scalar nodes as JSON values", () => {
    const root = parsedRoot('{"name":"Ada","ok":true}')
    const name = getJsonNodeAtPath(root, ["name"])
    const ok = getJsonNodeAtPath(root, ["ok"])

    expect(name).not.toBeNull()
    expect(ok).not.toBeNull()
    if (name === null || ok === null) {
      throw new Error("expected scalar nodes")
    }

    expect(stringifyJsonNode(name)).toBe('"Ada"')
    expect(stringifyJsonNode(ok)).toBe("true")
  })

  it("stringifies nesting deeper than the call-stack limit", () => {
    const depth = 12_000
    const root = parsedRoot(`[${"[".repeat(depth)}${"]".repeat(depth)}]`)

    // JSON.stringify cannot serve as the oracle here: it also overflows at this depth.
    const output = stringifyJsonNode(root)
    expect(output.startsWith("[\n  [\n")).toBe(true)
    expect(output.endsWith("\n]")).toBe(true)
    expect(output.indexOf("[]")).toBe(output.lastIndexOf("[]"))
  })
})

function parsedRoot(text: string) {
  const result = parseJson(text)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error("expected a parsed document")
  }
  return result.document.root
}

function lineText(lines: readonly JsonCodeLine[]): string {
  return lines.map((line) => line.tokens.map((token) => token.text).join("")).join("\n")
}
