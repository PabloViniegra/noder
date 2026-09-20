import { lazy, Suspense, useEffect, useState } from "react"
import { useDocumentStore } from "@/features/document/store"
import { EmptyState } from "@/features/ingest/empty-state"

const ExplorerShell = lazy(() =>
  import("@/features/explorer/shell").then(({ ExplorerShell: Component }) => ({
    default: Component,
  })),
)

export default function App() {
  const ready = useDocumentStore((s) => s.status === "ready")
  const [commandRequested, setCommandRequested] = useState(false)

  useEffect(() => {
    if (!ready) {
      return
    }

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (document.querySelector("[data-command-trigger]") !== null) {
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandRequested(true)
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [ready])

  return ready ? (
    <Suspense fallback={<div className="min-h-svh bg-canvas" aria-busy="true" />}>
      <div className="enter-fade">
        <ExplorerShell
          initialCommandOpen={commandRequested}
          onMounted={() => {
            setCommandRequested(false)
          }}
        />
      </div>
    </Suspense>
  ) : (
    <EmptyState />
  )
}
