import { useVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import type { JsonNode, JsonPath, JsonStats } from "@/core/json/types"
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
  getJsonNodeAtPath,
  isJsonContainerNode,
  summarizeJsonNode,
} from "@/core/json/traverse"
import { formatJsonCode, stringifyJsonNode } from "@/core/json/format"
import { searchJson, type JsonSearchMatch } from "@/core/json/search"
import { searchJsonInWorker } from "@/core/json/json-worker-client"
import { useDocumentStore } from "@/features/document/store"

export type CopyStatus = "idle" | "copied-path" | "copied-json" | "copied-document" | "error"
export type ExplorerView = "tree" | "code"

type TreeViewModelProps = {
  readonly root: JsonNode
  readonly stats: JsonStats
  readonly searchWorkerReady: boolean
  readonly initialCommandOpen: boolean
}

function copyFeedback(status: CopyStatus): string | null {
  switch (status) {
    case "idle":
      return null
    case "copied-path":
      return "Path copied."
    case "copied-json":
      return "JSON copied."
    case "copied-document":
      return "Document copied."
    case "error":
      return "Could not copy."
  }
}

export function useTreeViewModel({
  root,
  stats,
  searchWorkerReady,
  initialCommandOpen,
}: TreeViewModelProps) {
  const sourceName = useDocumentStore((s) => s.sourceName)
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const [focusedPath, setFocusedPath] = useState<JsonPath>(() => root.path)
  const [expandedNodes, setExpandedNodes] = useState<ReadonlySet<JsonNode>>(() => new Set([root]))
  const [selectedPath, setSelectedPath] = useState<JsonPath>(() => root.path)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const [searchQuery, setSearchQuery] = useState("")
  const [paletteOpen, setPaletteOpen] = useState(initialCommandOpen)
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
  const [searchMatches, setSearchMatches] = useState<readonly JsonSearchMatch[]>([])
  const useSearchWorker = searchWorkerReady && stats.nodes >= 20_000
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
  // react-doctor-disable-next-line react-hooks-js/incompatible-library -- TanStack Virtual exposes intentionally unstable APIs.
  const rowVirtualizer = useVirtualizer({ // oxlint-disable-line react/incompatible-library
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
    let active = true
    if (searchQuery === "") {
      setSearchMatches([])
      return () => {
        active = false
      }
    }

    if (!useSearchWorker) {
      setSearchMatches(searchJson(focusedNode, searchQuery))
      return () => {
        active = false
      }
    }

    void searchJsonInWorker(searchQuery, focusedNode.path).then(
      (matches) => {
        if (!active) {
          return
        }
        setSearchMatches(
          matches.flatMap((match) => {
            const node = getJsonNodeAtPath(root, match.path)
            return node === null ? [] : [{ node, matchedBy: match.matchedBy }]
          }),
        )
      },
      () => {
        if (active) {
          setSearchMatches(searchJson(focusedNode, searchQuery))
        }
      },
    )

    return () => {
      active = false
    }
  }, [focusedNode, root, searchQuery, useSearchWorker])

  useEffect(() => {
    if (
      view !== "tree" ||
      selectedIndex === -1 ||
      document.activeElement?.getAttribute("role") === "tab"
    ) {
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

  function copyText(text: string, copied: Exclude<CopyStatus, "idle" | "error">) {
    if (navigator.clipboard?.writeText === undefined) {
      setCopyStatus("error")
      return
    }

    void navigator.clipboard.writeText(text).then(
      () => setCopyStatus(copied),
      () => setCopyStatus("error"),
    )
  }

  function copySelectedPath() {
    copyText(formatJsonPath(selectedNode.path), "copied-path")
  }

  function copySelectedJson() {
    copyText(stringifyJsonNode(selectedNode), "copied-json")
  }

  function copyDocument() {
    copyText(stringifyJsonNode(root), "copied-document")
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

  const copyMessage = copyFeedback(copyStatus)
  const focused = focusedPath.length > 0
  const branchSummary = focused ? summarizeJsonNode(focusedNode) : null
  const viewStats =
    branchSummary === null
      ? stats
      : {
          bytes: stats.bytes,
          nodes: branchSummary.nodes,
          objects: branchSummary.objects,
          arrays: branchSummary.arrays,
          maxDepth: branchSummary.maxDepth,
        }

  return {
    root,
    sourceName,
    scrollRef,
    searchRef,
    rowRefs,
    focusedNode,
    focusedPath,
    visibleNodes,
    expandedNodes,
    selectedPath,
    searchQuery,
    setSearchQuery,
    searchMatches,
    paletteOpen,
    setPaletteOpen,
    pathDialogOpen,
    setPathDialogOpen,
    view,
    setView,
    searchMatchNodes,
    searchMatchPaths,
    visibleMatchCount,
    hiddenMatchCountByPath,
    codeLines,
    selectedMatchIndex,
    selectedNode,
    selectedIndex,
    selectedPathKey,
    canFocusSelected,
    rowVirtualizer,
    copyMessage,
    focused,
    viewStats,
    setRowRef,
    selectPath,
    focusPath,
    focusSelectedNode,
    revealPath,
    navigateToPath,
    moveToSearchMatch,
    togglePath,
    handleNodeKeyDown,
    copySelectedPath,
    copySelectedJson,
    copyDocument,
    handleSearchKeyDown,
    focusDocumentSearch,
  }
}
