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
