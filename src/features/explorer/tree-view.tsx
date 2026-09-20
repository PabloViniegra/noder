import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CommandIcon,
  FocusIcon,
  LogOutIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import {
  useRef,
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
  jsonPathsEqual,
  parentJsonPath,
  serializeJsonPath,
} from "@/core/json/path"
import {
  getJsonChildPosition,
  getJsonNodeAtPath,
  isJsonContainerNode,
} from "@/core/json/traverse"
import { CodeView } from "@/features/explorer/code-view"
import { CommandPalette } from "@/features/explorer/command-palette"
import { JsonPathDialog } from "@/features/explorer/json-path-dialog"
import { StructuralMinimap } from "@/features/explorer/structural-minimap"
import {
  useTreeViewModel,
  type ExplorerView,
} from "@/features/explorer/use-tree-view-model"
import { cn } from "@/lib/utils"

type ContainerNode = JsonObjectNode | JsonArrayNode
type TreeItemPosition = {
  readonly positionInSet: number
  readonly setSize: number
}

type TreeViewProps = {
  readonly root: JsonNode
  readonly stats: JsonStats
  readonly searchWorkerReady: boolean
  readonly initialCommandOpen: boolean
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

type TreeRowItemProps = Omit<TreeRowProps, "index" | "style"> & {
  readonly expandable: boolean
}

type BreadcrumbsProps = {
  readonly path: JsonPath
  readonly onNavigate: (path: JsonPath) => void
}

type DocumentStatsProps = {
  readonly stats: Pick<JsonStats, "bytes" | "nodes" | "objects" | "arrays" | "maxDepth">
  readonly showBytes: boolean
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

function DocumentStats({ stats, showBytes }: DocumentStatsProps) {
  const parts: Array<{ readonly key: string; readonly label: string; readonly value: string }> = []
  if (showBytes) {
    parts.push({ key: "bytes", label: "Size", value: formatBytes(stats.bytes) })
  }
  parts.push(
    { key: "nodes", label: "Nodes", value: String(stats.nodes) },
    { key: "objects", label: "Objects", value: String(stats.objects) },
    { key: "arrays", label: "Arrays", value: String(stats.arrays) },
    { key: "maxDepth", label: "Max depth", value: String(stats.maxDepth) },
  )

  return (
    <p
      role="region"
      aria-label="Document statistics"
      data-document-stats
      className="flex min-w-0 flex-wrap items-center gap-x-2 font-mono text-caption text-ink-subtle"
    >
      {parts.map((part, index) => (
        <span key={part.key} className="inline-flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden className="text-json-punctuation">
              ·
            </span>
          )}
          <span className="sr-only">{part.label} </span>
          <span data-stat={part.key} className="tabular-nums">
            {part.value}
          </span>
          {part.key === "nodes" && <span aria-hidden> nodes</span>}
          {part.key === "objects" && <span aria-hidden> objects</span>}
          {part.key === "arrays" && <span aria-hidden> arrays</span>}
          {part.key === "maxDepth" && <span aria-hidden> depth</span>}
        </span>
      ))}
    </p>
  )
}

function treeRowClassName(selected: boolean, matched: boolean, currentMatch: boolean): string {
  return cn(
    "group flex min-h-7 w-full min-w-0 items-center overflow-hidden rounded-sm px-1 outline-none transition-colors",
    selected
      ? "bg-selection text-ink shadow-[inset_2px_0_0_var(--primary-hover)] hover:bg-selection"
      : matched
        ? "bg-primary/10 hover:bg-primary/15"
        : "hover:bg-surface-raised focus-visible:bg-selection",
    currentMatch && "ring-1 ring-primary/60",
    "focus-visible:ring-2 focus-visible:ring-ring/40",
  )
}

