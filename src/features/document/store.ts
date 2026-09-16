import { create } from "zustand"
import { parseJson } from "@/core/json/parse"
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
}

export const useDocumentStore = create<DocumentState & DocumentActions>((set) => ({
  ...emptyState,
  loadText: (text, sourceName) => {
    const result = parseJson(text)
    if (result.ok) {
      set({ status: "ready", sourceName, text, document: result.document, error: null })
      return
    }
    set({
      status: "error",
      sourceName,
      text,
      document: null,
      error: { kind: "parse", message: result.message },
    })
  },
  loadFile: async (file) => {
    set({ status: "reading", error: null, sourceName: file.name, document: null })
    try {
      const text = await file.text()
      const result = parseJson(text)
      if (result.ok) {
        set({
          status: "ready",
          sourceName: file.name,
          text,
          document: result.document,
          error: null,
        })
        return
      }
      set({
        status: "error",
        sourceName: file.name,
        text,
        document: null,
        error: { kind: "parse", message: result.message },
      })
    } catch {
      set({
        status: "error",
        sourceName: file.name,
        text: null,
        document: null,
        error: { kind: "read", message: "Could not read this file." },
      })
    }
  },
  clear: () => set(emptyState),
}))
