export type JsonParseOk = {
  readonly ok: true
}

export type JsonParseErr = {
  readonly ok: false
  readonly message: string
}

export type JsonParseResult = JsonParseOk | JsonParseErr

export function parseJson(text: string): JsonParseResult {
  try {
    JSON.parse(text)
    return { ok: true }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, message: error.message }
    }
    return { ok: false, message: "Could not parse JSON." }
  }
}
