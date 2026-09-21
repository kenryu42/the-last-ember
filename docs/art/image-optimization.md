# Card-art compression

On 2026-09-21, the 12 lossless card sheets were exported as lossy WebP with libwebp 1.6.0, quality 90 and method 6. Every sheet remains 1536 × 1024 with the same opaque RGB, four-cell layout. Runtime paths and crop coordinates are unchanged. The four sheets already using lossy compression were left unchanged.

## Size report

| Scope                  |    Before |     After | Reduction |
| ---------------------- | --------: | --------: | --------: |
| 12 recompressed sheets | 24.43 MiB |  6.10 MiB |     75.0% |
| All 16 card sheets     | 26.22 MiB |  7.89 MiB |     69.9% |
| All 77 WebP images     | 48.02 MiB | 29.69 MiB |     38.2% |

These are file totals, not initial page transfer or browser memory measurements. Pixel dimensions did not change, so decoded bitmap memory is not reduced.

| Sheet              | Before KiB | After KiB |
| ------------------ | ---------: | --------: |
| card-pairs-01.webp |     2160.2 |     546.6 |
| card-pairs-02.webp |     2070.0 |     523.7 |
| card-pairs-03.webp |     2133.5 |     536.1 |
| card-pairs-06.webp |     2100.1 |     554.7 |
| card-pairs-07.webp |     2020.3 |     478.8 |
| card-pairs-08.webp |     2218.6 |     589.0 |
| card-pairs-09.webp |     2031.1 |     514.0 |
| card-pairs-10.webp |     2011.2 |     453.2 |
| card-pairs-12.webp |     1994.1 |     498.9 |
| card-pairs-13.webp |     2032.8 |     481.1 |
| card-pairs-14.webp |     2066.5 |     484.5 |
| card-pairs-15.webp |     2178.7 |     590.3 |

## Original artwork and repeatable export

The original sheets are now tracked in `artwork/source/`. Follow the
[automatic image workflow](image-workflow.md) for new artwork or edits. Starting
`bun run dev` or `bun run build` exports changed sources with the settings above.

The pre-compression files also remain in Git at
`710e8048d41ecf2188179580a6c86fd5da2185bc`, under `public/assets/`. Local quality
trials are in ignored `artifacts/image-optimization/`. These trial files are
disposable. Neither source artwork nor the trials are shipped in production.

Always export from the original artwork. Recompressing an already lossy export
introduces additional damage.

## Quality selection

Trials at quality 80, 85 and 90 produced totals of 4.25, 5.10 and 6.10 MiB for the 12 sheets. Quality 90 was selected after comparing representative character, foliage, arrow and light details from sheets 01, 08 and 15 at the 480-pixel enlarged-preview width. It leaves more room for fine detail while still removing three quarters of the original download bytes. This is lossy compression, not pixel-identical preservation.

No gameplay or layout code changed, so no new behavior test was added. All 16 sheets decode as opaque RGB at the original dimensions, and the production copies match the source exports.

Validation passed `bun run check` with 295 tests and `bun run build`. The production preview was inspected in Chromium at 1440 × 1000 and 390 × 844, including the desktop deck and enlarged artwork hover. No browser errors or warnings were recorded. Screenshots are retained locally under `artifacts/image-optimization/`. This was a visual smoke check, not a physical-phone or throttled-network benchmark.

## Future artwork

Use quality 90 as a starting point for painted card sheets, then compare the export with its source at both normal card size and enlarged-preview size. Track file size and dimensions when adding artwork; an unexpectedly large file warrants checking its encoding before reducing resolution. Keep the current sheet geometry unless the renderer changes with it.

Smaller responsive scene variants and device/network profiling remain separate follow-up work. The current encounter preload is retained.
