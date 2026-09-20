import type { Run } from "../model";
export function random(run: Run): number {
  run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0;
  return run.rng / 4294967296;
}
export function shuffle<T>(run: Run, input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random(run) * (i + 1)),
      a = result[i],
      b = result[j];
    if (a !== undefined && b !== undefined) {
      result[i] = b;
      result[j] = a;
    }
  }
  return result;
}
export function pick<T>(run: Run, choices: T[]): T {
  const result = choices[Math.floor(random(run) * choices.length)];
  if (result === undefined) throw new Error("Empty content pool");
  return result;
}
