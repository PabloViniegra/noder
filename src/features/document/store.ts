import { create } from "zustand"
import { parseJson } from "@/core/json/parse"
import {
  clearJsonWorker,
  LARGE_DOCUMENT_BYTES,
  parseJsonInWorker,
} from "@/core/json/json-worker-client"
import type { JsonDocument } from "@/core/json/types"

export type DocumentStatus = "empty" | "reading" | "ready" | "error"

export type DocumentError = {
  readonly kind: "parse" | "read"
  readonly message: string
}

type DocumentState = {
  status: DocumentStatus
  sourceName: string | null
  text: string | null
  document: JsonDocument | null
  error: DocumentError | null
  searchWorkerReady: boolean
}

type DocumentActions = {
  loadText: (text: string, sourceName: string) => void
  loadFile: (file: File) => Promise<void>
  clear: () => void
}

const emptyState: DocumentState = {
  status: "empty",
  sourceName: null,
  text: null,
  document: null,
  error: null,
  searchWorkerReady: false,
}

let loadVersion = 0

function isCurrent(version: number): boolean {
  return version === loadVersion
}

function parseText(
  text: string,
): Promise<{ readonly result: ReturnType<typeof parseJson>; readonly worker: boolean }> {
  if (new TextEncoder().encode(text).byteLength < LARGE_DOCUMENT_BYTES) {
    return Promise.resolve({ result: parseJson(text), worker: false })
  }

  return parseJsonInWorker(text).then((result) => ({ result, worker: true }))
}

export const useDocumentStore = create<DocumentState & DocumentActions>((set) => ({
  ...emptyState,
  loadText: (text, sourceName) => {
    const version = loadVersion + 1
    loadVersion = version

    if (new TextEncoder().encode(text).byteLength < LARGE_DOCUMENT_BYTES) {
      clearJsonWorker()
      const result = parseJson(text)
      if (result.ok) {
        set({
          status: "ready",
          sourceName,
          text,
          document: result.document,
          error: null,
          searchWorkerReady: false,
        })
        return
      }
      set({
        status: "error",
        sourceName,
        text,
        document: null,
        error: { kind: "parse", message: result.message },
        searchWorkerReady: false,
      })
      return
    }

    set({
      status: "reading",
      sourceName,
      text,
      document: null,
      error: null,
      searchWorkerReady: false,
    })
    void parseText(text).then(
      ({ result, worker }) => {
        if (!isCurrent(version)) {
          return
        }
        if (result.ok) {
          set({
            status: "ready",
            sourceName,
            text,
            document: result.document,
            error: null,
            searchWorkerReady: worker,
          })
          return
        }
        set({
          status: "error",
          sourceName,
          text,
          document: null,
          error: { kind: "parse", message: result.message },
          searchWorkerReady: false,
        })
      },
      () => {
        if (!isCurrent(version)) {
          return
        }
        set({
          status: "error",
          sourceName,
          text,
          document: null,
          error: { kind: "read", message: "Could not process this document." },
          searchWorkerReady: false,
        })
      },
    )
  },
  loadFile: async (file) => {
    const version = loadVersion + 1
    loadVersion = version
    set({
      status: "reading",
      error: null,
      sourceName: file.name,
      document: null,
      searchWorkerReady: false,
    })
    try {
      const text = await file.text()
      if (!isCurrent(version)) {
        return
      }
      const { result, worker } = await parseText(text)
      if (!isCurrent(version)) {
        return
      }
      if (result.ok) {
        set({
          status: "ready",
          sourceName: file.name,
          text,
          document: result.document,
          error: null,
          searchWorkerReady: worker,
        })
        return
      }
      set({
        status: "error",
        sourceName: file.name,
        text,
        document: null,
        error: { kind: "parse", message: result.message },
        searchWorkerReady: false,
      })
    } catch {
      if (!isCurrent(version)) {
        return
      }
      set({
        status: "error",
        sourceName: file.name,
        text: null,
        document: null,
        error: { kind: "read", message: "Could not read this file." },
        searchWorkerReady: false,
      })
    }
  },
  clear: () => {
    loadVersion += 1
    clearJsonWorker()
    set(emptyState)
  },
}))
