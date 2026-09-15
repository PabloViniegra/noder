import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { useDocumentStore } from "@/features/document/store"
import { cn } from "@/lib/utils"

export function EmptyState() {
  const status = useDocumentStore((s) => s.status)
  const error = useDocumentStore((s) => s.error)
  const loadText = useDocumentStore((s) => s.loadText)
  const loadFile = useDocumentStore((s) => s.loadFile)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const busy = status === "reading"

  function ingestFile(file: File) {
    void loadFile(file)
  }

  function ingestText(text: string, sourceName: string) {
    if (text.trim().length === 0) {
      return
    }
    loadText(text, sourceName)
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (busy) {
        return
      }
      const data = event.clipboardData
      if (data === null) {
        return
      }
      const file = data.files.item(0)
      if (file !== null) {
        event.preventDefault()
        void loadFile(file)
        return
      }
      const text = data.getData("text")
      if (text.trim().length === 0) {
        return
      }
      event.preventDefault()
      loadText(text, "clipboard")
    }

    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [busy, loadFile, loadText])

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (busy) {
      return
    }
    const file = event.dataTransfer.files.item(0)
    if (file !== null) {
      ingestFile(file)
      return
    }
    ingestText(event.dataTransfer.getData("text"), "drop")
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0)
    event.currentTarget.value = ""
    if (file !== undefined && file !== null) {
      ingestFile(file)
    }
  }

  return (
    <div
      className="relative min-h-svh bg-canvas"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="glass absolute inset-x-2 top-2 flex h-11 items-center rounded-xl px-3">
        <p className="text-label font-medium text-ink">Noder</p>
      </header>
      <main className="flex min-h-svh items-center justify-center px-4 pt-16 pb-8">
        <section
          aria-labelledby="noder-title"
          aria-describedby={error === null ? "noder-line" : "noder-line noder-error"}
          className={cn(
            "glass flex min-h-52 w-full max-w-[640px] flex-col gap-6 rounded-xl p-8 transition-[box-shadow] duration-150",
            dragging && "ring-2 ring-ring/40",
          )}
        >
          <div className="flex flex-col gap-2">
            <h1 id="noder-title" className="text-title font-semibold tracking-tight text-ink">
              Noder
            </h1>
            <p id="noder-line" className="font-mono text-body text-ink-subtle">
              {dragging
                ? "Drop to open — it never leaves this browser."
                : "Drop, paste, or open a file — it never leaves this browser."}
            </p>
            {error !== null && (
              <p
                id="noder-error"
                role="alert"
                className="font-mono text-caption text-destructive"
              >
                This isn't valid JSON. {error}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              id="json-file"
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={busy}
              onChange={onFileChange}
            />
            <Button
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Opening…
                </>
              ) : (
                "Open file"
              )}
            </Button>
            <p className="flex flex-wrap items-center gap-2 font-mono text-caption text-ink-subtle">
              Paste
              <KbdGroup>
                <Kbd>Cmd</Kbd>
                <Kbd>V</Kbd>
              </KbdGroup>
              <span>/</span>
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>V</Kbd>
              </KbdGroup>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
