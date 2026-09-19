import { parseJsonWithSearchIndex } from "./parse"
import { searchJsonIndex, type JsonSearchIndexMatch } from "./search"
import type { JsonParseResult, JsonParseWithSearchIndexResult } from "./parse"
import type { JsonPath, JsonSearchIndexEntry } from "./types"

type WorkerRequest =
  | { readonly id: number; readonly type: "parse"; readonly text: string }
  | {
      readonly id: number
      readonly type: "search"
      readonly query: string
      readonly pathPrefix: JsonPath
    }
  | { readonly id: number; readonly type: "clear" }

type WorkerResponse =
  | { readonly id: number; readonly type: "parse"; readonly result: JsonParseResult }
  | {
      readonly id: number
      readonly type: "search"
      readonly matches: readonly JsonSearchIndexMatch[]
    }
  | { readonly id: number; readonly type: "clear" }
  | { readonly id: number; readonly type: "error"; readonly message: string }

type WorkerScope = {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ) => void
  postMessage: (message: WorkerResponse) => void
}

// SAFETY: Vite runs this module as a dedicated worker, so self exposes the WorkerScope API below.
const scope = self as WorkerScope
let searchIndex: readonly JsonSearchIndexEntry[] = []

scope.addEventListener("message", (event) => {
  const request = event.data

  try {
    if (request.type === "parse") {
      const result: JsonParseWithSearchIndexResult = parseJsonWithSearchIndex(request.text)
      searchIndex = result.ok ? result.searchIndex : []
      const response: WorkerResponse = result.ok
        ? { id: request.id, type: "parse", result: { ok: true, document: result.document } }
        : { id: request.id, type: "parse", result }
      scope.postMessage(response)
      return
    }

    if (request.type === "search") {
      scope.postMessage({
        id: request.id,
        type: "search",
        matches: searchJsonIndex(searchIndex, request.query, request.pathPrefix),
      })
      return
    }

    searchIndex = []
    scope.postMessage({ id: request.id, type: "clear" })
  } catch (error) {
    scope.postMessage({
      id: request.id,
      type: "error",
      message: error instanceof Error ? error.message : "Worker operation failed.",
    })
  }
})
