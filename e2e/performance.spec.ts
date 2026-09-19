import { expect, test, type CDPSession, type Page } from "@playwright/test"

type PerformanceResult = {
  readonly records: number
  readonly bytes: number
  readonly nodes: number
  readonly loadMs: number
  readonly searchMs: number
  readonly jsonPathMs: number
  readonly heapDeltaBytes: number
}

type DeepPerformanceResult = {
  readonly depth: number
  readonly bytes: number
  readonly nodes: number
  readonly loadMs: number
  readonly jsonPathMs: number
  readonly heapDeltaBytes: number
}

type DeepValue = string | { readonly [key: string]: DeepValue }

const PERFORMANCE_ASSERTION_TIMEOUT = 30_000

type PerformanceBudget = {
  readonly loadMs: number
  readonly searchMs?: number
  readonly jsonPathMs: number
}

const PERFORMANCE_BUDGETS = {
  baseline: { loadMs: 12_000, searchMs: 3_000, jsonPathMs: 5_000 },
  stress: { loadMs: 30_000, searchMs: 5_000, jsonPathMs: 8_000 },
  deep: { loadMs: 5_000, jsonPathMs: 5_000 },
} satisfies Record<"baseline" | "stress" | "deep", PerformanceBudget>

function makePayload(records: number) {
  const payload = Object.fromEntries(
    Array.from({ length: records }, (_, index) => [
      `item-${index}`,
      { id: index, value: index === records - 1 ? "target" : "other" },
    ]),
  )

  return {
    text: JSON.stringify(payload),
    nodes: 1 + records * 3,
    targetPath: `$["item-${records - 1}"].value`,
  }
}

function makeDeepPayload(depth: number) {
  let value: DeepValue = "target"
  const segments: string[] = []

  for (let index = 0; index < depth; index += 1) {
    const key = `level-${index}`
    value = { [key]: value }
    segments.unshift(key)
  }

  const text = JSON.stringify(value)
  if (text === undefined) {
    throw new Error("Could not create the deep JSON fixture.")
  }

  return {
    text,
    nodes: depth + 1,
    targetPath: segments.reduce((path, segment) => `${path}["${segment}"]`, "$"),
  }
}

async function measure(page: Page, name: string, action: () => Promise<void>): Promise<number> {
  const startMark = `${name}:start`
  const endMark = `${name}:end`
  await page.evaluate((mark) => performance.mark(mark), startMark)
  await action()

  return page.evaluate(
    ({ name: measureName, startMark: measureStart, endMark: measureEnd }) => {
      performance.mark(measureEnd)
      const duration = performance.measure(measureName, measureStart, measureEnd).duration
      performance.clearMarks(measureStart)
      performance.clearMarks(measureEnd)
      performance.clearMeasures(measureName)
      return duration
    },
    { name, startMark, endMark },
  )
}

async function readHeap(session: CDPSession): Promise<number> {
  await session.send("HeapProfiler.collectGarbage")
  const { usedSize } = await session.send("Runtime.getHeapUsage")
  return usedSize
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  if (lower === undefined || upper === undefined) {
    throw new Error("Cannot calculate the median of an empty set.")
  }
  return sorted.length % 2 === 0 ? (lower + upper) / 2 : upper
}

function summarizePerformance(results: readonly PerformanceResult[]) {
  return {
    samples: results.length,
    medianLoadMs: median(results.map((result) => result.loadMs)),
    medianSearchMs: median(results.map((result) => result.searchMs)),
    medianJsonPathMs: median(results.map((result) => result.jsonPathMs)),
  }
}

function expectPerformanceBudget(
  results: readonly PerformanceResult[],
  budget: PerformanceBudget,
) {
  for (const result of results) {
    expect(result.loadMs, `${result.records} records load`).toBeLessThanOrEqual(budget.loadMs)
    expect(result.jsonPathMs, `${result.records} records JSONPath`).toBeLessThanOrEqual(
      budget.jsonPathMs,
    )
    if (budget.searchMs !== undefined) {
      expect(result.searchMs, `${result.records} records search`).toBeLessThanOrEqual(
        budget.searchMs,
      )
    }
  }
}

