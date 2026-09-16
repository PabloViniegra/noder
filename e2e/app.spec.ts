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

  const userToggle = page.getByRole("button", { name: "Expand user" })
  await userToggle.press("Enter")

  const collapseUserToggle = page.getByRole("button", { name: "Collapse user" })
  await expect(collapseUserToggle).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByText("id", { exact: true })).toBeVisible()
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
  await page.getByRole("button", { name: "Focus here" }).click()

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

  await search.press("Enter")
  await expect(page.locator("[data-selected-path]")).toHaveText("$.users[0].name")

  await search.press("Enter")
  await expect(page.locator("[data-selected-path]")).toHaveText("$.meta.owner")
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
