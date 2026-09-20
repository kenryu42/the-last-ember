import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App, shouldAutoEndTurn } from "../src/App";
import { CARDS } from "../src/game/content";
import {
  generateRoute,
  makeCard,
  newRun,
  resolve,
  startCombat,
} from "../src/game/engine";
import { CardView } from "../src/ui/components";
import { CombatBoard, JourneyCrossroads } from "../src/ui/scenes";
import { attackTiming } from "../src/ui/combat-effects";

test("crossroads show only three current paths without leaking encounters", async () => {
  const run = newRun("hidden-paths");
  const images = new Set<string>();
  for (const act of [0, 1, 2]) {
    run.act = act;
    run.route = generateRoute(run);
    for (let row = -1; row < 5; row++) {
      run.row = row;
      run.location = row === -1 ? null : `${act}-${row}-0`;
      const render = () =>
        renderToStaticMarkup(
          <JourneyCrossroads run={run} dispatch={() => {}} />,
        );
      const html = render();
      expect(
        [...html.matchAll(/data-node="([^"]+)"/g)].map((match) => match[1]),
      ).toEqual([0, 1, 2].map((lane) => `${act}-${row + 1}-${lane}`));
      expect(html).not.toContain("data-kind");
      expect(html).not.toContain("disabled");
      expect(html).not.toContain("route-map");
      expect(html).toContain("Take the left path");
      expect(html).toContain("Go straight ahead");
      expect(html).toContain("Take the right path");
      expect(html).toContain(`Crossroads ${row + 2} of 6`);
      const image = html.match(/src="([^"]+\.webp)"/)?.[1];
      if (!image) throw new Error("Missing crossroads art");
      images.add(image);
      // A different hidden encounter must not change text, accessibility labels or markup.
      const changed = structuredClone(run);
      changed.route.forEach((node) => {
        node.kind = "elite";
      });
      expect(
        renderToStaticMarkup(
          <JourneyCrossroads run={changed} dispatch={() => {}} />,
        ),
      ).toBe(html);
    }
  }
  expect(images.size).toBe(18);
  const hashes = new Set<string>();
  for (const image of images) {
    const asset = Bun.file(`public${image}`);
    expect(await asset.exists()).toBe(true);
    hashes.add(
      new Bun.CryptoHasher("sha256")
        .update(await asset.arrayBuffer())
        .digest("hex"),
    );
  }
  expect(hashes.size).toBe(18);
});

test.each([
  ["blade", false, 360, 420],
  ["arrow", false, 360, 420],
  ["enemy", false, 300, 420],
  ["spell", false, 510, 480],
  ["spell", true, 630, 480],
  ["draw", false, 90, 135],
  ["shield", false, 90, 390],
] as const)(
  "%s timing scales travel and impact together",
  (cue, powerful, travel, impact) => {
    for (const speed of [0.5, 1, 1.25, 2]) {
      expect(attackTiming(cue, powerful, speed)).toEqual({
        travel: travel / speed,
        impact: impact / speed,
      });
    }
  },
);

test("auto-end requires zero energy and no playable free cards", () => {
  const run = newRun("auto-end");
  expect(shouldAutoEndTurn(run)).toBe(false);
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  const combat = run.scene;
  combat.hand = [makeCard(run, "guard")];
  combat.energy = 1;
  expect(shouldAutoEndTurn(run)).toBe(false);
  combat.energy = 0;
  expect(shouldAutoEndTurn(run)).toBe(true);
  combat.hand.push(makeCard(run, "feint"));
  expect(shouldAutoEndTurn(run)).toBe(false);
  combat.enemies.forEach((enemy) => {
    enemy.hp = 0;
  });
  expect(shouldAutoEndTurn(run)).toBe(true);
  combat.hand = [];
  expect(shouldAutoEndTurn(run)).toBe(true);
  combat.ember = { window: "choose", bearer: null, used: false };
  expect(shouldAutoEndTurn(run)).toBe(false);
});

test("auto-end honors effective costs and consumed discounts", () => {
  const run = newRun("auto-end-discount");
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  run.scene.energy = 0;
  run.scene.hand = [makeCard(run, "cinder")];
  expect(shouldAutoEndTurn(run)).toBe(true);
  run.relics = ["black-lantern"];
  expect(shouldAutoEndTurn(run)).toBe(false);
  run.scene.relicTurn = {
    lanternUsed: true,
    coalUsed: false,
  };
  expect(shouldAutoEndTurn(run)).toBe(true);
});

