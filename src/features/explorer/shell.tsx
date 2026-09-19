import { Dialog } from "@base-ui/react/dialog"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useDocumentStore } from "@/features/document/store"
import { TreeView } from "@/features/explorer/tree-view"

type ExplorerShellProps = {
  readonly initialCommandOpen: boolean
  readonly onMounted: () => void
}

type CloseDocumentDialogProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly sourceName: string | null
  readonly onConfirm: () => void
}

function CloseDocumentDialog({
  open,
  onOpenChange,
  sourceName,
  onConfirm,
}: CloseDocumentDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className="glass fixed top-1/2 left-1/2 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl p-4 outline-none"
          data-close-document-dialog
        >
          <Dialog.Title className="font-heading text-title-sm text-ink">
            Close this document?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-body text-pretty text-ink-subtle">
            {sourceName === null
              ? "This document isn't saved anywhere. Closing it clears your current view."
              : `“${sourceName}” isn't saved anywhere. Closing it clears your current view.`}
          </Dialog.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-7"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-h-7"
              onClick={onConfirm}
            >
              Close document
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ExplorerShell({ initialCommandOpen, onMounted }: ExplorerShellProps) {
  const sourceName = useDocumentStore((s) => s.sourceName)
  const document = useDocumentStore((s) => s.document)
  const searchWorkerReady = useDocumentStore((s) => s.searchWorkerReady)
  const clear = useDocumentStore((s) => s.clear)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  useEffect(() => {
    onMounted()
  }, [onMounted])

  return (
    <>
      {document !== null && (
        <TreeView
          root={document.root}
          stats={document.stats}
          searchWorkerReady={searchWorkerReady}
          initialCommandOpen={initialCommandOpen}
          onCloseDocument={() => setConfirmCloseOpen(true)}
        />
      )}
      <CloseDocumentDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        sourceName={sourceName}
        onConfirm={() => {
          clear()
          setConfirmCloseOpen(false)
        }}
      />
    </>
  )
}
