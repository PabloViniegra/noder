import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react"
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
  const jsonRef = useRef<HTMLTextAreaElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [draft, setDraft] = useState("")
  const busy = status === "reading"

  function ingestFile(file: File) {
    void loadFile(file).then(() => {
      const next = useDocumentStore.getState()
      if (next.status === "error" && next.text !== null) {
        setDraft(next.text)
      }
    })
  }

  function ingestText(text: string, sourceName: string) {
    if (text.trim().length === 0) {
      return
    }
    loadText(text, sourceName)
    setDraft(text)
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
      setDraft(text)
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

  function onDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.currentTarget.value)
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || busy) {
      return
    }
    event.preventDefault()
    ingestText(draft, "typed")
  }

  function onPasteClick() {
    if (busy) {
      return
    }
    if (navigator.clipboard?.readText === undefined) {
      jsonRef.current?.focus()
      return
    }
    void navigator.clipboard.readText().then(
      (text) => {
        ingestText(text, "clipboard")
      },
      () => {
        jsonRef.current?.focus()
      },
    )
  }

  const lineId = "noder-line"
  const errorId = "noder-error"

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
          aria-describedby={error === null ? lineId : `${lineId} ${errorId}`}
          className="glass flex w-full max-w-[640px] flex-col gap-6 rounded-xl bg-surface-high/80 p-8"
        >
          <div className="flex flex-col gap-2">
            <h1 id="noder-title" className="text-title font-semibold tracking-tight text-ink">
              Open JSON
            </h1>
            <p id={lineId} className="font-mono text-body text-ink-subtle">
              {dragging
                ? "Drop JSON to open — it never leaves this browser."
                : "It never leaves this browser."}
            </p>
            {error !== null && (
              <div id={errorId} role="alert" className="flex flex-col gap-1">
                <p className="font-mono text-caption text-destructive">
                  This isn't valid JSON. Drop, paste, or open another file.
                </p>
                <p className="font-mono text-caption text-ink-subtle">{error}</p>
              </div>
            )}
          </div>
          <textarea
            ref={jsonRef}
            id="json-input"
            aria-labelledby="noder-title"
            aria-describedby={error === null ? lineId : `${lineId} ${errorId}`}
            aria-invalid={error !== null}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
            placeholder={"{\n\n}"}
            value={draft}
            onChange={onDraftChange}
            onKeyDown={onDraftKeyDown}
            className={cn(
              "min-h-28 w-full resize-none rounded-lg bg-canvas px-4 py-3 font-mono text-code text-ink outline-none transition-[border-color] duration-150 placeholder:text-json-punctuation sm:min-h-36",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
              "disabled:opacity-50",
              error !== null ? "border border-destructive" : "border border-hairline",
              dragging && error === null && "border-hairline-strong",
            )}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              id="json-file"
              type="file"
              accept="application/json,.json"
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              disabled={busy}
              onChange={onFileChange}
            />
            <Button
              className="h-11 w-full sm:h-8 sm:w-auto"
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
            <Button
              variant="outline"
              className="h-11 w-full sm:hidden"
              disabled={busy}
              onClick={onPasteClick}
            >
              Paste
            </Button>
            <p className="pointer-events-none hidden font-mono text-caption text-ink-subtle sm:flex sm:flex-wrap sm:items-center sm:gap-2">
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
