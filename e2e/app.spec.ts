import { expect, test } from "@playwright/test"

test("loads the empty command well", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Open JSON" })).toBeVisible()
  await expect(page.getByText("It never leaves this browser.")).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Open JSON" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open file" })).toBeVisible()
})

test("opens a JSON file and leaves the empty state", async ({ page }) => {
  await page.goto("/")
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Open file" }).click()
  const fileChooser = await chooser
  await fileChooser.setFiles({
    name: "payload.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"ok":true}'),
  })
  await expect(page.getByRole("heading", { name: "Noder" })).toBeVisible()
  await expect(page.getByText("payload.json")).toBeVisible()
  await expect(page.getByRole("button", { name: "Open file" })).toHaveCount(0)
})

test("renders a progressive tree and expands a branch with the keyboard", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"user":{"id":1},"items":[true]}')
  await input.press("Enter")

  await expect(page.getByRole("heading", { name: "Tree View" })).toBeVisible()
  await expect(page.getByText("user", { exact: true })).toBeVisible()
  await expect(page.getByText("id", { exact: true })).toHaveCount(0)

  const userRow = page.getByRole("treeitem").filter({ hasText: "user" })
  await userRow.press("Enter")

  await expect(userRow).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByText("id", { exact: true })).toBeVisible()
})

test("exposes relative levels and sibling positions in the JSON tree", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"users":[{"id":1}],"meta":{"ok":true}}')
  await input.press("Enter")

  const usersRow = page.getByRole("treeitem").filter({ hasText: "users" })
  const metaRow = page.getByRole("treeitem").filter({ hasText: "meta" })
  await expect(usersRow).toHaveAttribute("aria-level", "2")
  await expect(usersRow).toHaveAttribute("aria-posinset", "1")
  await expect(usersRow).toHaveAttribute("aria-setsize", "2")
  await expect(metaRow).toHaveAttribute("aria-posinset", "2")

  await usersRow.click()
  await page.getByRole("button", { name: "Focus branch" }).click()
  const focusedRoot = page.getByRole("treeitem").filter({ hasText: "users" })
  await expect(focusedRoot).toHaveAttribute("aria-level", "1")

  const itemRow = page.getByRole("treeitem").filter({ hasText: "[0]" })
  await expect(itemRow).toHaveAttribute("aria-level", "2")
  await expect(itemRow).toHaveAttribute("aria-posinset", "1")
  await expect(itemRow).toHaveAttribute("aria-setsize", "1")
})

test("shows document statistics for the loaded JSON", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  const text = '{"user":{"id":1,"active":true},"tags":["json",null]}'
  await input.fill(text)
  await input.press("Enter")

  const stats = page.getByRole("region", { name: "Document statistics" })
  await expect(stats).toBeVisible()
  await expect(stats.locator('[data-stat="bytes"]')).toHaveText(
    `${new TextEncoder().encode(text).byteLength} B`,
  )
  await expect(stats.locator('[data-stat="nodes"]')).toHaveText("7")
  await expect(stats.locator('[data-stat="objects"]')).toHaveText("2")
  await expect(stats.locator('[data-stat="arrays"]')).toHaveText("1")
  await expect(stats.locator('[data-stat="maxDepth"]')).toHaveText("2")
})

test("navigates to a nested node with JSONPath", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"user-name":{"profile.name":"Ada"}}')
  await input.press("Enter")

  await page.keyboard.press("Control+k")
  const palette = page.getByRole("dialog")
  await palette.getByRole("combobox", { name: "Search commands" }).fill("go to jsonpath")
  await palette.getByRole("option", { name: "Go to JSONPath", exact: true }).click()

  const pathDialog = page.getByRole("dialog")
  const pathInput = pathDialog.getByRole("textbox", { name: "JSONPath" })
  await expect(pathInput).toBeFocused()
  await pathInput.fill('$["user-name"]["profile.name"]')
  await pathInput.press("Enter")

  await expect(pathDialog).toBeHidden()
  await expect(page.locator("[data-selected-path]")).toHaveText('$["user-name"]["profile.name"]')
  await expect(page.getByText("profile.name", { exact: true })).toBeVisible()
})

