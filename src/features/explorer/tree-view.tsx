import { useVirtualizer } from "@tanstack/react-virtual"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CommandIcon,
  CopyIcon,
  FocusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import type {
  JsonArrayNode,
  JsonNode,
  JsonNodeKind,
  JsonObjectNode,
  JsonPath,
} from "@/core/json/types"
import {
  formatJsonPath,
  isJsonPathWithin,
  parentJsonPath,
  serializeJsonPath,
} from "@/core/json/path"
import {
  flattenVisibleNodes,
  getJsonNodeAtPath,
  isJsonContainerNode,
} from "@/core/json/traverse"
import { searchJson } from "@/core/json/search"
import { CommandPalette } from "@/features/explorer/command-palette"
import { cn } from "@/lib/utils"

type ContainerNode = JsonObjectNode | JsonArrayNode
type CopyStatus = "idle" | "copied" | "error"

type TreeViewProps = {
  readonly root: JsonNode
  readonly onCloseDocument: () => void
}

type TreeRowProps = {
  readonly node: JsonNode
  readonly expandedPaths: ReadonlySet<string>
  readonly selected: boolean
  readonly onToggle: (path: string) => void
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

function searchCountLabel(count: number): string {
  return `${count} ${count === 1 ? "match" : "matches"}`
}

function TreeRow({
  node,
  expandedPaths,
  selected,
  onToggle,
  onSelect,
  onKeyDown,
  rowRef,
  index,
  style,
}: TreeRowProps) {
  const container = isJsonContainerNode(node)
  const expandable = container && node.children.length > 0
  const path = serializeJsonPath(node.path)
  const expanded = expandedPaths.has(path)
  const label = nodeName(node)

  return (
    <li data-index={index} role="none" style={style}>
      <div
        ref={rowRef}
        role="treeitem"
        aria-level={node.depth + 1}
        aria-selected={selected}
        aria-expanded={expandable ? expanded : undefined}
        tabIndex={selected ? 0 : -1}
        onClick={onSelect}
        onFocus={onSelect}
        onKeyDown={onKeyDown}
        className={cn(
          "group flex min-h-7 min-w-max items-center rounded-sm px-1 outline-none transition-colors",
          selected
            ? "bg-selection text-ink hover:bg-selection"
            : "hover:bg-surface-raised focus-visible:bg-selection",
          "focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
        style={{ paddingInlineStart: `${node.depth * 16 + 4}px` }}
      >
        {expandable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            tabIndex={-1}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            aria-expanded={expanded}
            onClick={() => onToggle(path)}
            className="mr-1 text-ink-subtle hover:text-ink"
          >
            {expanded ? <ChevronDownIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
          </Button>
        ) : (
          <span aria-hidden className="mr-1 inline-block size-6 shrink-0" />
        )}
        <span className="text-json-key">{label}</span>
        {node.key !== null && <span className="text-json-punctuation">:</span>}
        {container ? (
          <span className={cn("ml-2", kindClass(node.kind))}>{containerSummary(node)}</span>
        ) : (
          <span className={cn("ml-2", kindClass(node.kind))}>{scalarValue(node)}</span>
        )}
      </div>
    </li>
  )
}

export function TreeView({ root, onCloseDocument }: TreeViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const [focusedPath, setFocusedPath] = useState<JsonPath>(() => root.path)
  const [expandedPaths, setExpandedPaths] = useState<ReadonlySet<string>>(
    () => new Set([serializeJsonPath(root.path)]),
  )
  const [selectedPath, setSelectedPath] = useState(() => serializeJsonPath(root.path))
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const [searchQuery, setSearchQuery] = useState("")
  const [paletteOpen, setPaletteOpen] = useState(false)
  const focusedNode = getJsonNodeAtPath(root, focusedPath) ?? root
  const visibleNodes = flattenVisibleNodes(focusedNode, expandedPaths)
  const searchMatches = searchJson(focusedNode, searchQuery)
  const selectedNode =
    visibleNodes.find((node) => serializeJsonPath(node.path) === selectedPath) ?? focusedNode
  const selectedIndex = visibleNodes.findIndex(
    (node) => serializeJsonPath(node.path) === selectedPath,
  )
  const focusedPathKey = serializeJsonPath(focusedPath)
  const selectedPathKey = serializeJsonPath(selectedNode.path)
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
    if (selectedIndex === -1) {
      return
    }

    rowVirtualizer.scrollToIndex(selectedIndex, { align: "auto" })
    const focusFrame = window.requestAnimationFrame(() => {
      rowRefs.current.get(selectedPath)?.focus()
    })
    return () => window.cancelAnimationFrame(focusFrame)
  }, [rowVirtualizer, selectedIndex, selectedPath])

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  function setRowRef(path: string, element: HTMLDivElement | null) {
    if (element === null) {
      rowRefs.current.delete(path)
    } else {
      rowRefs.current.set(path, element)
    }
  }

  function selectPath(path: string) {
    setSelectedPath(path)
    setCopyStatus("idle")
  }

  function focusPath(path: JsonPath) {
    const key = serializeJsonPath(path)
    setFocusedPath(path)
    setExpandedPaths(new Set([key]))
    setSelectedPath(key)
    setCopyStatus("idle")
  }

  function focusSelectedNode() {
    if (!isJsonContainerNode(selectedNode) || selectedPathKey === focusedPathKey) {
      return
    }
    focusPath(selectedNode.path)
  }

  function revealPath(path: JsonPath) {
    const nextExpandedPaths = new Set(expandedPaths)
    for (let length = focusedPath.length; length <= path.length; length += 1) {
      nextExpandedPaths.add(serializeJsonPath(path.slice(0, length)))
    }
    setExpandedPaths(nextExpandedPaths)
    selectPath(serializeJsonPath(path))
  }

  function moveToSearchMatch(direction: number) {
    if (searchMatches.length === 0) {
      return
    }

    const currentIndex = searchMatches.findIndex(
      (match) => serializeJsonPath(match.node.path) === selectedPath,
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

  function togglePath(path: string) {
    const toggledNode = visibleNodes.find((node) => serializeJsonPath(node.path) === path)
    if (expandedPaths.has(path)) {
      if (toggledNode !== undefined && isJsonPathWithin(selectedNode.path, toggledNode.path)) {
        selectPath(path)
      }
    }

    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  function moveSelection(index: number) {
    const currentIndex = visibleNodes.findIndex(
      (node) => serializeJsonPath(node.path) === selectedPath,
    )
    const nextIndex = Math.min(Math.max(currentIndex + index, 0), visibleNodes.length - 1)
    const nextNode = visibleNodes[nextIndex]
    if (nextNode !== undefined) {
      selectPath(serializeJsonPath(nextNode.path))
    }
  }

  function handleNodeKeyDown(event: KeyboardEvent<HTMLDivElement>, node: JsonNode) {
    const path = serializeJsonPath(node.path)
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
        if (!expandedPaths.has(path)) {
          togglePath(path)
          return
        }
        if (node.children[0] !== undefined) {
          selectPath(serializeJsonPath(node.children[0].path))
        }
        return
      case "ArrowLeft":
        if (container && expandedPaths.has(path)) {
          event.preventDefault()
          togglePath(path)
          return
        }
        if (path === focusedPathKey && focusedPath.length > 0) {
          event.preventDefault()
          focusPath(root.path)
          return
        }
        {
          const parent = parentJsonPath(node.path)
          if (parent !== null) {
            event.preventDefault()
            selectPath(serializeJsonPath(parent))
          }
        }
        return
      case "Enter":
      case " ":
        if (expandable) {
          event.preventDefault()
          togglePath(path)
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
    <section
      aria-labelledby="tree-view-title"
      className="flex min-h-[calc(100svh-5rem)] flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Breadcrumbs path={focusedPath} onNavigate={focusPath} />
          <h2 id="tree-view-title" className="mt-2 font-heading text-title-sm text-ink">
            Tree View
          </h2>
          <p className="mt-1 text-body text-ink-subtle">Expand branches to inspect the structure.</p>
          <code data-selected-path className="mt-2 block truncate font-mono text-caption text-ink-subtle">
            {formatJsonPath(selectedNode.path)}
          </code>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPaletteOpen(true)}
            data-command-trigger
          >
            <CommandIcon data-icon="inline-start" aria-hidden />
            Command
            <KbdGroup>
              <Kbd>{/mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isJsonContainerNode(selectedNode) || selectedPathKey === focusedPathKey}
            onClick={focusSelectedNode}
            data-focus-path
          >
            <FocusIcon data-icon="inline-start" aria-hidden />
            Focus here
          </Button>
          {focusedPath.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => focusPath(root.path)}>
              Exit focus
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copySelectedPath}
            data-copy-path
          >
            <CopyIcon data-icon="inline-start" aria-hidden />
            Copy path
          </Button>
          <p role="status" aria-live="polite" className="min-w-20 text-caption text-ink-subtle">
            {copyStatus === "copied"
              ? "Path copied."
              : copyStatus === "error"
                ? "Could not copy."
                : ""}
          </p>
        </div>
      </div>
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
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-8 w-full rounded-md border border-hairline bg-canvas pr-9 pl-9 text-body text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {searchQuery !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-ink-subtle hover:text-ink"
            >
              <XIcon aria-hidden />
            </Button>
          )}
        </div>
        <span
          data-search-count
          aria-live="polite"
          className="min-w-20 font-mono text-caption text-ink-subtle"
        >
          {searchQuery === "" ? "" : searchCountLabel(searchMatches.length)}
        </span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto border-y border-hairline bg-surface">
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
                expandedPaths={expandedPaths}
                selected={path === selectedPath}
                onToggle={togglePath}
                onSelect={() => selectPath(path)}
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
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        canFocus={isJsonContainerNode(selectedNode) && selectedPathKey !== focusedPathKey}
        isFocused={focusedPath.length > 0}
        onSearchQuery={(query) => {
          setSearchQuery(query)
          focusDocumentSearch()
        }}
        onFocusSearch={focusDocumentSearch}
        onFocusSelected={focusSelectedNode}
        onExitFocus={() => focusPath(root.path)}
        onCopyPath={copySelectedPath}
        onCloseDocument={onCloseDocument}
      />
    </section>
  )
}
