import { createInterface } from "node:readline";
import { HeadlessFight } from "../../src/lab/runner";
import { PlaytestProtocol } from "../../src/lab/protocol";
import { configSchema } from "../../src/lab/headless-config";

const write = (value: unknown) =>
  process.stdout.write(JSON.stringify(value) + "\n");
const protocol = new PlaytestProtocol();
const mode = process.argv[2];
try {
  if (mode === "fight") {
    if (process.argv.length !== 4)
      throw new Error("fight expects one JSON config argument");
    write(
      new HeadlessFight(
        configSchema.parse(JSON.parse(process.argv[3] ?? "")),
      ).auto(),
    );
  } else if (mode === "batch" || mode === "protocol") {
    if (process.argv.length !== 3)
      throw new Error(`${mode} reads JSON lines from stdin`);
    for await (const line of createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    })) {
      try {
        const input: unknown = JSON.parse(line);
        write(
          mode === "protocol"
            ? protocol.handle(input)
            : new HeadlessFight(configSchema.parse(input)).auto(),
        );
      } catch (error) {
        write({
          outcome: "error",
          error: error instanceof Error ? error.message : String(error),
        });
        if (mode === "batch") process.exitCode = 1;
      }
    }
  } else
    throw new Error(
      "Usage: bun scripts/lab/playtest-cli.ts fight '<JSON config>' | batch | protocol",
    );
} catch (error) {
  write({
    outcome: "error",
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
}