async function measureWidePayload(
  page: Page,
  cdp: CDPSession,
  records: number,
): Promise<PerformanceResult> {
  const payload = makePayload(records)
  await page.goto("/")
  const heapBefore = await readHeap(cdp)
  const input = page.getByRole("textbox", { name: "Open JSON" })

  await input.fill(payload.text)
  const loadMs = await measure(page, `load-${records}`, async () => {
    await input.press("Enter")
    await expect(page.locator('[data-stat="nodes"]')).toHaveText(String(payload.nodes), {
      timeout: PERFORMANCE_ASSERTION_TIMEOUT,
    })
  })

  const search = page.getByRole("searchbox", { name: "Search keys and values" })
  const searchMs = await measure(page, `search-${records}`, async () => {
    await search.fill("target")
    await expect(page.locator("[data-search-count]")).toContainText("1 match", {
      timeout: PERFORMANCE_ASSERTION_TIMEOUT,
    })
  })

  await page.getByRole("button", { name: "Go to JSONPath" }).click()
  const pathDialog = page.getByRole("dialog")
  const pathInput = pathDialog.getByRole("textbox", { name: "JSONPath" })
  await pathInput.fill(payload.targetPath)
  const jsonPathMs = await measure(page, `jsonpath-${records}`, async () => {
    await pathInput.press("Enter")
    await expect(page.locator("[data-selected-path]")).toHaveText(payload.targetPath, {
      timeout: PERFORMANCE_ASSERTION_TIMEOUT,
    })
  })

  const heapAfter = await readHeap(cdp)
  return {
    records,
    bytes: Buffer.byteLength(payload.text, "utf8"),
    nodes: payload.nodes,
    loadMs,
    searchMs,
    jsonPathMs,
    heapDeltaBytes: heapAfter - heapBefore,
  }
}

test("@performance measures explorer scaling for large JSON documents", async ({ page }) => {
  test.slow()

  const results: PerformanceResult[] = []
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Runtime.enable")

  for (const records of [10_000, 50_000]) {
    results.push(await measureWidePayload(page, cdp, records))
  }

  console.info(
    `PERFORMANCE_BASELINE ${JSON.stringify({ results, summary: summarizePerformance(results) })}`,
  )
  await test.info().attach("performance-baseline.json", {
    body: JSON.stringify({ results, summary: summarizePerformance(results) }, null, 2),
    contentType: "application/json",
  })

  expect(results).toHaveLength(2)
  expectPerformanceBudget(results, PERFORMANCE_BUDGETS.baseline)
})

test("@performance stress-tests larger wide JSON documents", async ({ page }) => {
  test.slow()

  const results: PerformanceResult[] = []
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Runtime.enable")

  for (const records of [100_000, 250_000]) {
    results.push(await measureWidePayload(page, cdp, records))
  }

  console.info(
    `PERFORMANCE_STRESS_BASELINE ${JSON.stringify({ results, summary: summarizePerformance(results) })}`,
  )
  await test.info().attach("performance-stress-baseline.json", {
    body: JSON.stringify({ results, summary: summarizePerformance(results) }, null, 2),
    contentType: "application/json",
  })

  expect(results).toHaveLength(2)
  expectPerformanceBudget(results, PERFORMANCE_BUDGETS.stress)
})

test("@performance measures navigation through deep JSON documents", async ({ page }) => {
  test.slow()

  const results: DeepPerformanceResult[] = []
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Runtime.enable")

  for (const depth of [500, 1_000]) {
    const payload = makeDeepPayload(depth)
    await page.goto("/")
    const heapBefore = await readHeap(cdp)
    const input = page.getByRole("textbox", { name: "Open JSON" })

    await input.fill(payload.text)
    const loadMs = await measure(page, `deep-load-${depth}`, async () => {
      await input.press("Enter")
      await expect(page.locator('[data-stat="nodes"]')).toHaveText(String(payload.nodes), {
        timeout: PERFORMANCE_ASSERTION_TIMEOUT,
      })
    })

    await page.getByRole("button", { name: "Go to JSONPath" }).click()
    const pathDialog = page.getByRole("dialog")
    const pathInput = pathDialog.getByRole("textbox", { name: "JSONPath" })
    await pathInput.fill(payload.targetPath)
    const jsonPathMs = await measure(page, `deep-jsonpath-${depth}`, async () => {
      await pathInput.press("Enter")
      await expect(page.locator("[data-selected-path]")).toHaveText(payload.targetPath, {
        timeout: PERFORMANCE_ASSERTION_TIMEOUT,
      })
    })

    const heapAfter = await readHeap(cdp)
    results.push({
      depth,
      bytes: Buffer.byteLength(payload.text, "utf8"),
      nodes: payload.nodes,
      loadMs,
      jsonPathMs,
      heapDeltaBytes: heapAfter - heapBefore,
    })
  }

  console.info(`PERFORMANCE_DEEP_BASELINE ${JSON.stringify(results)}`)
  await test.info().attach("performance-deep-baseline.json", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  })

  expect(results).toHaveLength(2)
  for (const result of results) {
    expect(result.loadMs, `${result.depth} levels load`).toBeLessThanOrEqual(
      PERFORMANCE_BUDGETS.deep.loadMs,
    )
    expect(result.jsonPathMs, `${result.depth} levels JSONPath`).toBeLessThanOrEqual(
      PERFORMANCE_BUDGETS.deep.jsonPathMs,
    )
  }
})