test("keeps the JSONPath dialog open for an unknown node", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"user":{"id":1}}')
  await input.press("Enter")

  await page.getByRole("button", { name: "Go to JSONPath" }).click()
  const dialog = page.getByRole("dialog")
  const pathInput = dialog.getByRole("textbox", { name: "JSONPath" })
  await pathInput.fill("$.missing")
  await pathInput.press("Enter")

  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("alert")).toHaveText("No node found at $.missing.")

  await pathInput.fill("$.user.id")
  await pathInput.press("Enter")
  await expect(dialog).toBeHidden()
  await expect(page.locator("[data-selected-path]")).toHaveText("$.user.id")
})

test("does not stack the command palette over the JSONPath dialog", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"user":{"id":1}}')
  await input.press("Enter")

  await page.getByRole("button", { name: "Go to JSONPath" }).click()
  const pathDialog = page.getByRole("dialog")
  const pathInput = pathDialog.getByRole("textbox", { name: "JSONPath" })
  await expect(pathInput).toBeFocused()

  await page.keyboard.press("Control+k")
  await expect(page.getByRole("dialog")).toHaveCount(1)
  await expect(pathInput).toBeFocused()
})

test("leaves focus mode when JSONPath targets another branch", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"users":[{"id":1}],"meta":{"ok":true}}')
  await input.press("Enter")

  await page.getByRole("treeitem").filter({ hasText: "users" }).click()
  await page.getByRole("button", { name: "Focus branch" }).click()
  await expect(page.getByRole("button", { name: "Exit focus" })).toBeVisible()

  await page.getByRole("button", { name: "Go to JSONPath" }).click()
  const dialog = page.getByRole("dialog")
  const pathInput = dialog.getByRole("textbox", { name: "JSONPath" })
  await pathInput.fill("$.meta.ok")
  await pathInput.press("Enter")

  await expect(dialog).toBeHidden()
  await expect(page.getByRole("button", { name: "Exit focus" })).toHaveCount(0)
  await expect(page.locator("[data-selected-path]")).toHaveText("$.meta.ok")
  await expect(page.getByText("meta", { exact: true })).toBeVisible()
})

test("navigates tree rows and copies the selected JSONPath", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:5173",
  })
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"users":[{"profile":{"name":"Ada"}}],"meta":{"ok":true}}')
  await input.press("Enter")

  const usersRow = page.getByRole("treeitem").filter({ hasText: "users" })
  await usersRow.click()
  await usersRow.press("ArrowRight")
  await usersRow.press("ArrowDown")

  const selectedRow = page.locator('[role="treeitem"][aria-selected="true"]')
  await expect(selectedRow).toContainText("[0]")
  await expect(page.locator("[data-selected-path]")).toHaveText("$.users[0]")

  await page.getByRole("button", { name: "Copy path" }).click()
  await expect(page.getByRole("status")).toHaveText("Path copied.")
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("$.users[0]")
})

test("focuses a branch and returns through breadcrumbs", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"users":[{"id":1}],"meta":{"ok":true}}')
  await input.press("Enter")

  const usersRow = page.getByRole("treeitem").filter({ hasText: "users" })
  await usersRow.click()
  await page.getByRole("button", { name: "Focus branch" }).click()

  const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" })
  await expect(breadcrumbs).toContainText("root")
  await expect(breadcrumbs).toContainText("users")
  await expect(page.getByText("[0]", { exact: true })).toBeVisible()
  await expect(page.getByText("meta", { exact: true })).toHaveCount(0)

  await breadcrumbs.getByRole("button", { name: "root" }).click()
  await expect(page.getByText("meta", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Exit focus" })).toHaveCount(0)
})

