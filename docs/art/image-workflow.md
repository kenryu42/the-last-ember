# Adding artwork

Put original paintings in `artwork/source/`. Subdirectories map directly to
`public/assets/`, and the output extension is always `.webp`.

For example, `artwork/source/encounters/forest/new-enemy.png` becomes
`public/assets/encounters/forest/new-enemy.webp`. Reference it in the game as
`/assets/encounters/forest/new-enemy.webp`.

Starting `bun run dev` or running `bun run build` exports new or changed sources
automatically. If the dev server is already running, restart it or run
`bun run images:optimize`. This is a startup step, not a background watcher.

Commit the original, its generated WebP and `artwork/exports.json` together.
The source folder is tracked in Git but excluded from the Vite production output.
Do not edit generated images or the registry manually.

## Setup and export settings

Install the WebP command-line tools once:

- macOS: `brew install webp`
- Ubuntu: `sudo apt-get install webp`

CI installs this dependency automatically. Exporting uses Google's
[`cwebp`](https://developers.google.com/speed/webp/docs/cwebp) with `-q 90 -m 6`,
the settings selected in the [compression comparison](image-optimization.md).
There is no resizing or cropping. Supported source formats are still PNG, JPEG,
WebP and TIFF. Keep the best available original; avoid replacing a source with
its lossy runtime export.

The registry stores source and export SHA-256 hashes and the export recipe.
Unchanged images are skipped. A source or recipe change requires an export;
changing the installed encoder version alone does not re-encode existing images.
Missing outputs are regenerated. Unexpected edits to existing outputs stop the
command rather than being overwritten. Move intended edits to the original,
then remove its generated output and run the optimizer again.

## Checks and exceptions

`bun run check` includes the read-only `bun run check:images`. It rejects missing
or stale exports, changed generated files, missing sources, output-name collisions
and unregistered image files anywhere in `public/`. It reports the total managed
image size and warns about individual exports larger than 1 MiB. A warning asks
for visual review; it does not silently lower image quality.

For pixel art, animated images, vector icons or promotional artwork that needs a
different export process, add an exact public-relative path and a reason to
`artwork/exceptions.json`. These files are maintained directly under `public/`
and must not also have a managed source. Exceptions bypass optimization and size
reporting, so keep the list small and review additions. The initial exceptions
are the SVG favicon and promotional README PNG. Audio and video are outside this
image pipeline.

To retire an image, remove its source, generated output and corresponding registry
entry together, and update its callers. The optimizer deliberately does not delete
files for you. This retirement is the one case that requires removing a registry
entry manually.

## Initial registration

The initial registry preserves the 77 existing exports byte for byte. For the 12
card sheets recompressed in the preceding pass, the source directory contains
their pre-compression originals. For other images, the best available file is the
existing artwork; registering it avoids another lossy encoding. This registration
was performed once during setup, not as an automatic exception for future images.
All future new or changed sources go through the encoder.

Compression checks do not judge artistic quality. Check a new illustration in the
card and enlarged preview, especially after changing its resolution or style.
