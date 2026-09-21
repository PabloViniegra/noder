import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import type { JsonNode, JsonPath } from "@/core/json/types"
import { layoutMinimap, type MinimapSegment } from "@/core/json/minimap"
import { formatJsonPath, serializeJsonPath } from "@/core/json/path"
import { cn } from "@/lib/utils"

const HEADER_PX = 20
const HEADER_PX_COARSE = 28
const MIN_BAND_PX = 18
const MIN_BAND_PX_COARSE = 24
const DEPTH_INDENT_PX = 8

type StructuralMinimapProps = {
  readonly root: JsonNode
  readonly selectedPath: string
  readonly onSelectPath: (path: JsonPath) => void
}

function segmentLabel(segment: MinimapSegment): string {
  if (segment.key === null) {
    return "root"
  }
  if (Object.prototype.toString.call(segment.key) === "[object Number]") {
    const parent = segment.path[segment.path.length - 2]
    return parent === undefined ? `[${segment.key}]` : `${parent}[${segment.key}]`
  }
  return String(segment.key)
}

export function StructuralMinimap({
  root,
  selectedPath,
  onSelectPath,
}: StructuralMinimapProps) {
  const railRef = useRef<HTMLElement>(null)
  const segmentRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [railHeight, setRailHeight] = useState(144)
  const [coarsePointer] = useState(() => window.matchMedia("(pointer: coarse)").matches)
  const [activeIndex, setActiveIndex] = useState(0)
  const minHeight =
    (coarsePointer ? MIN_BAND_PX_COARSE : MIN_BAND_PX) / Math.max(railHeight, 1)
  const headerMin = (coarsePointer ? HEADER_PX_COARSE : HEADER_PX) / Math.max(railHeight, 1)
  const segments = useMemo(
    () => layoutMinimap(root, { minHeight, headerMin }),
    [root, minHeight, headerMin],
  )
  const resolvedActiveIndex = Math.min(activeIndex, segments.length - 1)

  useEffect(() => {
    const node = railRef.current
    if (node === null) {
      return
    }

    setRailHeight(Math.max(node.clientHeight, 1))
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 1
      setRailHeight(Math.max(height, 1))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function focusSegment(index: number) {
    const next = Math.min(Math.max(index, 0), segments.length - 1)
    setActiveIndex(next)
    segmentRefs.current[next]?.focus()
  }

  function handleSegmentKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        focusSegment(index + 1)
        return
      case "ArrowUp":
        event.preventDefault()
        focusSegment(index - 1)
        return
      case "Home":
        event.preventDefault()
        focusSegment(0)
        return
      case "End":
        event.preventDefault()
        focusSegment(segments.length - 1)
    }
  }

  return (
    <div
      className="flex h-40 flex-col gap-1 md:h-auto md:w-36 md:shrink-0 md:self-stretch"
    >
      <h3
        id="structure-minimap-title"
        className="shrink-0 font-mono text-caption text-ink-subtle"
      >
        Structure
      </h3>
      <section
        ref={railRef}
        aria-labelledby="structure-minimap-title"
        data-structure-minimap
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-hairline bg-canvas"
      >
        <div className="absolute inset-0">
          {segments.map((segment, index) => {
            const path = serializeJsonPath(segment.path)
            const selected = path === selectedPath
            const label = segmentLabel(segment)
            const isRoot = segment.key === null
            const accessibleLabel = isRoot
              ? "Select root ($)"
              : `Select ${label} (${formatJsonPath(segment.path)})`

            return (
              <button
                key={path}
                ref={(element) => {
                  segmentRefs.current[index] = element
                }}
                type="button"
                tabIndex={index === resolvedActiveIndex ? 0 : -1}
                title={`${label} · ${segment.size} ${segment.size === 1 ? "node" : "nodes"}`}
                aria-label={accessibleLabel}
                aria-current={selected ? "true" : undefined}
                data-minimap-path={path}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handleSegmentKeyDown(event, index)}
                onClick={() => onSelectPath(segment.path)}
                className={cn(
                  "group absolute right-0 flex min-h-0 appearance-none items-start overflow-hidden p-0 text-left outline-none transition-colors",
                  "focus-visible:inset-ring-2 focus-visible:inset-ring-ring/40",
                  isRoot ? "bg-surface/80" : "border-b border-hairline bg-surface-raised/90",
                  segment.depth > 0 && [
                    "border-l",
                    selected ? "border-l-2 border-l-primary" : "border-l-hairline",
                  ],
                  "hover:bg-surface-high",
                  selected && "bg-selection",
                )}
                style={{
                  top: `${segment.top * 100}%`,
                  height: `${segment.height * 100}%`,
                  left: `${segment.depth * DEPTH_INDENT_PX}px`,
                }}
              >
                <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2 px-1.5 pt-1 leading-none">
                  <span
                    className={cn(
                      "min-w-0 truncate font-mono text-code transition-colors",
                      selected ? "text-ink" : "text-json-key group-hover:text-ink",
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-code tabular-nums transition-colors",
                      selected ? "text-ink" : "text-ink-subtle group-hover:text-ink-muted",
                    )}
                  >
                    {segment.size}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
