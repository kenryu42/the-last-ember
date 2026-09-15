import { z } from "zod";
import { CARDS } from "../src/game/content";
import { makeCard, newRun } from "../src/game/engine";
import { parseSave } from "../src/game/storage";

// Isolated rendered regression: actual camp and read-only comparisons, not CSS probes.
// Starts and closes its own browser session. Run against a running production preview.
const session = "card-layout";
const response = z.object({
  success: z.boolean(),
  data: z.object({ result: z.unknown().optional() }).passthrough().optional(),
  error: z.unknown().optional(),
});
async function browser(...args: string[]) {
  const process = Bun.spawn(
    ["agent-browser", "--session", session, "--restore", ...args, "--json"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const output = await new Response(process.stdout).text();
  const error = await new Response(process.stderr).text();
  if (await process.exited)
    throw new Error(`${args.join(" ")}: ${error} ${output}`);
  const parsed = response.parse(JSON.parse(output));
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return parsed.data?.result;
}

// Stringified after TypeScript transpilation, then executed in the actual browser.
async function compareAll(mode: "camp" | "inspection") {
  const settle = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  function clickText(text: string) {
    const button = [...document.querySelectorAll("button")].find(
      (element) => element.textContent?.trim() === text,
    );
    if (!button) throw new Error(`Missing button: ${text}`);
    button.click();
  }
  await document.fonts.ready;
  const ids = [
    ...document.querySelectorAll<HTMLElement>(".deck-grid [data-def]"),
  ].map((element) => element.dataset.def);
  if (ids.length !== 32)
    throw new Error(`Expected 32 base cards, got ${ids.length}`);
  let checked = 0;
  const focusedEvidence = [];
  for (const id of ids) {
    const card = document.querySelector<HTMLButtonElement>(
      `.deck-grid [data-def="${id}"]`,
    );
    if (!card) throw new Error(`Missing ${id}`);
    card.click();
    await settle();
    const pair = document.querySelectorAll<HTMLElement>(
      ".upgrade-compare .game-card",
    );
    if (pair.length !== 2) throw new Error(`Missing comparison for ${id}`);
    for (const face of pair) {
      const heading = face.querySelector(".card-heading");
      const title = face.querySelector(".card-heading > span:last-child");
      const art = face.querySelector(".card-art");
      const rules = face.querySelector(".card-rules");
      const footer = face.querySelector(".card-keywords");
      const seal = face.querySelector(".cost");
      const painting = face.querySelector(".card-art .art-image");
      if (!heading || !title || !art || !rules || !footer || !seal || !painting)
        throw new Error("Incomplete card");
      const h = heading.getBoundingClientRect(),
        a = art.getBoundingClientRect();
      const f = footer.getBoundingClientRect(),
        b = face.getBoundingClientRect();
      const image = painting.getBoundingClientRect();
      if (
        Math.abs(b.width / b.height - 230 / 326) > 0.005 ||
        seal.getBoundingClientRect().left - b.left < 16 ||
        Math.abs(a.width / a.height - 1.5) > 0.01 ||
        image.top > a.top + 1 ||
        image.bottom < a.bottom - 1
      ) {
        throw new Error(
          `Card proportions, seal inset or art coverage failed: ${mode}/${innerWidth}/${id}`,
        );
      }
      // Read individual text nodes, including the nested upgrade '+'. Fixed parent
      // rectangles alone cannot catch text overflowing their assigned height.
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      const lines: DOMRect[] = [];
      while (walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        lines.push(...range.getClientRects());
      }
      const bad = [title.getBoundingClientRect(), ...lines].some(
        (line) =>
          line.top < h.top - 1 ||
          line.bottom > h.bottom + 1 ||
          line.bottom > a.top + 1 ||
          line.left < h.left - 1 ||
          line.right > h.right + 1,
      );
      if (
        bad ||
        rules.getBoundingClientRect().bottom > f.top + 1 ||
        f.bottom > b.bottom - 5
      ) {
        throw new Error(
          JSON.stringify({
            mode,
            width: innerWidth,
            id,
            upgraded: face.dataset.upgraded,
            heading: h.toJSON(),
            title: title.getBoundingClientRect().toJSON(),
            art: a.toJSON(),
            lines: lines.map((line) => line.toJSON()),
          }),
        );
      }
      if (id === "sacrifice")
        focusedEvidence.push({
          mode,
          width: innerWidth,
          upgraded: face.dataset.upgraded,
          heading: h.toJSON(),
          title: title.getBoundingClientRect().toJSON(),
          artTop: a.top,
          lines: lines.map((line) => line.toJSON()),
        });
      checked++;
    }
    const action = mode === "camp" ? "Confirm improvement" : "Back to cards";
    const control = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === action,
    );
    if (!control || control.disabled) throw new Error(`Missing ${action}`);
    control.scrollIntoView({ block: "nearest" });
    await settle();
    const bounds = control.getBoundingClientRect();
    if (
      bounds.top < 0 ||
      bounds.bottom > innerHeight ||
      bounds.left < 0 ||
      bounds.right > innerWidth
    ) {
      throw new Error(`${action} unreachable at ${innerWidth}`);
    }
    clickText(mode === "camp" ? "Choose another" : "Back to cards");
    await settle();
  }
  document
    .querySelector<HTMLButtonElement>('.deck-grid [data-def="sacrifice"]')
    ?.click();
  await settle();
  return { mode, width: innerWidth, checked, focusedEvidence };
}

const run = newRun("card-layout-study");
run.deck = CARDS.map((card) => makeCard(run, card.id));
const camp = run.route.find((node) => node.kind === "camp");
if (!camp) throw new Error("No camp in fixture");
run.row = camp.row;
run.location = camp.id;
run.visited = [camp.id];
run.scene = { kind: "camp", used: false };
const save = JSON.stringify(run);
if (parseSave(save).kind !== "valid") throw new Error("Invalid layout fixture");
try {
  await browser("open", process.argv[2] ?? "http://localhost:4173");
  for (const width of [390, 1280]) {
    await browser(
      "set",
      "viewport",
      String(width),
      width === 390 ? "844" : "900",
      "2",
    );
    for (const mode of ["camp", "inspection"]) {
      await browser(
        "eval",
        `localStorage.setItem('last-ember.run.v1', ${JSON.stringify(save)});
        localStorage.setItem('last-ember.settings.v1', JSON.stringify({music:0,effects:0,muted:true,reduced:true,shake:false,tutorial:false}));location.reload()`,
      );
      await browser(
        "wait",
        "--fn",
        `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Continue journey'))`,
      );
      await browser(
        "eval",
        `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Continue journey')).click()`,
      );
      const text = mode === "camp" ? "Prepare for tomorrow" : "32 cards";
      await browser(
        "wait",
        "--fn",
        `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes(${JSON.stringify(text)}))`,
      );
      await browser(
        "eval",
        `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes(${JSON.stringify(text)})).click()`,
      );
      await browser("wait", ".deck-grid");
      await browser("mouse", "move", "0", "0");
      const result = await browser(
        "eval",
        `(${compareAll.toString()})(${JSON.stringify(mode)})`,
      );
      console.log(JSON.stringify(result));
      await browser("screenshot", `/tmp/wayfarer-${mode}-${width}.png`);
      if (mode === "camp") {
        await browser("click", "dialog .primary");
        console.log(
          await browser(
            "eval",
            `(()=>{
          const saved=JSON.parse(localStorage.getItem('last-ember.run.v1'));
          const upgraded=saved.deck.filter(card=>card.upgraded);
          if(saved.scene.kind!=='camp'||!saved.scene.used||upgraded.length!==1||upgraded[0].def!=='sacrifice')
            throw Error('Confirmation must upgrade only Burden and consume camp');
          return 'Confirmation passed at ${width}px';
        })()`,
          ),
        );
      }
    }
  }
} finally {
  await browser("close");
}
