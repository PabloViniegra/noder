import { beforeEach, describe, expect, it } from "vitest"
import { useDocumentStore } from "./store"

describe("document store", () => {
  beforeEach(() => {
    useDocumentStore.getState().clear()
  })

  it("loads valid JSON from text", () => {
    useDocumentStore.getState().loadText('{"id": 1}', "payload.json")
    const state = useDocumentStore.getState()
    expect(state.status).toBe("ready")
    expect(state.sourceName).toBe("payload.json")
    expect(state.error).toBeNull()
  })

  it("keeps the empty surface on invalid JSON", () => {
    useDocumentStore.getState().loadText("{", "broken.json")
    const state = useDocumentStore.getState()
    expect(state.status).toBe("error")
    expect(state.text).toBe("{")
    expect(state.error).not.toBeNull()
  })
})
