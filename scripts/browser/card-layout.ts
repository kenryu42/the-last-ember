import { z } from "zod";
import { CARDS } from "../../src/game/content/cards";
import { makeCard } from "../../src/game/engine/rewards";
import { newRun } from "../../src/game/engine/run";
import { startCombat } from "../../src/game/engine/combat/setup";
import { parseSave } from "../../src/game/validation/save";

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
      const owner = face.querySelector(".card-owner");
      const seal = face.querySelector(".cost");
      const painting = face.querySelector(".card-art .art-image");
      if (
        !heading ||
        !title ||
        !art ||
        !rules ||
        !footer ||
        !owner ||
        !seal ||
        !painting
      )
        throw new Error("Incomplete card");
      const h = heading.getBoundingClientRect(),
        a = art.getBoundingClientRect();
      const f = footer.getBoundingClientRect(),
        b = face.getBoundingClientRect();
      const ruleArea = rules.getBoundingClientRect();
      const firstRule = rules.firstElementChild?.getBoundingClientRect();
      const lastRule = rules.lastElementChild?.getBoundingClientRect();
      if (
        !firstRule ||
        !lastRule ||
        Math.abs(
          (firstRule.top +
            lastRule.bottom -
            owner.getBoundingClientRect().bottom -
            f.top) /
            2,
        ) > 1
      ) {
        throw new Error(`Rules not vertically centered: ${id}`);
      }
      for (const rule of rules.children) {
        const range = document.createRange();
        range.selectNodeContents(rule);
        for (const line of range.getClientRects()) {
          if (
            Math.abs(
              (line.left + line.right - ruleArea.left - ruleArea.right) / 2,
            ) > 2
          ) {
            throw new Error(`Rules not horizontally centered: ${id}`);
          }
        }
      }
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

async function checkFaces() {
  await document.fonts.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const faces = document.querySelectorAll<HTMLElement>(".game-card");
  if (!faces.length) throw new Error("No card faces rendered");
  for (const face of faces) {
    if (face.closest(".hand")) {
      // Inspect each face upright, as a player reads an overlapping fan.
      face.scrollIntoView({ block: "center" });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      face.focus({ preventScroll: true });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const popup = face.parentElement?.querySelector(
        ".card-art-popover:popover-open",
      );
      if (!popup) throw new Error("Missing focused card artwork");
      const preview = popup.getBoundingClientRect();
      if (
        Math.abs(preview.top - Math.max(12, face.getBoundingClientRect().top)) >
        1
      )
        throw new Error(
          `Artwork must align with card top: ${face.dataset.def}`,
        );
      if (
        preview.left < 0 ||
        preview.right > innerWidth ||
        preview.bottom > innerHeight
      )
        throw new Error(`Artwork outside viewport: ${face.dataset.def}`);
    }
    const bounds = face.getBoundingClientRect();
    if (Math.abs(bounds.width / bounds.height - 230 / 326) > 0.001)
      throw new Error(`Distorted card: ${face.dataset.def}`);
    for (const selector of [".card-heading", ".card-rules"]) {
      const part = face.querySelector(selector);
      if (!part) throw new Error(`Missing ${selector}`);
      const area = part.getBoundingClientRect();
      const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const line of range.getClientRects()) {
          if (
            line.top < area.top - 1 ||
            line.bottom > area.bottom + 1 ||
            line.left < area.left - 1 ||
            line.right > area.right + 1
          )
            throw new Error(`Text overflow: ${face.dataset.def}/${selector}`);
        }
      }
    }
    const footer = face
      .querySelector(".card-keywords")
      ?.getBoundingClientRect();
    if (!footer || footer.bottom > bounds.bottom - 4)
      throw new Error(`Footer overflow: ${face.dataset.def}`);
  }
  return { width: innerWidth, checked: faces.length, ratio: "230:326" };
}

async function checkHand() {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const hand = document.querySelector<HTMLElement>(".hand");
  if (!hand || hand.scrollWidth > hand.clientWidth)
    throw new Error("Hand must fit without horizontal scrolling");
  const cards = [...hand.querySelectorAll<HTMLButtonElement>(".game-card")];
  if (cards.length !== 10) throw new Error("Expected full hand");
  for (const card of cards) {
    const bounds = card.getBoundingClientRect();
    if (bounds.left < 0 || bounds.right > innerWidth)
      throw new Error(`Offscreen card: ${card.dataset.def}`);
    const seal = card.querySelector(".cost");
    if (!seal) throw new Error("Missing cost");
    seal.scrollIntoView({ block: "center" });
    const cost = seal.getBoundingClientRect();
    if (
      !card.contains(
        document.elementFromPoint(
          cost.left + cost.width / 2,
          cost.top + cost.height / 2,
        ),
      )
    )
      throw new Error(`Covered selection area: ${card.dataset.def}`);
  }
  const first = cards[0],
    last = cards.at(-1);
  if (!first || !last) throw new Error("Missing hand edges");
  first.focus();
  first.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );
  if (document.activeElement !== last) throw new Error("Left arrow must wrap");
  last.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
  );
  if (document.activeElement !== first)
    throw new Error("Home must select first card");
  first.dispatchEvent(
    new KeyboardEvent("keydown", { key: "End", bubbles: true }),
  );
  if (document.activeElement !== last)
    throw new Error("End must select last card");
  last.blur();
  return {
    width: innerWidth,
    cards: cards.length,
    scrolling: false,
    selectionAreas: "exposed",
    keyboard: "passed",
  };
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
        localStorage.setItem('last-ember.settings.v1', JSON.stringify({music:0,effects:0,muted:true,reduced:true,shake:false,gameplaySpeed:1}));location.reload()`,
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
  const gallery = newRun("ratio-study");
  gallery.deck = CARDS.flatMap((card) => [
    makeCard(gallery, card.id),
    { ...makeCard(gallery, card.id), upgraded: true },
  ]);
  const combat = newRun("ratio-combat-study");
  combat.location = combat.route[0]?.id ?? null;
  combat.row = 0;
  combat.visited = combat.location ? [combat.location] : [];
  startCombat(combat, "battle");
  if (combat.scene.kind !== "combat") throw new Error("Missing combat");
  combat.scene.hand = combat.deck.slice(0, 10);
  combat.scene.draw = combat.deck.slice(10);
  combat.scene.discard = [];
  combat.scene.exhaust = [];
  for (const width of [390, 1280]) {
    await browser(
      "set",
      "viewport",
      String(width),
      width === 390 ? "844" : "720",
      "2",
    );
    for (const fixture of [gallery, combat]) {
      const serialized = JSON.stringify(fixture);
      if (parseSave(serialized).kind !== "valid")
        throw new Error("Invalid ratio fixture");
      await browser(
        "eval",
        `localStorage.setItem('last-ember.run.v1',${JSON.stringify(serialized)});location.reload()`,
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
      if (fixture === gallery) {
        await browser(
          "wait",
          "--fn",
          `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('64 cards'))`,
        );
        await browser(
          "eval",
          `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('64 cards')).click()`,
        );
      }
      await browser("wait", ".game-card");
      await browser("mouse", "move", "0", "0");
      if (fixture === combat) await browser("press", "Tab");
      console.log(
        JSON.stringify(await browser("eval", `(${checkFaces.toString()})()`)),
      );
      if (fixture === combat) {
        console.log(await browser("eval", `(${checkHand.toString()})()`));
      }
    }
  }
} finally {
  await browser("close");
}
