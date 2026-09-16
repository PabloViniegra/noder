import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDocumentStore } from "@/features/document/store"
import { TreeView } from "@/features/explorer/tree-view"

export function ExplorerShell() {
  const sourceName = useDocumentStore((s) => s.sourceName)
  const document = useDocumentStore((s) => s.document)
  const clear = useDocumentStore((s) => s.clear)

  return (
    <div className="relative min-h-svh bg-canvas">
      <header className="glass absolute inset-x-2 top-2 z-20 flex h-11 items-center justify-between rounded-xl px-3">
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
      <main className="min-h-svh px-4 pt-20 pb-8">
        {document !== null && (
          <TreeView root={document.root} stats={document.stats} onCloseDocument={clear} />
        )}
      </main>
    </div>
  )
}