test("auto-end checks resolved draws and energy gains, then the last free card", () => {
  const run = newRun("auto-end-effects");
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  run.scene.energy = 1;
  const guard = makeCard(run, "guard"),
    scout = makeCard(run, "scout");
  const rally = makeCard(run, "rally"),
    courage = makeCard(run, "courage");
  run.scene.hand = [guard, scout];
  run.scene.draw = [rally, courage];
  let result = resolve(run, { type: "play", uid: guard.uid, target: null });
  expect(result.error).toBeNull();
  expect(shouldAutoEndTurn(result.run)).toBe(false);
  result = resolve(result.run, { type: "play", uid: scout.uid, target: null });
  expect(result.error).toBeNull();
  expect(shouldAutoEndTurn(result.run)).toBe(false);
  const gained = resolve(result.run, {
    type: "play",
    uid: rally.uid,
    target: null,
  });
  expect(gained.error).toBeNull();
  if (gained.run.scene.kind !== "combat") throw new Error("Expected combat");
  expect(gained.run.scene.energy).toBe(1);
  gained.run.scene.hand = [];
  expect(shouldAutoEndTurn(gained.run)).toBe(false);
  if (result.run.scene.kind !== "combat") throw new Error("Expected combat");
  result.run.scene.hand = [courage];
  result = resolve(result.run, {
    type: "play",
    uid: courage.uid,
    target: null,
  });
  expect(result.error).toBeNull();
  expect(shouldAutoEndTurn(result.run)).toBe(true);
});

test("title renders a playable identity and accessible entry points", () => {
  const html = renderToStaticMarkup(<App />);

  expect(html).toContain("The Last");
  expect(html).toContain("Begin a new journey");
  expect(html).toContain("Settings");
  expect(html).not.toContain("not implemented");
  expect(html).not.toContain("isolated test mode");
  expect(html).not.toContain("benchmark");
});

test("all 32 cards have distinct base and improved illustrations", async () => {
  const art = new Set<string>();
  for (const def of CARDS) {
    for (const upgraded of [false, true]) {
      const html = renderToStaticMarkup(
        <CardView card={{ uid: 1, def: def.id, upgraded }} />,
      );
      const image = html.match(/background-image:url\(([^)]+)\)/)?.[1];
      const position = html.match(/background-position:([^";]+)/)?.[1];
      expect(image).toBeDefined();
      expect(position).toBeDefined();
      expect(await Bun.file(`public${image}`).exists()).toBe(true);
      const preview = html.slice(html.indexOf('class="full-card-art"'));
      expect(preview.match(/background-image:url\(([^)]+)\)/)?.[1]).toBe(image);
      expect(preview.match(/background-position:([^";]+)/)?.[1]).toBe(position);
      expect(html).toContain('popover="manual"');
      art.add(`${image}:${position}`);
      expect(html).toContain(`data-upgraded="${upgraded}"`);
    }
  }
  expect(art.size).toBe(64);
  const flame = renderToStaticMarkup(
    <CardView card={{ uid: 1, def: "flame", upgraded: true }} />,
  );
  expect(flame).toContain("card-pairs-01.webp");
  expect(flame).toContain("background-position:100% 100%");
  const home = renderToStaticMarkup(
    <CardView card={{ uid: 1, def: "home", upgraded: false }} />,
  );
  expect(home).toContain("card-pairs-16.webp");
  expect(home).toContain("background-position:0% 100%");
});

test("Wayfarer draw back remains decorative and distinguishes an empty pile", async () => {
  const run = newRun("wayfarer-back");
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  const combat = run.scene;
  const render = () =>
    renderToStaticMarkup(
      <CombatBoard
        run={run}
        combat={combat}
        dispatch={() => {}}
        selected={null}
        select={() => {}}
        busy={false}
        feedback={null}
        stage="anticipate"
        inspect={() => {}}
        reduced
      />,
    );
  expect(combat.draw.length).toBeGreaterThan(0);
  expect(render()).toContain(
    'class="card-back" aria-hidden="true" data-empty="false"',
  );
  combat.discard.push(...combat.draw);
  combat.draw = [];
  const empty = render();
  expect(empty).toContain(
    'class="card-back" aria-hidden="true" data-empty="true"',
  );
  expect(empty).toContain("Draw <b>0</b>");
  for (const asset of ["face", "back"]) {
    expect(
      await Bun.file(`public/assets/wayfarer-${asset}.webp`).exists(),
    ).toBe(true);
  }
});
