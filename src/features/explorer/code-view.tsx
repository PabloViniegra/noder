import { useVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import type { JsonCodeLine, JsonCodeTokenKind } from "@/core/json/format"
import { jsonPathsEqual, serializeJsonPath } from "@/core/json/path"
import type { JsonPath } from "@/core/json/types"
import { cn } from "@/lib/utils"

type CodeViewProps = {
  readonly lines: readonly JsonCodeLine[]
  readonly selectedPath: JsonPath
  readonly matchedPaths: ReadonlySet<string>
  readonly onSelectPath: (path: JsonPath) => void
}

function tokenClass(kind: JsonCodeTokenKind): string {
  switch (kind) {
    case "key":
      return "text-json-key"
    case "string":
      return "text-json-string"
    case "number":
      return "text-json-number"
    case "boolean":
      return "text-json-boolean"
    case "null":
      return "text-json-null"
    case "indent":
    case "punctuation":
      return "text-json-punctuation"
  }
}

function firstLineIndex(lines: readonly JsonCodeLine[], path: JsonPath): number {
  return lines.findIndex((line) => jsonPathsEqual(line.path, path))
}

export function CodeView({ lines, selectedPath, matchedPaths, onSelectPath }: CodeViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef(new Map<number, HTMLDivElement>())
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = firstLineIndex(lines, selectedPath)
    return index === -1 ? 0 : index
  })
  const selectedPathKey = serializeJsonPath(selectedPath)
  const activeLine = lines[activeIndex]
  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 28,
    getItemKey: (index) => {
      const line = lines[index]
      return line === undefined ? index : `${serializeJsonPath(line.path)}:${index}`
    },
    overscan: 8,
    paddingStart: 8,
    paddingEnd: 8,
  })

  const pathLineIndex = useMemo(() => {
    const index = new Map<string, number>()
    lines.forEach((line, lineIndex) => {
      const path = serializeJsonPath(line.path)
      if (!index.has(path)) {
        index.set(path, lineIndex)
      }
    })
    return index
  }, [lines])

  useEffect(() => {
    if (activeLine !== undefined && jsonPathsEqual(activeLine.path, selectedPath)) {
      return
    }
    const nextIndex = pathLineIndex.get(selectedPathKey)
    if (nextIndex !== undefined) {
      setActiveIndex(nextIndex)
    }
  }, [activeLine, pathLineIndex, selectedPath, selectedPathKey])

  useEffect(() => {
    if (lines[activeIndex] === undefined) {
      return
    }
    rowVirtualizer.scrollToIndex(activeIndex, { align: "auto" })
    const focusFrame = window.requestAnimationFrame(() => {
      lineRefs.current.get(activeIndex)?.focus()
    })
    return () => window.cancelAnimationFrame(focusFrame)
  }, [activeIndex, lines, rowVirtualizer])

  function setLineRef(index: number, element: HTMLDivElement | null) {
    if (element === null) {
      lineRefs.current.delete(index)
    } else {
      lineRefs.current.set(index, element)
    }
  }

  function selectLine(index: number) {
    const line = lines[index]
    if (line === undefined) {
      return
    }
    setActiveIndex(index)
    onSelectPath(line.path)
  }

  function handleLineKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        selectLine(index + 1)
        return
      case "ArrowUp":
        event.preventDefault()
        selectLine(index - 1)
        return
      case "Home":
        event.preventDefault()
        selectLine(0)
        return
      case "End":
        event.preventDefault()
        selectLine(lines.length - 1)
    }
  }

  return (
    <div
      ref={scrollRef}
      id="json-code-panel"
      role="tabpanel"
      aria-labelledby="view-tab-code"
      className="min-h-0 min-w-0 flex-1 overflow-auto border-y border-hairline bg-surface"
    >
      <div
        role="listbox"
        aria-label="JSON code"
        aria-activedescendant={
          lines[activeIndex] === undefined ? undefined : `json-code-line-${activeIndex}`
        }
        data-code-view
        className="relative"
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const line = lines[virtualRow.index]
          if (line === undefined) {
            return null
          }
          const path = serializeJsonPath(line.path)
          const selected = virtualRow.index === activeIndex
          const matched = matchedPaths.has(path)
          return (
            <CodeLine
              key={virtualRow.key}
              index={virtualRow.index}
              line={line}
              selected={selected}
              matched={matched}
              currentMatch={selected && matched}
              onSelect={() => selectLine(virtualRow.index)}
              onKeyDown={(event) => handleLineKeyDown(event, virtualRow.index)}
              lineRef={(element) => setLineRef(virtualRow.index, element)}
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
      </div>
    </div>
  )
}

type CodeLineProps = {
  readonly index: number
  readonly line: JsonCodeLine
  readonly selected: boolean
  readonly matched: boolean
  readonly currentMatch: boolean
  readonly onSelect: () => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  readonly lineRef: (element: HTMLDivElement | null) => void
  readonly style: CSSProperties
}

function CodeLine({
  index,
  line,
  selected,
  matched,
  currentMatch,
  onSelect,
  onKeyDown,
  lineRef,
  style,
}: CodeLineProps) {
  const text = line.tokens.map((token) => token.text).join("")

  return (
    <div
      id={`json-code-line-${index}`}
      ref={lineRef}
      role="option"
      aria-label={text}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-code-line={serializeJsonPath(line.path)}
      data-search-match={matched ? "true" : undefined}
      data-search-current={currentMatch ? "true" : undefined}
      onClick={onSelect}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "flex min-h-7 w-full items-center overflow-hidden px-3 font-mono text-code whitespace-pre outline-none transition-colors",
        selected
          ? "bg-selection text-ink shadow-[inset_2px_0_0_var(--primary-hover)] hover:bg-selection"
          : matched
            ? "bg-primary/10 hover:bg-primary/15"
            : "hover:bg-surface-raised focus-visible:bg-selection",
        currentMatch && "ring-1 ring-primary/60",
        "focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
      style={style}
    >
      {line.tokens.map((token, tokenIndex) => (
        <span key={`${token.kind}-${tokenIndex}`} className={tokenClass(token.kind)}>
          {token.text}
        </span>
      ))}
    </div>
  )
}