function handleTreeRowClick(
  event: MouseEvent<HTMLDivElement>,
  expandable: boolean,
  onToggle: () => void,
  onSelect: () => void,
) {
  const disclosure =
    event.target instanceof Element ? event.target.closest("[data-tree-disclosure]") : null
  if (expandable && disclosure !== null) {
    onToggle()
    return
  }
  onSelect()
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
  const expandable = isJsonContainerNode(node) && node.children.length > 0

  return (
    <li data-index={index} role="none" style={style}>
      <TreeRowItem
        node={node}
        expanded={expanded}
        selected={selected}
        matched={matched}
        currentMatch={currentMatch}
        hiddenMatchCount={hiddenMatchCount}
        level={level}
        positionInSet={positionInSet}
        setSize={setSize}
        onToggle={onToggle}
        onSelect={onSelect}
        onKeyDown={onKeyDown}
        rowRef={rowRef}
        expandable={expandable}
      />
    </li>
  )
}

function TreeRowItem({
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
  expandable,
}: TreeRowItemProps) {
  const label = nodeName(node)

  return (
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
      onClick={(event) => handleTreeRowClick(event, expandable, onToggle, onSelect)}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      className={treeRowClassName(selected, matched, currentMatch)}
      style={{ paddingInlineStart: `${node.depth * 16 + 4}px` }}
    >
      <span
        aria-hidden
        className={cn(
          "mr-1 size-1.5 shrink-0 rounded-full",
          matched ? (currentMatch ? "bg-primary-hover" : "bg-primary/70") : "bg-transparent",
        )}
      />
      <TreeRowDisclosure expandable={expandable} expanded={expanded} />
      <span className="min-w-0 max-w-[45%] truncate text-json-key" title={label}>
        {label}
      </span>
      {node.key !== null && <span className="text-json-punctuation">:</span>}
      <TreeRowValue node={node} expanded={expanded} hiddenMatchCount={hiddenMatchCount} />
    </div>
  )
}

function TreeRowDisclosure({ expandable, expanded }: { expandable: boolean; expanded: boolean }) {
  if (!expandable) {
    return <span aria-hidden className="mr-1 inline-block size-6 shrink-0" />
  }

  return (
    <span
      aria-hidden
      data-tree-disclosure
      className="mr-1 flex size-6 shrink-0 items-center justify-center text-ink-subtle transition-colors group-hover:text-ink"
    >
      {expanded ? <ChevronDownIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
    </span>
  )
}

function TreeRowValue({
  node,
  expanded,
  hiddenMatchCount,
}: {
  readonly node: JsonNode
  readonly expanded: boolean
  readonly hiddenMatchCount: number
}) {
  if (!isJsonContainerNode(node)) {
    const value = scalarValue(node)
    return (
      <span className={cn("ml-2 min-w-0 flex-1 truncate", kindClass(node.kind))} title={value}>
        {value}
      </span>
    )
  }

  return (
    <>
      <span className={cn("ml-2 min-w-0 truncate", kindClass(node.kind))}>
        {containerSummary(node)}
      </span>
      {!expanded && hiddenMatchCount > 0 && (
        <span
          data-hidden-matches={hiddenMatchCount}
          title={`${hiddenMatchCount} hidden ${hiddenMatchCount === 1 ? "match" : "matches"} in this branch`}
          className="ml-2 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 px-1 font-mono text-caption tabular-nums text-primary-hover"
        >
          {hiddenMatchCount}
        </span>
      )}
    </>
  )
}

function ViewSwitch({
  view,
  onChange,
}: {
  readonly view: ExplorerView
  readonly onChange: (view: ExplorerView) => void
}) {
  const treeTabRef = useRef<HTMLButtonElement>(null)
  const codeTabRef = useRef<HTMLButtonElement>(null)

  function focusTab(nextView: ExplorerView) {
    window.requestAnimationFrame(() => {
      const tab = nextView === "tree" ? treeTabRef.current : codeTabRef.current
      tab?.focus()
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: ExplorerView) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return
    }
    event.preventDefault()
    const nextView = current === "tree" ? "code" : "tree"
    onChange(nextView)
    focusTab(nextView)
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
        ref={treeTabRef}
        role="tab"
        aria-selected={view === "tree"}
        aria-controls="json-tree-panel"
        tabIndex={view === "tree" ? 0 : -1}
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
        ref={codeTabRef}
        role="tab"
        aria-selected={view === "code"}
        aria-controls="json-code-panel"
        tabIndex={view === "code" ? 0 : -1}
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

type TreeViewLayoutProps = ReturnType<typeof useTreeViewModel> &
  Pick<TreeViewProps, "onCloseDocument">

export function TreeView(props: TreeViewProps) {
  const model = useTreeViewModel(props)
  return <TreeViewLayout {...model} onCloseDocument={props.onCloseDocument} />
}

function TreeViewLayout(props: TreeViewLayoutProps) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-canvas md:h-svh md:overflow-hidden">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <TreeViewHeader {...props} />
      <TreeViewMain {...props} />
    </div>
  )
}

function TreeViewHeader({
  sourceName,
  selectedNode,
  focused,
  root,
  canFocusSelected,
  focusPath,
  focusSelectedNode,
  view,
  setView,
  setPaletteOpen,
  onCloseDocument,
}: TreeViewLayoutProps) {
  return (
      <header className="glass sticky top-2 z-20 mx-2 mt-2 flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-2 py-1 sm:h-11 sm:flex-nowrap sm:px-3 sm:py-0">
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
        <div className="order-last min-w-0 basis-full overflow-hidden sm:order-none sm:flex-1">
          <Breadcrumbs path={selectedNode.path} onNavigate={focusPath} />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2">
          {focused ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-11 sm:size-7 lg:h-7 lg:w-auto lg:px-2.5"
              aria-label="Exit focus"
              onClick={() => focusPath(root.path)}
            >
              <LogOutIcon data-icon="inline-start" aria-hidden />
              <span className="hidden lg:inline">Exit focus</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-11 sm:size-7 lg:h-7 lg:w-auto lg:px-2.5"
              aria-label="Focus branch"
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
              <span className="hidden lg:inline">Focus branch</span>
            </Button>
          )}
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
  )
}

