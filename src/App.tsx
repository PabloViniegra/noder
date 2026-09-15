import { useDocumentStore } from "@/features/document/store"
import { ExplorerShell } from "@/features/explorer/shell"
import { EmptyState } from "@/features/ingest/empty-state"

export default function App() {
  const ready = useDocumentStore((s) => s.status === "ready")
  return ready ? <ExplorerShell /> : <EmptyState />
}
