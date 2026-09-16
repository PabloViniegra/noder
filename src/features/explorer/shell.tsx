import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDocumentStore } from "@/features/document/store"
import { TreeView } from "@/features/explorer/tree-view"

export function ExplorerShell() {
  const sourceName = useDocumentStore((s) => s.sourceName)
  const document = useDocumentStore((s) => s.document)
  const clear = useDocumentStore((s) => s.clear)

  return (
    <div className="relative min-h-svh overflow-x-clip bg-canvas">
      <header className="glass sticky top-2 z-20 mx-2 mt-2 flex h-11 items-center justify-between rounded-xl px-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="font-heading text-title-sm text-ink">Noder</h1>
          <span className="shrink-0 font-mono text-caption text-ink-subtle">Local only</span>
          {sourceName !== null && (
            <p className="truncate font-mono text-label text-ink-subtle">{sourceName}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11 shrink-0 sm:size-7"
          aria-label="Close document"
          onClick={clear}
        >
          <XIcon />
        </Button>
      </header>
      <main className="min-h-svh px-4 pt-4 pb-8">
        {document !== null && (
          <TreeView root={document.root} stats={document.stats} onCloseDocument={clear} />
        )}
      </main>
    </div>
  )
}