function TreeViewMain({
  scrollRef,
  searchRef,
  selectedNode,
  selectedPath,
  searchQuery,
  setSearchQuery,
  handleSearchKeyDown,
  searchMatches,
  selectedMatchIndex,
  visibleMatchCount,
  moveToSearchMatch,
  copySelectedPath,
  copySelectedJson,
  copyDocument,
  copyMessage,
  viewStats,
  focused,
  view,
  setView,
  codeLines,
  searchMatchPaths,
  revealPath,
  focusedNode,
  root,
  rowVirtualizer,
  visibleNodes,
  expandedNodes,
  searchMatchNodes,
  hiddenMatchCountByPath,
  setRowRef,
  togglePath,
  handleNodeKeyDown,
  selectedPathKey,
  focusedPath,
  paletteOpen,
  setPaletteOpen,
  pathDialogOpen,
  setPathDialogOpen,
  navigateToPath,
  focusDocumentSearch,
  focusSelectedNode,
  canFocusSelected,
  focusPath,
  selectPath,
  onCloseDocument,
}: TreeViewLayoutProps) {
  return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 flex-col px-2 pt-3 pb-4 sm:px-4 md:flex-1"
      >
        <section aria-label="Document" className="flex flex-col gap-3 md:min-h-0 md:flex-1">
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
                aria-describedby={searchQuery === "" ? undefined : "json-search-hint"}
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
            {searchQuery !== "" && (
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                <span
                  data-search-count
                  aria-live="polite"
                  className="min-w-20 font-mono text-caption text-ink-subtle"
                >
                  {searchCountLabel(searchMatches.length, selectedMatchIndex, visibleMatchCount)}
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
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label="Copy path"
                title="Copy path"
                onClick={copySelectedPath}
                data-selected-path
                data-copy-path
                className="h-6 max-w-full min-w-0 truncate px-1 font-mono text-caption text-ink-subtle hover:text-ink"
              >
                {formatJsonPath(selectedNode.path)}
              </Button>
              <p role="status" aria-live="polite" className="min-h-4 text-caption text-ink-subtle">
                {copyMessage !== null && (
                  <span className="enter-fade enter-fade-quick">{copyMessage}</span>
                )}
              </p>
            </div>
            <DocumentStats stats={viewStats} showBytes={!focused} />
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
            onCopyJson={copySelectedJson}
            onCopyDocument={copyDocument}
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
  )
}
