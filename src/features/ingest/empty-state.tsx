import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { summarizeJson, type JsonSummary } from "@/core/json/summarize"
import { useDocumentStore, type DocumentError } from "@/features/document/store"
import { GlassFilter, GlassLayers } from "@/features/ingest/glass-lens"
import { StructuralField } from "@/features/ingest/structural-field"
import { cn } from "@/lib/utils"

const PREVIEW_LIMIT = 1_000_000
const isMac = /mac/i.test(navigator.userAgent)
const EMPTY_STATE_LINE_ID = "noder-line"
const EMPTY_STATE_ERROR_ID = "noder-error"

const SUMMARY_TONE = {
  object: "text-ink-muted",
  array: "text-ink-muted",
  string: "text-json-string",
  number: "text-json-number",
  boolean: "text-json-boolean",
  null: "text-json-null",
}

function countLabel(summary: Extract<JsonSummary, { count: number }>): string {
  const noun = summary.kind === "object" ? "key" : "item"
  return `${summary.count} ${summary.count === 1 ? noun : `${noun}s`}`
}

function previewSummary(draft: string): JsonSummary | null {
  const text = draft.trim()
  if (text.length === 0 || text.length > PREVIEW_LIMIT) {
    return null
  }
  return summarizeJson(text)
}

type LoadFile = (file: File) => Promise<void>

function ingestFile(file: File, loadFile: LoadFile, setDraft: (draft: string) => void) {
  void loadFile(file).then(() => {
    const next = useDocumentStore.getState()
    if (next.status === "error" && next.text !== null) {
      setDraft(next.text)
    }
  })
}

type EmptyStateContentProps = {
  readonly chromeRef: RefObject<HTMLElement | null>
  readonly wellRef: RefObject<HTMLElement | null>
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly jsonRef: RefObject<HTMLTextAreaElement | null>
  readonly dragging: boolean
  readonly busy: boolean
  readonly hasDraft: boolean
  readonly draft: string
  readonly summary: JsonSummary | null
  readonly showSummary: boolean
  readonly shownError: DocumentError | null
  readonly onDragEnter: (event: DragEvent<HTMLDivElement>) => void
  readonly onDragOver: (event: DragEvent<HTMLDivElement>) => void
  readonly onDragLeave: (event: DragEvent<HTMLDivElement>) => void
  readonly onDrop: (event: DragEvent<HTMLDivElement>) => void
  readonly onPointerLeave: () => void
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  readonly onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  readonly onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  readonly onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  readonly onOpen: () => void
  readonly onOpenFile: () => void
  readonly onPasteClick: () => void
}

function EmptyStateIntro({
  dragging,
  shownError,
}: Pick<EmptyStateContentProps, "dragging" | "shownError">) {
  return (
    <div className="flex flex-col gap-2">
      <h1 id="noder-title" className="font-heading text-title text-balance text-ink">
        Drop JSON here
      </h1>
      <p id={EMPTY_STATE_LINE_ID} className="text-body text-pretty text-ink-muted">
        {dragging
          ? "Drop JSON to open — it never leaves this browser."
          : "It never leaves this browser."}
      </p>
      {shownError !== null && (
        <div id={EMPTY_STATE_ERROR_ID} role="alert" className="flex flex-col gap-1">
          <p className="text-body text-pretty text-destructive">
            {shownError.kind === "read"
              ? "That file could not be read. Try another one."
              : "This isn't valid JSON. Drop, paste, or open another file."}
          </p>
          <p className="font-mono text-caption text-pretty text-ink-muted">
            {shownError.message}
          </p>
        </div>
      )}
    </div>
  )
}

type JsonDraftFieldProps = Pick<
  EmptyStateContentProps,
  | "jsonRef"
  | "busy"
  | "draft"
  | "summary"
  | "showSummary"
  | "shownError"
  | "dragging"
  | "onDraftChange"
  | "onDraftKeyDown"
>

