import type { JsonParseResult } from "./parse"
import type { JsonSearchIndexMatch } from "./search"
import type { JsonPath } from "./types"
import type {
  WorkerMessage,
  WorkerRequest,
  WorkerResponse,
} from "./worker-protocol"

type PendingRequest = {
  readonly resolve: (value: WorkerResult) => void
  readonly reject: (reason: Error) => void
}

type WorkerResult = JsonParseResult | readonly JsonSearchIndexMatch[] | undefined

export const LARGE_DOCUMENT_BYTES = 4_000_000

let worker: Worker | null = null
let nextRequestId = 0
const pendingRequests = new Map<number, PendingRequest>()

function getWorker(): Worker {
  if (worker !== null) {
    return worker
  }

  const nextWorker = new Worker(new URL("./json.worker.ts", import.meta.url), { type: "module" })
  nextWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const request = pendingRequests.get(event.data.id)
    if (request === undefined) {
      return
    }
    pendingRequests.delete(event.data.id)

    if (event.data.type === "error") {
      request.reject(new Error(event.data.message))
      return
    }

    if (event.data.type === "parse") {
      request.resolve(event.data.result)
      return
    }

    if (event.data.type === "search") {
      request.resolve(event.data.matches)
      return
    }

    request.resolve(undefined)
  }
  nextWorker.onerror = () => {
    const error = new Error("JSON worker failed.")
    for (const request of pendingRequests.values()) {
      request.reject(error)
    }
    pendingRequests.clear()
    nextWorker.terminate()
    worker = null
  }
  worker = nextWorker
  return nextWorker
}

function request(message: WorkerMessage): Promise<WorkerResult> {
  const id = nextRequestId
  nextRequestId += 1

  return new Promise<WorkerResult>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject })
    const requestWithId: WorkerRequest = { ...message, id }
    getWorker().postMessage(requestWithId)
  })
}

export function parseJsonInWorker(text: string): Promise<JsonParseResult> {
  return request({ type: "parse", text }).then((result) => {
    if (isJsonParseResult(result)) {
      return result
    }
    throw new Error("JSON worker returned an invalid parse response.")
  })
}

export function searchJsonInWorker(
  query: string,
  pathPrefix: JsonPath,
): Promise<readonly JsonSearchIndexMatch[]> {
  return request({ type: "search", query, pathPrefix }).then((result) => {
    if (Array.isArray(result)) {
      return result
    }
    throw new Error("JSON worker returned an invalid search response.")
  })
}

export function clearJsonWorker(): void {
  if (worker === null) {
    return
  }

  void request({ type: "clear" }).catch(() => undefined)
}

function isJsonParseResult(value: WorkerResult): value is JsonParseResult {
  return value !== undefined && !Array.isArray(value) && "ok" in value
}
