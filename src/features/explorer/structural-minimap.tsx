import { useEffect, useRef, useState } from "react"
import type { JsonNode, JsonPath } from "@/core/json/types"
import { layoutMinimap } from "@/core/json/minimap"
import { serializeJsonPath } from "@/core/json/path"
import { cn } from "@/lib/utils"

type StructuralMinimapProps = {
  readonly root: JsonNode
  readonly selectedPath: string
  readonly onSelectPath: (path: JsonPath) => void
}

function segmentLabel(key: JsonNode["key"]): string {
  if (key === null) {
    return "root"
  }
  return Object.prototype.toString.call(key) === "[object Number]" ? `[${key}]` : String(key)
}

export function StructuralMinimap({
  root,
  selectedPath,
  onSelectPath,
}: StructuralMinimapProps) {
  const railRef = useRef<HTMLElement>(null)
  const [minHeight, setMinHeight] = useState(1 / 250)
  const segments = layoutMinimap(root, { minHeight })

  useEffect(() => {
    const node = railRef.current
    if (node === null) {
      return
    }

    setMinHeight(4 / Math.max(node.clientHeight, 1))
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 1
      setMinHeight(4 / Math.max(height, 1))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={railRef}
      aria-labelledby="structure-minimap-title"
      data-structure-minimap
      className="relative h-36 overflow-hidden rounded-lg border border-hairline bg-surface md:h-auto md:w-20 md:shrink-0 md:self-stretch"
    >
      <h3 id="structure-minimap-title" className="sr-only">
        Structure minimap
      </h3>
      <div className="absolute inset-0">
        {segments.map((segment) => {
          const path = serializeJsonPath(segment.path)
          const selected = path === selectedPath
          const label = segmentLabel(segment.key)

          return (
            <button
              key={path}
              type="button"
              tabIndex={-1}
              title={`${label} · ${segment.size} ${segment.size === 1 ? "node" : "nodes"}`}
              aria-label={`Select ${label}`}
              aria-current={selected ? "true" : undefined}
              data-minimap-path={path}
              onClick={() => onSelectPath(segment.path)}
              className={cn(
                "absolute right-0 min-h-0 appearance-none overflow-hidden p-0 text-left outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/40",
                segment.depth % 2 === 0 ? "bg-surface-raised" : "bg-surface-high",
                "hover:bg-surface-high",
                selected && "bg-selection",
              )}
              style={{
                top: `${segment.top * 100}%`,
                height: `${segment.height * 100}%`,
                left: `${segment.depth * 4}px`,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}
