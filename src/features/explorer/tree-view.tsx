import { useVirtualizer } from "@tanstack/react-virtual"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CommandIcon,
  CopyIcon,
  FocusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import type {
  JsonArrayNode,
  JsonNode,
  JsonNodeKind,
  JsonObjectNode,
  JsonPath,
  JsonStats,
} from "@/core/json/types"
import {
  formatJsonPath,
  isJsonPathWithin,
  jsonPathsEqual,
  parseJsonPath,
  parentJsonPath,
  serializeJsonPath,
} from "@/core/json/path"
import {
  flattenVisibleNodes,
  getJsonChildPosition,
  getJsonNodeAtPath,
  isJsonContainerNode,
} from "@/core/json/traverse"
import { formatJsonCode } from "@/core/json/format"
import { searchJson } from "@/core/json/search"
import { CodeView } from "@/features/explorer/code-view"
import { CommandPalette } from "@/features/explorer/command-palette"
import { JsonPathDialog } from "@/features/explorer/json-path-dialog"
import { StructuralMinimap } from "@/features/explorer/structural-minimap"
import { useDocumentStore } from "@/features/document/store"
import { cn } from "@/lib/utils"

type ContainerNode = JsonObjectNode | JsonArrayNode
type CopyStatus = "idle" | "copied" | "error"
type ExplorerView = "tree" | "code"
type TreeItemPosition = {
  readonly positionInSet: number
  readonly setSize: number
}

type TreeViewProps = {
  readonly root: JsonNode
  readonly stats: JsonStats
  readonly onCloseDocument: () => void
}

type TreeRowProps = {
  readonly node: JsonNode
  readonly expanded: boolean
  readonly selected: boolean
  readonly matched: boolean
  readonly currentMatch: boolean
  readonly hiddenMatchCount: number
  readonly level: number
  readonly positionInSet: number
  readonly setSize: number
  readonly onToggle: () => void
  readonly onSelect: () => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  readonly rowRef: (element: HTMLDivElement | null) => void
  readonly index: number
  readonly style: CSSProperties
}

type BreadcrumbsProps = {
  readonly path: JsonPath
  readonly onNavigate: (path: JsonPath) => void
}

type DocumentStatsProps = {
  readonly stats: JsonStats
}

function kindClass(kind: JsonNodeKind): string {
  switch (kind) {
    case "string":
      return "text-json-string"
    case "number":
      return "text-json-number"
    case "boolean":
      return "text-json-boolean"
    case "null":
      return "text-json-null"
    case "object":
    case "array":
      return "text-ink-muted"
  }
}

function nodeName(node: JsonNode): string {
  if (node.key === null) {
    return "root"
  }
  return Object.prototype.toString.call(node.key) === "[object Number]"
    ? `[${node.key}]`
    : String(node.key)
}

function containerSummary(node: ContainerNode): string {
  const count = node.children.length
  if (node.kind === "object") {
    return `{${count} ${count === 1 ? "key" : "keys"}}`
  }
  return `[${count} ${count === 1 ? "item" : "items"}]`
}

function scalarValue(node: JsonNode): string {
  switch (node.kind) {
    case "string":
      return JSON.stringify(node.value)
    case "number":
    case "boolean":
      return String(node.value)
    case "null":
      return "null"
    case "object":
    case "array":
      return ""
  }
}

function treeItemPosition(
  root: JsonNode,
  treeRoot: JsonNode,
  node: JsonNode,
): TreeItemPosition {
  if (jsonPathsEqual(node.path, treeRoot.path)) {
    return { positionInSet: 1, setSize: 1 }
  }

  const parentPath = parentJsonPath(node.path)
  const parent = parentPath === null ? null : getJsonNodeAtPath(root, parentPath)
  if (parent === null || !isJsonContainerNode(parent)) {
    return { positionInSet: 1, setSize: 1 }
  }

  const position = getJsonChildPosition(parent, node)
  return {
    positionInSet: position === -1 ? 1 : position + 1,
    setSize: parent.children.length,
  }
}

