import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useDocumentStore } from "@/features/document/store"

type ErrorBoundaryProps = {
  readonly children: ReactNode
}

type ErrorBoundaryState = {
  readonly error: Error | null
}

// A render crash would otherwise blank the page and strand the user's session.
export class DocumentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    const { error } = this.state
    if (error === null) {
      return this.props.children
    }

    return (
      <div
        role="alert"
        className="flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center"
      >
        <h1 className="font-heading text-title text-ink">Something went wrong</h1>
        <p className="max-w-md text-body text-pretty text-ink-muted">
          The explorer hit an unexpected error. Closing the document returns you to a clean
          state; your data never left this browser.
        </p>
        <Button
          onClick={() => {
            useDocumentStore.getState().clear()
            this.setState({ error: null })
          }}
        >
          Close document
        </Button>
      </div>
    )
  }
}
