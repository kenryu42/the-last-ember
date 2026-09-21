import { z } from "zod";
const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({ result: z.unknown().optional() }).passthrough().optional(),
  error: z.unknown().optional(),
});
export function browserSession(session: string) {
  return async (...args: string[]) => {
    const proc = Bun.spawn(
      ["agent-browser", "--session", session, "--restore", ...args, "--json"],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const output = await new Response(proc.stdout).text(),
      error = await new Response(proc.stderr).text();
    if ((await proc.exited) !== 0) throw new Error(`${args.join(" ")}: ${error} ${output}`);
    const result = responseSchema.parse(JSON.parse(output));
    if (!result.success) throw new Error(JSON.stringify(result.error));
    return result.data?.result;
  };
}