function JsonDraftField({
  jsonRef,
  busy,
  draft,
  summary,
  showSummary,
  shownError,
  dragging,
  onDraftChange,
  onDraftKeyDown,
}: JsonDraftFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={jsonRef}
        id="json-input"
        aria-label="JSON"
        aria-describedby={
          shownError === null
            ? EMPTY_STATE_LINE_ID
            : `${EMPTY_STATE_LINE_ID} ${EMPTY_STATE_ERROR_ID}`
        }
        aria-invalid={shownError !== null}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={busy}
        placeholder={"{\n\n}"}
        value={draft}
        onChange={onDraftChange}
        onKeyDown={onDraftKeyDown}
        className={cn(
          "min-h-28 w-full resize-none rounded-lg bg-canvas px-4 py-3 font-mono text-base text-ink caret-primary-hover outline-none transition-[border-color] duration-150 placeholder:text-json-punctuation sm:min-h-36 sm:text-code",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:opacity-50",
          shownError !== null ? "border border-destructive" : "border border-hairline",
          dragging && shownError === null && "border-hairline-strong",
        )}
      />
      <p
        className={cn(
          "flex h-4 items-center gap-1.5 font-mono text-caption transition-[opacity,translate] duration-200 ease-ui motion-reduce:transition-opacity motion-reduce:translate-y-0",
          showSummary ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-0",
        )}
      >
        {showSummary && summary !== null && (
          <>
            <span className={SUMMARY_TONE[summary.kind]}>{summary.kind}</span>
            {"count" in summary && (
              <>
                <span className="text-json-punctuation">·</span>
                <span className="text-ink-subtle">{countLabel(summary)}</span>
              </>
            )}
          </>
        )}
      </p>
    </div>
  )
}

type IngestActionsProps = Pick<
  EmptyStateContentProps,
  | "inputRef"
  | "busy"
  | "hasDraft"
  | "onFileChange"
  | "onOpen"
  | "onOpenFile"
  | "onPasteClick"
>

