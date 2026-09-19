import { Dialog } from "@base-ui/react/dialog"
import { Command as CommandPrimitive } from "cmdk"
import {
  BracesIcon,
  ClipboardIcon,
  FocusIcon,
  ListTreeIcon,
  LogOutIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

type CommandPaletteProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly canFocus: boolean
  readonly isFocused: boolean
  readonly onSearchQuery: (query: string) => void
  readonly onGoToPath: () => void
  readonly onFocusSearch: () => void
  readonly onFocusSelected: () => void
  readonly onExitFocus: () => void
  readonly onCopyPath: () => void
  readonly onCloseDocument: () => void
  readonly view: "tree" | "code"
  readonly onShowCodeView: () => void
  readonly onShowTreeView: () => void
}

type PaletteItemProps = {
  readonly icon: LucideIcon
  readonly label: string
  readonly value: string
  readonly disabled?: boolean
  readonly onSelect: () => void
}

function PaletteItem({
  icon: Icon,
  label,
  value,
  disabled,
  onSelect,
}: PaletteItemProps) {
  return (
    <CommandPrimitive.Item
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "group/command-item flex min-h-11 cursor-default items-center gap-3 rounded-md px-3 text-body text-ink outline-none select-none sm:h-9 sm:min-h-0",
        "data-[selected=true]:bg-surface-raised data-[selected=true]:text-ink",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      )}
    >
      <Icon aria-hidden className="text-ink-subtle" />
      <span>{label}</span>
    </CommandPrimitive.Item>
  )
}

export function CommandPalette({
  open,
  onOpenChange,
  canFocus,
  isFocused,
  onSearchQuery,
  onGoToPath,
  onFocusSearch,
  onFocusSelected,
  onExitFocus,
  onCopyPath,
  onCloseDocument,
  view,
  onShowCodeView,
  onShowTreeView,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  function searchDocument() {
    const nextQuery = query.trim()
    if (nextQuery === "") {
      onFocusSearch()
      onOpenChange(false)
      return
    }
    onSearchQuery(nextQuery)
    onOpenChange(false)
  }

  function runAction(action: () => void) {
    action()
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className="glass fixed top-1/2 left-1/2 flex max-h-[min(80svh,32rem)] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl p-2 outline-none"
          data-command-palette
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search for a command or action.
          </Dialog.Description>
          <CommandPrimitive label="Search commands" className="flex min-h-0 flex-col">
            <div className="flex h-10 shrink-0 items-center gap-3 border-b border-hairline px-3">
              <SearchIcon aria-hidden className="size-4 shrink-0 text-ink-subtle" />
              <CommandPrimitive.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Search for a command or action…"
                className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle sm:text-body"
              />
              <Kbd>Esc</Kbd>
            </div>
            <CommandPrimitive.List className="min-h-0 overflow-y-auto py-1">
              <CommandPrimitive.Empty className="px-3 py-8 text-center text-body text-ink-subtle">
                No matching commands.
              </CommandPrimitive.Empty>
              {query.trim() !== "" && (
                <CommandPrimitive.Group
                  heading="Search"
                  className="p-1 text-ink [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-subtle"
                >
                  <PaletteItem
                    icon={SearchIcon}
                    label={`Search “${query.trim()}”`}
                    value={`search ${query.trim()}`}
                    onSelect={searchDocument}
                  />
                </CommandPrimitive.Group>
              )}
              <CommandPrimitive.Group
                heading="Actions"
                className="p-1 text-ink [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-subtle"
              >
                <PaletteItem
                  icon={SearchIcon}
                  label="Go to JSONPath"
                  value="go to jsonpath path locate"
                  onSelect={() => runAction(onGoToPath)}
                />
                <PaletteItem
                  icon={SearchIcon}
                  label="Search document"
                  value="search document keys values"
                  onSelect={searchDocument}
                />
                <PaletteItem
                  icon={FocusIcon}
                  label="Focus branch"
                  value="focus branch selected"
                  disabled={!canFocus}
                  onSelect={() => runAction(onFocusSelected)}
                />
                {isFocused && (
                  <PaletteItem
                    icon={LogOutIcon}
                    label="Exit focus mode"
                    value="exit focus mode"
                    onSelect={() => runAction(onExitFocus)}
                  />
                )}
                <PaletteItem
                  icon={ClipboardIcon}
                  label="Copy selected path"
                  value="copy selected path jsonpath"
                  onSelect={() => runAction(onCopyPath)}
                />
                {view === "tree" ? (
                  <PaletteItem
                    icon={BracesIcon}
                    label="Show code view"
                    value="show code view pretty print"
                    onSelect={() => runAction(onShowCodeView)}
                  />
                ) : (
                  <PaletteItem
                    icon={ListTreeIcon}
                    label="Show tree view"
                    value="show tree view"
                    onSelect={() => runAction(onShowTreeView)}
                  />
                )}
                <PaletteItem
                  icon={XIcon}
                  label="Close document"
                  value="close document"
                  onSelect={() => runAction(onCloseDocument)}
                />
              </CommandPrimitive.Group>
            </CommandPrimitive.List>
          </CommandPrimitive>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
