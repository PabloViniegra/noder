import { Dialog } from "@base-ui/react/dialog"
import { ArrowRightIcon, XIcon } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"

type JsonPathDialogProps = {
  readonly open: boolean
  readonly initialPath: string
  readonly onOpenChange: (open: boolean) => void
  readonly onNavigate: (input: string) => string | null
}

export function JsonPathDialog({
  open,
  initialPath,
  onOpenChange,
  onNavigate,
}: JsonPathDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const skipFinalFocusRef = useRef(false)
  const [value, setValue] = useState(initialPath)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextError = onNavigate(value)
    if (nextError === null) {
      skipFinalFocusRef.current = true
      onOpenChange(false)
      return
    }
    setError(nextError)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          initialFocus={inputRef}
          finalFocus={() => {
            if (skipFinalFocusRef.current) {
              skipFinalFocusRef.current = false
              return false
            }
            return true
          }}
          className="glass fixed top-1/2 left-1/2 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl p-4 outline-none"
          data-json-path-dialog
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-title-sm text-ink">
                Go to JSONPath
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-body text-ink-subtle">
                Jump to a node in the document.
              </Dialog.Description>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-11 shrink-0 sm:size-7"
              aria-label="Close JSONPath dialog"
              onClick={() => onOpenChange(false)}
            >
              <XIcon aria-hidden />
            </Button>
          </div>
          <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
            <label htmlFor="json-path-input" className="text-label font-medium text-ink">
              JSONPath
            </label>
            <div className="flex items-center gap-2">
              <input
                id="json-path-input"
                ref={inputRef}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(event) => setValue(event.currentTarget.value)}
                aria-invalid={error !== null}
                aria-describedby={error === null ? "json-path-hint" : "json-path-error"}
                className="h-11 min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-2.5 font-mono text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 sm:h-8 sm:text-code"
                placeholder="$.users[0].profile"
              />
              <Button type="submit" size="sm" className="h-11 sm:h-7">
                <ArrowRightIcon data-icon="inline-start" aria-hidden />
                Go
              </Button>
            </div>
            {error === null ? (
              <p id="json-path-hint" className="text-caption text-ink-subtle">
                Examples: $.users[0] · $[&quot;user-name&quot;]
              </p>
            ) : (
              <p id="json-path-error" role="alert" className="text-caption text-destructive">
                {error}
              </p>
            )}
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