test("searches keys and values and reveals each match", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"users":[{"name":"Ada","role":"admin"}],"meta":{"owner":"Ada"}}')
  await input.press("Enter")

  const search = page.getByRole("searchbox", { name: "Search keys and values" })
  await search.fill("ada")
  await expect(page.locator("[data-search-count]")).toHaveText("2 matches")
  await expect(page.getByRole("button", { name: "Previous match" })).toBeEnabled()
  await expect(page.getByRole("button", { name: "Next match" })).toBeEnabled()

  await search.press("Enter")
  await expect(page.locator("[data-selected-path]")).toHaveText("$.users[0].name")
  await expect(page.locator("[data-search-count]")).toHaveText("1 of 2 matches")
  await expect(page.locator('[data-search-current="true"]')).toHaveCount(1)

  await search.press("Enter")
  await expect(page.locator("[data-selected-path]")).toHaveText("$.meta.owner")
  await expect(page.locator("[data-search-count]")).toHaveText("2 of 2 matches")
})

test("scrolls to a search match outside the virtualized viewport", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  const payload = Object.fromEntries(
    Array.from({ length: 80 }, (_, index) => [`item-${index}`, index === 79 ? "target" : "other"]),
  )
  await input.fill(JSON.stringify(payload))
  await input.press("Enter")

  const search = page.getByRole("searchbox", { name: "Search keys and values" })
  await search.fill("target")
  await search.press("Enter")

  await expect(page.getByRole("treeitem").filter({ hasText: "item-79" })).toBeVisible()
  await expect(page.locator("[data-selected-path]")).toHaveText('$["item-79"]')
})

test("opens the command palette with Ctrl+K and sends a search query", async ({ page }) => {
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  await input.fill('{"user":{"name":"Ada"},"active":true}')
  await input.press("Enter")

  await page.keyboard.press("Control+k")
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  const commandInput = page.getByRole("combobox", { name: "Search commands" })
  await expect(commandInput).toBeFocused()
  await commandInput.fill("ada")
  await dialog.getByRole("option", { name: 'Search “ada”' }).click()
  await expect(dialog).toBeHidden()

  const search = page.getByRole("searchbox", { name: "Search keys and values" })
  await expect(search).toHaveValue("ada")
  await expect(page.locator("[data-search-count]")).toHaveText("1 match")

  await page.keyboard.press("Control+k")
  await expect(page.getByRole("combobox", { name: "Search commands" })).toHaveValue("")
})

test("keeps the loaded explorer usable at 320px with a long value", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto("/")
  const input = page.getByRole("textbox", { name: "Open JSON" })
  const value = "x".repeat(1200)
  await input.fill(JSON.stringify({ message: value }))
  await input.press("Enter")

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)

  const row = page.getByRole("treeitem").filter({ hasText: "message" })
  await expect(row).toBeVisible()
  await expect(row.locator("span[title]").last()).toHaveAttribute("title", JSON.stringify(value))

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  const closeButton = await page.getByRole("button", { name: "Close document" }).boundingBox()
  expect(closeButton?.width).toBe(44)
  expect(closeButton?.height).toBe(44)
  expect(closeButton?.y).toBeGreaterThanOrEqual(0)
})

test("invalid JSON stays on the well with an error", async ({ page }) => {
  await page.goto("/")
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("button", { name: "Open file" }).click()
  const fileChooser = await chooser
  await fileChooser.setFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  })
  await expect(page.getByRole("alert")).toContainText("This isn't valid JSON.")
  await expect(page.getByRole("textbox", { name: "Open JSON" })).toHaveValue("{")
  await expect(page.getByRole("button", { name: "Open file" })).toBeVisible()
})

test("shows an error and preserves a pasted invalid JSON file", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => {
    const data = new DataTransfer()
    data.items.add(new File(["{"], "broken.json", { type: "application/json" }))
    window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }))
  })

  await expect(page.getByRole("alert")).toContainText("This isn't valid JSON.")
  await expect(page.getByRole("textbox", { name: "Open JSON" })).toHaveValue("{")
})
