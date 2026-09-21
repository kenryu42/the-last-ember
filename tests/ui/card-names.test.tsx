import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CARDS, BREAK_FORMATION, FADING_STRIKE } from "../../src/game/content/cards";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { CardPile, CardView } from "../../src/ui/cards/CardView";

test("improving a card gives its card, artwork and discard face the new name", () => {
  const run = newRun("improved-name");
  run.scene = { kind: "camp", used: false };
  const card = run.deck.find((card) => card.def === "strike");
  if (!card) throw new Error("Missing starter blade");
  const result = resolve(run, { type: "upgrade", uid: card.uid });
  expect(result.error).toBeNull();
  const improved = result.run.deck.find((candidate) => candidate.uid === card.uid);
  if (!improved) throw new Error("Missing improved blade");
  const html = renderToStaticMarkup(<CardView card={improved} />);
  expect(html).toContain("Decisive stroke");
  expect(html).not.toContain("Steady blade");
  expect(html).toContain('aria-label="Decisive stroke upgraded, 1 energy. Deal 10 damage."');
  expect(html).toContain('aria-label="Decisive stroke upgraded artwork"');
  expect(html).toContain(" · Improved");
  expect(result.frames.at(-1)?.text).toBe("Decisive stroke improved.");
  const pile = renderToStaticMarkup(
    <CardPile kind="discard" cards={[improved]} onClick={() => {}} />,
  );
  expect(pile).toContain("Decisive stroke");
  expect(pile).not.toContain(" +");
});

test("every improvable design has a distinct displayed name without a plus suffix", () => {
  const designs = [...CARDS, BREAK_FORMATION, FADING_STRIKE];
  const names = new Set<string>();
  for (const def of designs) {
    const base = renderToStaticMarkup(<CardView card={{ uid: 1, def: def.id, upgraded: false }} />);
    expect(base).toContain(`${def.name}, ${def.cost} energy.`);
    const improved = renderToStaticMarkup(
      <CardView card={{ uid: 1, def: def.id, upgraded: true }} />,
    );
    const name = improved.match(/aria-label="([^"]+) upgraded,/)?.[1];
    expect(name).toBeDefined();
    expect(name).not.toBe(def.name);
    expect(name).not.toContain("+");
    if (name) names.add(name);
  }
  expect(names.size).toBe(designs.length);
});

test("branch improvements retain their chosen names without plus markers", () => {
  for (const { def, name } of [
    { def: "veiled-flame", name: "Veiled Flame" },
    { def: "wildfire", name: "Wildfire" },
  ]) {
    const html = renderToStaticMarkup(<CardView card={{ uid: 1, def, upgraded: true }} />);
    expect(html).toContain(`${name} upgraded,`);
    expect(html).not.toContain(" +");
  }
});