function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  let currentPath: JsonPath = []
  const items: Array<{ readonly label: string; readonly path: JsonPath }> = [
    { label: "root", path: [] },
  ]

  for (const segment of path) {
    currentPath = [...currentPath, segment]
    items.push({ label: String(segment), path: currentPath })
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto p-0 font-mono text-caption text-ink-subtle">
        {items.map((item, index) => {
          const current = index === items.length - 1
          return (
            <li key={serializeJsonPath(item.path)} className="flex shrink-0 items-center gap-1">
              {current ? (
                <span aria-current="page" className="text-ink">
                  {item.label}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => onNavigate(item.path)}
                  className="h-6 px-1 font-mono text-caption text-ink-subtle hover:text-ink"
                >
                  {item.label}
                </Button>
              )}
              {!current && <span aria-hidden>/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function searchCountLabel(count: number, currentIndex: number, visibleCount: number): string {
  if (count === 0) {
    return "No matches"
  }
  const countLabel = `${count} ${count === 1 ? "match" : "matches"}`
  if (currentIndex !== -1) {
    return `${currentIndex + 1} of ${countLabel}`
  }
  return visibleCount === 0 ? `${countLabel} — in collapsed branches` : countLabel
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ["KB", "MB", "GB"]
  let value = bytes
  let unitIndex = -1
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function DocumentStats({ stats }: DocumentStatsProps) {
  const metrics = [
    { key: "bytes", label: "Size", value: formatBytes(stats.bytes) },
    { key: "nodes", label: "Nodes", value: String(stats.nodes) },
    { key: "objects", label: "Objects", value: String(stats.objects) },
    { key: "arrays", label: "Arrays", value: String(stats.arrays) },
    { key: "maxDepth", label: "Max depth", value: String(stats.maxDepth) },
  ] as const

  return (
    <section
      aria-labelledby="document-stats-title"
      data-document-stats
      className="overflow-hidden rounded-md border border-hairline"
    >
      <h3 id="document-stats-title" className="sr-only">
        Document statistics
      </h3>
      <dl className="flex gap-px overflow-x-auto bg-hairline sm:grid sm:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="flex min-w-28 shrink-0 flex-col gap-1 bg-surface px-3 py-2 sm:min-w-0 sm:last:col-span-1"
          >
            <dt className="text-caption text-ink-subtle">{metric.label}</dt>
            <dd
              data-stat={metric.key}
              className="truncate font-mono text-label font-medium tabular-nums text-ink"
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function TreeRow({
  node,
  expanded,
  selected,
  matched,
  currentMatch,
  hiddenMatchCount,
  level,
  positionInSet,
  setSize,
  onToggle,
  onSelect,
  onKeyDown,
  rowRef,
  index,
  style,
}: TreeRowProps) {
  const container = isJsonContainerNode(node)
  const expandable = container && node.children.length > 0
  const label = nodeName(node)

  return (
    <li data-index={index} role="none" style={style}>
      <div
        ref={rowRef}
        role="treeitem"
        aria-level={level}
        aria-posinset={positionInSet}
        aria-setsize={setSize}
        aria-selected={selected}
        aria-current={currentMatch ? "true" : undefined}
        aria-expanded={expandable ? expanded : undefined}
        data-search-match={matched ? "true" : undefined}
        data-search-current={currentMatch ? "true" : undefined}
        tabIndex={selected ? 0 : -1}
        onClick={(event: MouseEvent<HTMLDivElement>) => {
          const disclosure =
            event.target instanceof Element
              ? event.target.closest("[data-tree-disclosure]")
              : null
          if (expandable && disclosure !== null) {
            onToggle()
            return
          }
          onSelect()
        }}
        onFocus={onSelect}
        onKeyDown={onKeyDown}
        className={cn(
          "group flex min-h-7 w-full min-w-0 items-center overflow-hidden rounded-sm px-1 outline-none transition-colors",
          selected
            ? "bg-selection text-ink shadow-[inset_2px_0_0_var(--primary-hover)] hover:bg-selection"
            : matched
              ? "bg-primary/10 hover:bg-primary/15"
              : "hover:bg-surface-raised focus-visible:bg-selection",
          currentMatch && "ring-1 ring-primary/60",
          "focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
        style={{ paddingInlineStart: `${node.depth * 16 + 4}px` }}
        >
        <span
          aria-hidden
          className={cn(
            "mr-1 size-1.5 shrink-0 rounded-full",
            matched ? (currentMatch ? "bg-primary-hover" : "bg-primary/70") : "bg-transparent",
          )}
        />
        {expandable ? (
          <span
            aria-hidden
            data-tree-disclosure
            className="mr-1 flex size-6 shrink-0 items-center justify-center text-ink-subtle transition-colors group-hover:text-ink"
          >
            {expanded ? <ChevronDownIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
          </span>
        ) : (
          <span aria-hidden className="mr-1 inline-block size-6 shrink-0" />
        )}
        <span className="min-w-0 max-w-[45%] truncate text-json-key" title={label}>
          {label}
        </span>
        {node.key !== null && <span className="text-json-punctuation">:</span>}
        {container ? (
          <>
            <span className={cn("ml-2 min-w-0 truncate", kindClass(node.kind))}>
              {containerSummary(node)}
            </span>
            {!expanded && hiddenMatchCount > 0 && (
              <span
                data-hidden-matches={hiddenMatchCount}
                title={`${hiddenMatchCount} hidden ${
                  hiddenMatchCount === 1 ? "match" : "matches"
                } in this branch`}
                className="ml-2 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 px-1 font-mono text-caption tabular-nums text-primary-hover"
              >
                {hiddenMatchCount}
              </span>
            )}
          </>
        ) : (
          <span
            className={cn("ml-2 min-w-0 flex-1 truncate", kindClass(node.kind))}
            title={scalarValue(node)}
          >
            {scalarValue(node)}
          </span>
        )}
      </div>
    </li>
  )
}

function ViewSwitch({
  view,
  onChange,
}: {
  readonly view: ExplorerView
  readonly onChange: (view: ExplorerView) => void
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: ExplorerView) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return
    }
    event.preventDefault()
    onChange(current === "tree" ? "code" : "tree")
  }

  return (
    <div
      role="tablist"
      aria-label="Document view"
      className="inline-flex overflow-hidden rounded-md border border-hairline"
    >
      <Button
        type="button"
        id="view-tab-tree"
        role="tab"
        aria-selected={view === "tree"}
        aria-controls="json-tree-panel"
        variant="ghost"
        size="sm"
        className={cn(
          "min-h-11 rounded-none sm:min-h-7",
          view === "tree" && "bg-selection hover:bg-selection",
        )}
        onClick={() => onChange("tree")}
        onKeyDown={(event) => handleKeyDown(event, "tree")}
      >
        Tree
      </Button>
      <Button
        type="button"
        id="view-tab-code"
        role="tab"
        aria-selected={view === "code"}
        aria-controls="json-code-panel"
        variant="ghost"
        size="sm"
        className={cn(
          "min-h-11 rounded-none sm:min-h-7",
          view === "code" && "bg-selection hover:bg-selection",
        )}
        onClick={() => onChange("code")}
        onKeyDown={(event) => handleKeyDown(event, "code")}
      >
        Code
      </Button>
    </div>
  )
}

export function TreeView({ root, stats, onCloseDocument }: TreeViewProps) {
  const sourceName = useDocumentStore((s) => s.sourceName)
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const [focusedPath, setFocusedPath] = useState<JsonPath>(() => root.path)
  const [expandedNodes, setExpandedNodes] = useState<ReadonlySet<JsonNode>>(() => new Set([root]))
  const [selectedPath, setSelectedPath] = useState<JsonPath>(() => root.path)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const [searchQuery, setSearchQuery] = useState("")
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [pathDialogOpen, setPathDialogOpen] = useState(false)
  const [view, setView] = useState<ExplorerView>("tree")
  const focusedNode = getJsonNodeAtPath(root, focusedPath) ?? root
  const visibleNodes = useMemo(
    () => flattenVisibleNodes(focusedNode, expandedNodes),
    [expandedNodes, focusedNode],
  )
  const visibleIndexByNode = useMemo(() => {
    const index = new Map<JsonNode, number>()
    visibleNodes.forEach((node, nodeIndex) => {
      index.set(node, nodeIndex)
    })
    return index
  }, [visibleNodes])
  const searchMatches = useMemo(
    () => searchJson(focusedNode, searchQuery),
    [focusedNode, searchQuery],
  )
  const searchMatchNodes = useMemo(
    () => new Set(searchMatches.map((match) => match.node)),
    [searchMatches],
  )
  const searchMatchPaths = useMemo(
    () => new Set(searchMatches.map((match) => serializeJsonPath(match.node.path))),
    [searchMatches],
  )
  const visibleMatchCount = useMemo(
    () => searchMatches.filter((match) => visibleIndexByNode.has(match.node)).length,
    [searchMatches, visibleIndexByNode],
  )
  const hiddenMatchCountByPath = useMemo(() => {
    const counts = new Map<string, number>()
    for (const match of searchMatches) {
      let ancestorPath = parentJsonPath(match.node.path)
      while (ancestorPath !== null && isJsonPathWithin(ancestorPath, focusedNode.path)) {
        const ancestor = getJsonNodeAtPath(root, ancestorPath)
        if (ancestor !== null && isJsonContainerNode(ancestor) && !expandedNodes.has(ancestor)) {
          const key = serializeJsonPath(ancestor.path)
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
        ancestorPath = parentJsonPath(ancestorPath)
      }
    }
    return counts
  }, [searchMatches, expandedNodes, focusedNode.path, root])
  const codeLines = useMemo(
    () => (view === "code" ? formatJsonCode(focusedNode) : []),
    [focusedNode, view],
  )
  const selectedMatchIndex = searchMatches.findIndex((match) =>
    jsonPathsEqual(match.node.path, selectedPath),
  )
  const selectedNode = getJsonNodeAtPath(root, selectedPath) ?? focusedNode
  const selectedIndex = visibleIndexByNode.get(selectedNode) ?? -1
  const focusedPathKey = serializeJsonPath(focusedPath)
  const selectedPathKey = serializeJsonPath(selectedPath)
  const canFocusSelected =
    isJsonContainerNode(selectedNode) && selectedPathKey !== focusedPathKey
  const rowVirtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 28,
    getItemKey: (index) => {
      const node = visibleNodes[index]
      return node === undefined ? index : serializeJsonPath(node.path)
    },
    overscan: 8,
    paddingStart: 8,
    paddingEnd: 8,
  })

  useEffect(() => {
    if (view !== "tree" || selectedIndex === -1) {
      return
    }

    rowVirtualizer.scrollToIndex(selectedIndex, { align: "auto" })
    const focusFrame = window.requestAnimationFrame(() => {
      rowRefs.current.get(selectedPathKey)?.focus()
    })
    return () => window.cancelAnimationFrame(focusFrame)
  }, [rowVirtualizer, selectedIndex, selectedPathKey, view])

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        if (pathDialogOpen) {
          return
        }
        setPaletteOpen(true)
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [pathDialogOpen])

  function setRowRef(path: string, element: HTMLDivElement | null) {
    if (element === null) {
      rowRefs.current.delete(path)
    } else {
      rowRefs.current.set(path, element)
    }
  }

  function selectPath(path: JsonPath) {
    setSelectedPath(path)
    setCopyStatus("idle")
  }

  function focusPath(path: JsonPath) {
    const node = getJsonNodeAtPath(root, path) ?? root
    setFocusedPath(node.path)
    setExpandedNodes(new Set([node]))
    setSelectedPath(node.path)
    setCopyStatus("idle")
  }

  function focusSelectedNode() {
    if (!canFocusSelected) {
      return
    }
    focusPath(selectedNode.path)
  }

  function revealPath(path: JsonPath) {
    const nextExpandedNodes = new Set(expandedNodes)
    for (let length = focusedPath.length; length <= path.length; length += 1) {
      const ancestor = getJsonNodeAtPath(root, path.slice(0, length))
      if (ancestor !== null) {
        nextExpandedNodes.add(ancestor)
      }
    }
    setExpandedNodes(nextExpandedNodes)
    selectPath(path)
  }

  function navigateToPath(input: string): string | null {
    const result = parseJsonPath(input)
    if (!result.ok) {
      return result.message
    }

    const targetNode = getJsonNodeAtPath(root, result.path)
    if (targetNode === null) {
      return `No node found at ${formatJsonPath(result.path)}.`
    }

    const nextFocusedPath = isJsonPathWithin(result.path, focusedPath) ? focusedPath : root.path
    const nextFocusedNode = getJsonNodeAtPath(root, nextFocusedPath) ?? root
    const nextExpandedNodes = jsonPathsEqual(nextFocusedPath, focusedPath)
      ? new Set(expandedNodes)
      : new Set([nextFocusedNode])

    for (let length = nextFocusedPath.length; length <= result.path.length; length += 1) {
      const ancestor = getJsonNodeAtPath(root, result.path.slice(0, length))
      if (ancestor !== null) {
        nextExpandedNodes.add(ancestor)
      }
    }
    setFocusedPath(nextFocusedPath)
    setExpandedNodes(nextExpandedNodes)
    selectPath(result.path)
    return null
  }

  function moveToSearchMatch(direction: number) {
    if (searchMatches.length === 0) {
      return
    }

    const currentIndex = searchMatches.findIndex((match) =>
      jsonPathsEqual(match.node.path, selectedPath),
    )
    const nextIndex =
      currentIndex === -1
        ? direction > 0
          ? 0
          : searchMatches.length - 1
        : (currentIndex + direction + searchMatches.length) % searchMatches.length
    const match = searchMatches[nextIndex]
    if (match !== undefined) {
      revealPath(match.node.path)
    }
  }

  function togglePath(node: JsonNode) {
    if (expandedNodes.has(node) && isJsonPathWithin(selectedPath, node.path)) {
      selectPath(node.path)
    }

    setExpandedNodes((current) => {
      const next = new Set(current)
      if (next.has(node)) {
        next.delete(node)
      } else {
        next.add(node)
      }
      return next
    })
  }

  function moveSelection(index: number) {
    const currentIndex = selectedIndex === -1 ? 0 : selectedIndex
    const nextIndex = Math.min(Math.max(currentIndex + index, 0), visibleNodes.length - 1)
    const nextNode = visibleNodes[nextIndex]
    if (nextNode !== undefined) {
      selectPath(nextNode.path)
    }
  }

  function handleNodeKeyDown(event: KeyboardEvent<HTMLDivElement>, node: JsonNode) {
    const container = isJsonContainerNode(node)
    const expandable = container && node.children.length > 0

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        moveSelection(1)
        return
      case "ArrowUp":
        event.preventDefault()
        moveSelection(-1)
        return
      case "Home":
        event.preventDefault()
        moveSelection(-visibleNodes.length)
        return
      case "End":
        event.preventDefault()
        moveSelection(visibleNodes.length)
        return
      case "ArrowRight":
        if (!expandable) {
          return
        }
        event.preventDefault()
        if (!expandedNodes.has(node)) {
          togglePath(node)
          return
        }
        if (node.children[0] !== undefined) {
          selectPath(node.children[0].path)
        }
        return
      case "ArrowLeft":
        if (container && expandedNodes.has(node)) {
          event.preventDefault()
          togglePath(node)
          return
        }
        if (jsonPathsEqual(node.path, focusedPath) && focusedPath.length > 0) {
          event.preventDefault()
          focusPath(root.path)
          return
        }
        {
          const parent = parentJsonPath(node.path)
          if (parent !== null) {
            event.preventDefault()
            selectPath(parent)
          }
        }
        return
      case "Enter":
      case " ":
        if (expandable) {
          event.preventDefault()
          togglePath(node)
        }
    }
  }

  function copySelectedPath() {
    const path = formatJsonPath(selectedNode.path)
    if (navigator.clipboard?.writeText === undefined) {
      setCopyStatus("error")
      return
    }

    void navigator.clipboard.writeText(path).then(
      () => setCopyStatus("copied"),
      () => setCopyStatus("error"),
    )
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      moveToSearchMatch(event.shiftKey ? -1 : 1)
      return
    }
    if (event.key === "Escape" && searchQuery !== "") {
      event.preventDefault()
      setSearchQuery("")
    }
  }

  function focusDocumentSearch() {
    setPaletteOpen(false)
    searchRef.current?.focus()
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-canvas md:h-svh md:overflow-hidden">
      <header className="glass sticky top-2 z-20 mx-2 mt-2 flex h-11 items-center gap-2 rounded-xl px-2 sm:px-3">
        <h1 className="shrink-0">
          <img src="/logo.svg" alt="Noder" className="h-6 w-auto" />
        </h1>
        <span className="hidden shrink-0 font-mono text-caption text-ink-subtle sm:inline">
          Local only
        </span>
        {sourceName !== null && (
          <p className="hidden min-w-0 truncate font-mono text-label text-ink-subtle md:block">
            {sourceName}
          </p>
        )}
        <span className="mx-1 hidden h-4 w-px shrink-0 bg-hairline md:block" aria-hidden />
        <div className="min-w-0 flex-1 overflow-hidden">
          <Breadcrumbs path={focusedPath} onNavigate={focusPath} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ViewSwitch view={view} onChange={setView} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-7"
            aria-label="Command"
            onClick={() => setPaletteOpen(true)}
            data-command-trigger
          >
            <CommandIcon data-icon="inline-start" aria-hidden />
            <span className="hidden sm:inline">Command</span>
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd>{/mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 sm:size-7"
            aria-label="Close document"
            onClick={onCloseDocument}
          >
            <XIcon />
          </Button>
        </div>
      </header>
      <main className="flex min-h-0 flex-col px-2 pt-3 pb-4 sm:px-4 md:flex-1">
        <section
          aria-labelledby="tree-view-title"
          className="flex flex-col gap-3 md:min-h-0 md:flex-1"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="tree-view-title" className="font-heading text-body font-medium text-ink">
                {view === "tree" ? "Tree View" : "Code View"}
              </h2>
              <p className="mt-1 text-caption text-ink-subtle">
                {view === "tree"
                  ? "Expand branches to inspect the structure."
                  : "Pretty-print of the focused branch."}
              </p>
              <code data-selected-path className="mt-2 block truncate font-mono text-caption text-ink-subtle">
                {formatJsonPath(selectedNode.path)}
              </code>
              <p role="status" aria-live="polite" className="mt-1 min-h-4 text-caption text-ink-subtle">
                {copyStatus === "copied"
                  ? "Path copied."
                  : copyStatus === "error"
                    ? "Could not copy."
                    : ""}
              </p>
            </div>
            <div className="hidden flex-wrap items-center gap-3 md:flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-7"
                onClick={() => setPathDialogOpen(true)}
                data-json-path-trigger
              >
                <SearchIcon data-icon="inline-start" aria-hidden />
                Go to JSONPath
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-7"
                disabled={!canFocusSelected}
                title={
                  canFocusSelected
                    ? "Isolate the selected branch"
                    : "Select a container branch to isolate it"
                }
                onClick={focusSelectedNode}
                data-focus-path
              >
                <FocusIcon data-icon="inline-start" aria-hidden />
                Focus branch
              </Button>
              {focusedPath.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 sm:min-h-7"
                  onClick={() => focusPath(root.path)}
                >
                  Exit focus
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-7"
                onClick={copySelectedPath}
                data-copy-path
              >
                <CopyIcon data-icon="inline-start" aria-hidden />
                Copy path
              </Button>
            </div>
          </div>
          <DocumentStats stats={stats} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-80">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-subtle"
              />
              <label htmlFor="json-search" className="sr-only">
                Search keys and values
              </label>
              <input
                id="json-search"
                ref={searchRef}
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search keys and values"
                aria-describedby="json-search-hint"
                aria-keyshortcuts="Enter Shift+Enter"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                onKeyDown={handleSearchKeyDown}
                className="h-11 w-full rounded-md border border-hairline bg-canvas pr-11 pl-9 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:h-8 sm:pr-9 sm:text-body"
              />
              {searchQuery !== "" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-1 size-11 -translate-y-1/2 text-ink-subtle hover:text-ink sm:size-6"
                >
                  <XIcon aria-hidden />
                </Button>
              )}
            </div>
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
              <span
                data-search-count
                aria-live="polite"
                className="min-w-20 font-mono text-caption text-ink-subtle"
              >
                {searchQuery === ""
                  ? ""
                  : searchCountLabel(searchMatches.length, selectedMatchIndex, visibleMatchCount)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 sm:size-7"
                  disabled={searchMatches.length === 0}
                  aria-label="Previous match"
                  title="Previous match"
                  onClick={() => moveToSearchMatch(-1)}
                  data-search-previous
                >
                  <ChevronUpIcon aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 sm:size-7"
                  disabled={searchMatches.length === 0}
                  aria-label="Next match"
                  title="Next match"
                  onClick={() => moveToSearchMatch(1)}
                  data-search-next
                >
                  <ChevronDownIcon aria-hidden />
                </Button>
              </div>
              <span id="json-search-hint" className="hidden text-caption text-ink-subtle sm:inline">
                Enter next · Shift+Enter previous
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:min-h-0 md:flex-1 md:flex-row">
            {view === "code" ? (
              <CodeView
                lines={codeLines}
                selectedPath={selectedPath}
                matchedPaths={searchMatchPaths}
                onSelectPath={revealPath}
              />
            ) : (
            <div
              ref={scrollRef}
              id="json-tree-panel"
              role="tabpanel"
              aria-labelledby="view-tab-tree"
              className="h-[60svh] min-w-0 shrink-0 overflow-auto border-y border-hairline bg-surface md:h-auto md:min-h-0 md:flex-1"
            >
              <ul
                role="tree"
                aria-label="JSON tree"
                className="relative m-0 list-none p-0"
                style={{ height: rowVirtualizer.getTotalSize() }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const node = visibleNodes[virtualRow.index]
                  if (node === undefined) {
                    return null
                  }
                  const path = serializeJsonPath(node.path)
                  return (
                    <TreeRow
                      key={virtualRow.key}
                      node={node}
                      expanded={expandedNodes.has(node)}
                      selected={jsonPathsEqual(node.path, selectedPath)}
                      matched={searchMatchNodes.has(node)}
                      currentMatch={
                        selectedMatchIndex !== -1 && jsonPathsEqual(node.path, selectedPath)
                      }
                      hiddenMatchCount={hiddenMatchCountByPath.get(path) ?? 0}
                      level={Math.max(1, node.depth - focusedNode.depth + 1)}
                      {...treeItemPosition(root, focusedNode, node)}
                      onToggle={() => togglePath(node)}
                      onSelect={() => selectPath(node.path)}
                      onKeyDown={(event) => handleNodeKeyDown(event, node)}
                      rowRef={(element) => setRowRef(path, element)}
                      index={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    />
                  )
                })}
              </ul>
            </div>
            )}
            <StructuralMinimap
              root={focusedNode}
              selectedPath={selectedPathKey}
              onSelectPath={revealPath}
            />
          </div>
          <CommandPalette
            key={paletteOpen ? "palette-open" : "palette-closed"}
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            canFocus={canFocusSelected}
            isFocused={focusedPath.length > 0}
            onSearchQuery={(query) => {
              setSearchQuery(query)
              focusDocumentSearch()
            }}
            onGoToPath={() => setPathDialogOpen(true)}
            onFocusSearch={focusDocumentSearch}
            onFocusSelected={focusSelectedNode}
            onExitFocus={() => focusPath(root.path)}
            onCopyPath={copySelectedPath}
            onCloseDocument={onCloseDocument}
            view={view}
            onShowCodeView={() => setView("code")}
            onShowTreeView={() => setView("tree")}
          />
          <JsonPathDialog
            key={pathDialogOpen ? "path-open" : "path-closed"}
            open={pathDialogOpen}
            initialPath={formatJsonPath(selectedNode.path)}
            onOpenChange={(open) => {
              setPathDialogOpen(open)
              if (open) {
                setPaletteOpen(false)
              }
            }}
            onNavigate={navigateToPath}
          />
        </section>
      </main>
    </div>
  )
}
