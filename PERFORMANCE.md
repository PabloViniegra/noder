# Performance validation

Run the browser benchmark with:

```sh
pnpm test:perf
pnpm test:perf:core
```

The benchmark uses Chromium with one worker so runs do not compete for CPU. It measures browser-visible completion of:

- loading and normalizing a wide document;
- searching keys and values;
- navigating to a leaf with JSONPath;
- loading and navigating deep documents;
- JavaScript heap growth during each scenario, after requesting garbage collection before each reading.

## Baseline

Measured locally on 2026-09-18 after adding lazy child indexes to the JSON traversal engine. The wide fixture contains objects with `id` and `value` fields; the deep fixture contains nested object levels.

| Fixture | Size | Nodes | Load | Search | JSONPath | Heap growth |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 records | 398 KB | 30,001 | 544 ms | 57 ms | 157 ms | 8.7 MB |
| 50,000 records | 2.08 MB | 150,001 | 822 ms | 137 ms | 557 ms | 30.5 MB |
| 500 levels | 6.9 KB | 501 | 402 ms | — | 195 ms | 5.9 MB |
| 1,000 levels | 13.9 KB | 1,001 | 409 ms | — | 471 ms | 12.8 MB |

The measurements are a baseline, not a cross-machine performance contract. Heap growth is the CDP `Runtime.getHeapUsage` delta after an explicit garbage-collection request, so use it comparatively. Repeat `pnpm test:perf` before comparing changes.

## Stress baseline

The stress scenario extends the wide fixture without changing its shape:

| Fixture | Size | Nodes | Load | Search | JSONPath | Heap growth |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 100,000 records | 4.18 MB | 300,001 | 1,283 ms | 226 ms | 1,022 ms | 58.4 MB |
| 250,000 records | 10.78 MB | 750,001 | 2,783 ms | 467 ms | 2,349 ms | 139.1 MB |

## Core profile

The core benchmark isolates engine work from browser rendering:

| Fixture | `JSON.parse` | `parseJson` | Minimap layout | Search | Flatten | Cold path | Warm path |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100,000 records | 95 ms | 252 ms | 87 ms | 67 ms | 34 ms | 23 ms | <1 ms |
| 250,000 records | 179 ms | 723 ms | 233 ms | 90 ms | 88 ms | 70 ms | <1 ms |

The core profile is run with `pnpm test:perf:core`. It enables explicit garbage collection between fixtures. The cold path includes building the lazy child index; the warm path reuses it.

## After tree reveal optimization

Measured locally on 2026-09-18 after expanding with node identity and resolving the selected row from the indexed path instead of scanning serialized visible paths.

| Fixture | Load | Search | JSONPath | Heap growth |
| --- | ---: | ---: | ---: | ---: |
| 10,000 records | 552 ms | 49 ms | 134 ms | 8.9 MB |
| 50,000 records | 825 ms | 136 ms | 217 ms | 31.9 MB |
| 100,000 records | 1,224 ms | 191 ms | 450 ms | 58.0 MB |
| 250,000 records | 2,488 ms | 422 ms | 1,123 ms | 137.6 MB |
| 1,000 levels | 496 ms | — | 239 ms | 14.5 MB |

## Findings

- The current tree remains usable with 150,001 normalized nodes and a 2.08 MB document.
- Search stays below 200 ms in the wide fixture.
- Lazy child indexes reduce JSONPath navigation to the last branch from about 2.3 seconds to about 0.5 seconds at 50,000 records.
- The index adds memory overhead, but the forced-GC baseline is lower and more comparable: about 30.5 MB at 50,000 records, 58.4 MB at 100,000, and 139.1 MB at 250,000.
- 100,000 records is still usable; 250,000 records crosses a practical main-thread and memory boundary for the current representation.
- Expanding with node identity and resolving the selected row from the indexed path cut JSONPath interaction from about 2.35 seconds to 1.12 seconds at 250,000 records, and from 557 ms to 217 ms at 50,000 records.
- Core flatten of a fully expanded wide root dropped from about 88 ms to 30 ms at 250,000 records because expansion no longer serializes every path.
- The remaining 250,000-record JSONPath cost is still dominated by revealing ~250,003 visible rows, not by path lookup.
- A Worker is still not justified for typical documents. The next cut is reducing how much of a wide root becomes visible when jumping to a leaf.
