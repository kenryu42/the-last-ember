import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { z } from "zod";

const recipe = "cwebp -q 90 -m 6";
const imageExtension = /\.(png|jpe?g|webp|tiff?|svg|gif|avif|bmp|ico|apng|jxl|heic|heif)$/i;
const inputExtension = /\.(png|jpe?g|webp|tiff?)$/i;
const assetPath = z
  .string()
  .min(1)
  .refine(
    (path) =>
      !path.includes("\\") &&
      path.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
    "Expected a relative asset path",
  );
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const registrySchema = z.record(
  assetPath,
  z.object({
    sourceHash: digest,
    outputHash: digest,
    recipe: z.string(),
  }),
);
const exceptionsSchema = z.record(assetPath, z.string().trim().min(1));
const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const outputName = (source: string) => `assets/${source.slice(0, -extname(source).length)}.webp`;

function files(root: string, prefix = ""): string[] {
  return readdirSync(join(root, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink())
        throw new Error(`Image directories must not contain symlinks: ${path}`);
      return entry.isDirectory() ? files(root, path) : [path];
    })
    .sort();
}

/** Export and inspect real image files. Check mode never writes or invokes the encoder. */
export function images(root: string, mode: "optimize" | "check") {
  const sourceRoot = join(root, "artwork/source");
  const publicRoot = join(root, "public");
  const registryPath = join(root, "artwork/exports.json");
  const registry = registrySchema.parse(JSON.parse(readFileSync(registryPath, "utf8")));
  const exceptions = exceptionsSchema.parse(
    JSON.parse(readFileSync(join(root, "artwork/exceptions.json"), "utf8")),
  );
  const sources = files(sourceRoot);
  const outputs = new Set<string>();
  for (const source of sources) {
    assetPath.parse(source);
    if (!inputExtension.test(source))
      throw new Error(`Unsupported source: ${source}. Use a still PNG, JPEG, WebP or TIFF.`);
    const output = outputName(source);
    if (outputs.has(output)) throw new Error(`Output name collision: ${output}`);
    if (exceptions[output]) throw new Error(`Managed image cannot also be an exception: ${output}`);
    outputs.add(output);
  }
  for (const source of Object.keys(registry)) {
    if (!sources.includes(source))
      throw new Error(
        `Missing source: ${source}. Remove its export and registry entry if intentionally retired.`,
      );
  }
  for (const file of files(publicRoot)) {
    if (imageExtension.test(file) && !outputs.has(file) && !exceptions[file]) {
      throw new Error(
        `Unmanaged image: public/${file}. Add its original to artwork/source instead.`,
      );
    }
  }
  for (const file of Object.keys(exceptions)) {
    if (!existsSync(join(publicRoot, file))) throw new Error(`Missing image exception: ${file}`);
  }
  let exported = 0;
  let bytes = 0;
  const warnings: string[] = [];
  for (const source of sources) {
    const input = join(sourceRoot, source);
    const output = join(publicRoot, outputName(source));
    const previous = registry[source];
    const sourceHash = hash(input);
    const outputHash = existsSync(output) ? hash(output) : null;
    if (outputHash !== null && (!previous || previous.outputHash !== outputHash)) {
      throw new Error(
        `Modified export: ${relative(root, output)}. Move intended artwork edits into artwork/source; remove the generated file to rebuild it.`,
      );
    }
    const current =
      previous?.sourceHash === sourceHash && previous.recipe === recipe && outputHash !== null;
    if (!current) {
      if (mode === "check") {
        throw new Error(
          `${outputHash === null ? "Missing export" : "Stale export"}: ${source}. Run bun run images:optimize.`,
        );
      }
      mkdirSync(dirname(output), { recursive: true });
      const temporary = `${output}.${randomUUID()}.tmp`;
      try {
        const result = spawnSync(
          "cwebp",
          ["-quiet", "-q", "90", "-m", "6", input, "-o", temporary],
          { encoding: "utf8" },
        );
        if (result.error || result.status !== 0) {
          throw new Error(
            `cwebp failed for ${source}. Install WebP tools (macOS: brew install webp; Ubuntu: sudo apt-get install webp). ${result.error?.message ?? result.stderr}`,
          );
        }
        renameSync(temporary, output);
      } finally {
        rmSync(temporary, { force: true });
      }
      registry[source] = { sourceHash, outputHash: hash(output), recipe };
      // Persist each successful export so a later encoder failure can be retried safely.
      const temporaryRegistry = `${registryPath}.tmp`;
      writeFileSync(temporaryRegistry, `${JSON.stringify(registry, null, 2)}\n`);
      renameSync(temporaryRegistry, registryPath);
      exported++;
    }
    const size = readFileSync(output).byteLength;
    bytes += size;
    if (size > 1024 * 1024)
      warnings.push(
        `Large image: ${outputName(source)} (${(size / 1024 / 1024).toFixed(2)} MiB). Review resolution and quality.`,
      );
  }
  return { exported, count: sources.length, bytes, warnings };
}

if (import.meta.main) {
  try {
    const [mode] = process.argv.slice(2);
    if ((mode !== "optimize" && mode !== "check") || process.argv.length !== 3) {
      throw new Error("Usage: bun scripts/assets/images.ts <optimize|check>");
    }
    const result = images(resolve(import.meta.dir, "../.."), mode);
    console.log(
      `Images: ${result.count} checked, ${result.exported} exported, ${(result.bytes / 1024 / 1024).toFixed(2)} MiB.`,
    );
    for (const warning of result.warnings) console.warn(warning);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