function IngestActions({
  inputRef,
  busy,
  hasDraft,
  onFileChange,
  onOpen,
  onOpenFile,
  onPasteClick,
}: IngestActionsProps) {
  return (
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
      {hasDraft && (
        <Button className="h-11 w-full sm:h-8 sm:w-auto" disabled={busy} onClick={onOpen}>
          {busy ? (
            <>
              <Spinner data-icon="inline-start" />
              Opening…
            </>
          ) : (
            "Open"
          )}
        </Button>
      )}
      <Button
        variant={hasDraft ? "outline" : "default"}
        className="h-11 w-full sm:h-8 sm:w-auto"
        disabled={busy}
        onClick={onOpenFile}
      >
        {busy && !hasDraft ? (
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
        {hasDraft ? (
          <>
            Enter to open
            <span aria-hidden className="text-json-punctuation">
              ·
            </span>
          </>
        ) : null}
        Paste
        <KbdGroup>
          <Kbd>{isMac ? "Cmd" : "Ctrl"}</Kbd>
          <Kbd>V</Kbd>
        </KbdGroup>
      </p>
    </div>
  )
}

function EmptyStateContent({
  chromeRef,
  wellRef,
  inputRef,
  jsonRef,
  dragging,
  busy,
  hasDraft,
  draft,
  summary,
  showSummary,
  shownError,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onPointerLeave,
  onPointerMove,
  onDraftChange,
  onDraftKeyDown,
  onFileChange,
  onOpen,
  onOpenFile,
  onPasteClick,
}: EmptyStateContentProps) {
  return (
    <div
      className="relative min-h-svh overflow-hidden bg-canvas"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <GlassFilter />
      <StructuralField dragging={dragging} />
      <header
        ref={chromeRef}
        className="glass-lens absolute inset-x-2 top-2 z-20 flex h-11 items-center rounded-xl px-3"
      >
        <GlassLayers />
        <img src="/logo.svg" alt="Noder" className="relative h-6 w-auto" />
        <span className="relative ml-2 font-mono text-caption text-ink-subtle">
          Local only
        </span>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 flex min-h-svh items-center justify-center px-4 pt-16 pb-8"
      >
        <section
          ref={wellRef}
          aria-labelledby="noder-title"
          aria-describedby={
            shownError === null
              ? EMPTY_STATE_LINE_ID
              : `${EMPTY_STATE_LINE_ID} ${EMPTY_STATE_ERROR_ID}`
          }
          data-dragging={dragging ? "true" : undefined}
          className="glass-lens relative w-full max-w-[640px] rounded-xl p-8"
        >
          <GlassLayers />
          <div className="relative flex flex-col gap-6">
            <EmptyStateIntro dragging={dragging} shownError={shownError} />
            <JsonDraftField
              jsonRef={jsonRef}
              busy={busy}
              draft={draft}
              summary={summary}
              showSummary={showSummary}
              shownError={shownError}
              dragging={dragging}
              onDraftChange={onDraftChange}
              onDraftKeyDown={onDraftKeyDown}
            />
            <IngestActions
              inputRef={inputRef}
              busy={busy}
              hasDraft={hasDraft}
              onFileChange={onFileChange}
              onOpen={onOpen}
              onOpenFile={onOpenFile}
              onPasteClick={onPasteClick}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

export function EmptyState() {
  const status = useDocumentStore((s) => s.status)
  const error = useDocumentStore((s) => s.error)
  const submitted = useDocumentStore((s) => s.text)
  const loadText = useDocumentStore((s) => s.loadText)
  const loadFile = useDocumentStore((s) => s.loadFile)
  const inputRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLTextAreaElement>(null)
  const chromeRef = useRef<HTMLElement>(null)
  const wellRef = useRef<HTMLElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [draft, setDraft] = useState("")
  const [summary, setSummary] = useState<JsonSummary | null>(null)
  const busy = status === "reading"
  const hasDraft = draft.trim().length > 0
  const settled = error === null || submitted === null || draft === submitted
  const shownError = settled ? error : null
  const showSummary = summary !== null && shownError === null && !busy

  function ingestText(text: string, sourceName: string) {
    if (text.trim().length === 0) {
      return
    }
    loadText(text, sourceName)
    setDraft(text)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setSummary(previewSummary(draft)), 160)
    return () => window.clearTimeout(timer)
  }, [draft])

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
        ingestFile(file, loadFile, setDraft)
        return
      }
      const text = data.getData("text")
      if (text.trim().length === 0) {
        return
      }
      event.preventDefault()
      loadText(text, "Pasted JSON")
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
      ingestFile(file, loadFile, setDraft)
      return
    }
    ingestText(event.dataTransfer.getData("text"), "Dropped JSON")
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0)
    event.currentTarget.value = ""
    if (file !== undefined && file !== null) {
      ingestFile(file, loadFile, setDraft)
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
    ingestText(draft, "Typed JSON")
  }

  function paintSpot(clientX: number, clientY: number) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }
    for (const el of [chromeRef.current, wellRef.current]) {
      if (el === null) {
        continue
      }
      const sheen = el.querySelector("[data-glass-sheen]")
      if (!(sheen instanceof HTMLElement)) {
        continue
      }
      const box = el.getBoundingClientRect()
      sheen.style.setProperty("--spot-x", `${((clientX - box.left) / box.width) * 100}%`)
      sheen.style.setProperty("--spot-y", `${((clientY - box.top) / box.height) * 100}%`)
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    paintSpot(event.clientX, event.clientY)
  }

  function onPointerLeave() {
    for (const el of [chromeRef.current, wellRef.current]) {
      const sheen = el?.querySelector("[data-glass-sheen]")
      if (sheen instanceof HTMLElement) {
        sheen.style.removeProperty("--spot-x")
        sheen.style.removeProperty("--spot-y")
      }
    }
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
        ingestText(text, "Pasted JSON")
      },
      () => {
        jsonRef.current?.focus()
      },
    )
  }

  return (
    <EmptyStateContent
      chromeRef={chromeRef}
      wellRef={wellRef}
      inputRef={inputRef}
      jsonRef={jsonRef}
      dragging={dragging}
      busy={busy}
      hasDraft={hasDraft}
      draft={draft}
      summary={summary}
      showSummary={showSummary}
      shownError={shownError}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onDraftChange={onDraftChange}
      onDraftKeyDown={onDraftKeyDown}
      onFileChange={onFileChange}
      onOpen={() => ingestText(draft, "Typed JSON")}
      onOpenFile={() => inputRef.current?.click()}
      onPasteClick={onPasteClick}
    />
  )
}
