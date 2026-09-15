import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../src/App";
import { CARDS } from "../src/game/content";
import { newRun, startCombat } from "../src/game/engine";
import { CardView } from "../src/ui/components";
import { CombatBoard } from "../src/ui/scenes";

test("title renders a playable identity and accessible entry points", () => {
  const html = renderToStaticMarkup(<App />);

  expect(html).toContain("The Last");
  expect(html).toContain("Begin a new journey");
  expect(html).toContain("Settings");
  expect(html).not.toContain("not implemented");
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
