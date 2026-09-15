import { create } from "zustand"
import { parseJson } from "@/core/json/parse"

export type DocumentStatus = "empty" | "reading" | "ready" | "error"

type DocumentState = {
  status: DocumentStatus
  sourceName: string | null
  text: string | null
  error: string | null
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
  error: null,
}

export const useDocumentStore = create<DocumentState & DocumentActions>((set) => ({
  ...emptyState,
  loadText: (text, sourceName) => {
    const result = parseJson(text)
    if (result.ok) {
      set({ status: "ready", sourceName, text, error: null })
      return
    }
    set({ status: "error", sourceName, text: null, error: result.message })
  },
  loadFile: async (file) => {
    set({ status: "reading", error: null, sourceName: file.name })
    try {
      const text = await file.text()
      const result = parseJson(text)
      if (result.ok) {
        set({ status: "ready", sourceName: file.name, text, error: null })
        return
      }
      set({
        status: "error",
        sourceName: file.name,
        text: null,
        error: result.message,
      })
    } catch {
      set({
        status: "error",
        sourceName: file.name,
        text: null,
        error: "Could not read this file.",
      })
    }
  },
  clear: () => set(emptyState),
}))
