import type { JsonParseResult } from "./parse"
import type { JsonSearchIndexMatch } from "./search"
import type { JsonPath } from "./types"

export type WorkerMessage =
  | { readonly type: "parse"; readonly text: string }
  | { readonly type: "search"; readonly query: string; readonly pathPrefix: JsonPath }
  | { readonly type: "clear" }

export type WorkerRequest = WorkerMessage & { readonly id: number }

export type WorkerResponse =
  | { readonly id: number; readonly type: "parse"; readonly result: JsonParseResult }
  | {
      readonly id: number
      readonly type: "search"
      readonly matches: readonly JsonSearchIndexMatch[]
    }
  | { readonly id: number; readonly type: "clear" }
  | { readonly id: number; readonly type: "error"; readonly message: string }
