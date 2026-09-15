import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDocumentStore } from "@/features/document/store"

export function ExplorerShell() {
  const sourceName = useDocumentStore((s) => s.sourceName)
  const clear = useDocumentStore((s) => s.clear)

  return (
    <div className="relative min-h-svh bg-canvas">
      <header className="glass absolute inset-x-2 top-2 flex h-11 items-center justify-between rounded-xl px-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="font-heading text-title-sm text-ink">Noder</h1>
          {sourceName !== null && (
            <p className="truncate font-mono text-label text-ink-subtle">{sourceName}</p>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close document" onClick={clear}>
          <XIcon />
        </Button>
      </header>
    </div>
  )
}
