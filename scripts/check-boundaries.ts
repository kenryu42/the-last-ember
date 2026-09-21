import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

export function checkBoundaries(root: string): string[] {
  const errors: string[] = [];
  for (const file of sourceFiles(join(root, "src"))) {
    const path = relative(root, file);
    const text = readFileSync(file, "utf8");
    const transpiler = new Bun.Transpiler({
      loader: file.endsWith(".tsx") ? "tsx" : "ts",
    });
    const imports = new Set(transpiler.scanImports(text).map((entry) => entry.path));
    // The transpiler erases type-only imports. They follow the same ownership rules.
    for (const match of text.matchAll(
      /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s*["']([^"']+)["']/g,
    )) {
      if (match[1]) imports.add(match[1]);
    }
    for (const specifier of imports) {
      const target = specifier.startsWith(".")
        ? relative(root, resolve(dirname(file), specifier))
        : specifier;
      const allowed = path.startsWith("src/game/")
        ? target.startsWith("src/game/") || target === "zod"
        : path.startsWith("src/lab/")
          ? target.startsWith("src/game/") || target.startsWith("src/lab/") || target === "zod"
          : path.startsWith("src/platform/")
            ? target.startsWith("src/game/") ||
              target.startsWith("src/platform/") ||
              target === "zod"
            : path.startsWith("src/ui/")
              ? !target.startsWith("src/app/") &&
                (!target.startsWith("src/lab/") || path.startsWith("src/ui/devtools/"))
              : path.startsWith("src/app/")
                ? !target.startsWith("src/lab/")
                : true;
      if (!allowed) errors.push(`${path}: forbidden dependency ${specifier}`);
    }
    if (path.startsWith("src/game/") || path.startsWith("src/lab/")) {
      // Remove literals/comments before checking ambient browser APIs.
      const code = transpiler
        .transformSync(text)
        .replace(
          /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
          "",
        );
      if (
        /(?<![\w.])(?:window|document|localStorage|sessionStorage|navigator|requestAnimationFrame)\b(?!\s*:)/.test(
          code,
        )
      ) {
        errors.push(`${path}: browser API outside the browser application`);
      }
    }
  }
  return errors;
}

if (import.meta.main) {
  const errors = checkBoundaries(process.cwd());
  if (errors.length) {
    process.stderr.write(errors.join("\n") + "\n");
    process.exitCode = 1;
  } else process.stdout.write("Import boundaries passed.\n");
}
