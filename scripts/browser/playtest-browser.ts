import { z } from "zod";
import { browserSession } from "./agent-browser";
import { mkdir } from "node:fs/promises";
import { cardDef, needsTarget } from "../../src/game/content/cards";
import { resolve } from "../../src/game/engine/resolve";
import { createPlaytestRun } from "../../src/lab/fixtures/combat";
import { combatAction } from "../../tests/support/pilot";

// Two actual UI fights, not human pacing evidence. No injected game state.
const session = "v02-check";
const browser = browserSession(session);
const settle = () =>
  browser("eval", "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
async function click(text: string) {
  await browser(
    "eval",
    `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('Missing enabled button');b.click()})()`,
  );
  await settle();
}
async function clickSelector(selector: string) {
  await browser(
    "eval",
    `(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled)throw Error('Missing enabled control');b.click()})()`,
  );
  await settle();
}
async function select(label: string, value: string) {
  await browser(
    "eval",
    `(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.firstChild?.textContent.trim()===${JSON.stringify(label)});const e=l?.querySelector('select');if(!e)throw Error('Missing select');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await settle();
}
function assert(condition: unknown, message: string) {
  if (!condition) throw Error(message);
}
try {
  await mkdir(".amp/in/artifacts", { recursive: true });
  const url = new URL(process.argv[2] ?? "http://localhost:30166");
  url.searchParams.set("benchmark", "1");
  await browser("open", url.href);
  await browser("set", "viewport", "1280", "1000", "2");
  // This dedicated test session owns its disposable normal journey.
  await click("Begin a new journey");
  await click("Skip introduction");
  await clickSelector("button.brand");
  const storageBefore = await browser(
    "eval",
    'JSON.stringify([localStorage.getItem("last-ember.run.v1"),localStorage.getItem("last-ember.history")])',
  );
  await click("v0.2 benchmark · isolated test mode");
  await browser("wait", "--text", "Compare the same fight.");
  let opening: unknown;
  for (const rules of ["control", "candidate"] as const) {
    await select("Rules", rules);
    await browser("fill", "input[maxlength='80']", "ember-v02-a");
    await click("Start benchmark fight");
    assert(
      await browser("eval", "document.getAnimations().every(a=>a.playState!=='running')"),
      "Benchmark animation counted as decision time",
    );
    const hand = await browser(
      "eval",
      "JSON.stringify([...document.querySelectorAll('.hand [data-card]')].map(e=>[e.dataset.card,e.dataset.def]))",
    );
    if (rules === "control") opening = hand;
    else assert(hand === opening, "Paired opening state differs");
    await click("Pause benchmark");
    assert(
      await browser("eval", "document.querySelector('.end-turn').disabled"),
      "Pause did not disable actions",
    );
    await new Promise((r) => setTimeout(r, 300));
    await click("Resume benchmark");
    // Exercise the visibility handler deterministically without relying on headless tab focus.
    await browser(
      "eval",
      "Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))",
    );
    await new Promise((r) => setTimeout(r, 300));
    await browser(
      "eval",
      "delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))",
    );
    let run = createPlaytestRun({
      seed: "ember-v02-a",
      deckId: "quiet",
      encounterId: "fury",
    });
    let turns = 0,
      drawn = 5,
      unusedEnergy = 0;
    for (let i = 0; i < 200 && run.scene.kind === "combat"; i++) {
      const c = run.scene;
      turns = c.turn;
      const action = rules === "control" ? ({ type: "end" } as const) : combatAction(run);
      if (action.type === "end") {
        const projection = resolve(run, action, rules);
        assert(
          await browser(
            "eval",
            `document.querySelector('.phase-projection summary').textContent.includes(${JSON.stringify(`${run.hp - projection.run.hp} health lost · ${projection.run.hp} health remaining`)})`,
          ),
          "Projection differs from resolution",
        );
        unusedEnergy += c.energy;
        await clickSelector(".end-turn");
      } else if (action.type === "play") {
        const card = c.hand.find((card) => card.uid === action.uid);
        if (!card) throw Error("Missing card");
        await clickSelector(`.hand [data-card="${card.uid}"]`);
        if (needsTarget(cardDef(card.def)) && c.enemies.filter((e) => e.hp > 0).length > 1)
          await clickSelector(`[data-enemy="${action.target}"]`);
      }
      const result = resolve(run, action, rules);
      assert(!result.error, "Pilot action failed");
      drawn += result.accounting.drawn;
      run = result.run;
      if (run.scene.kind === "combat")
        assert(
          await browser(
            "eval",
            `document.querySelector('.party-health').textContent.includes(' ${run.hp} / 70')`,
          ),
          "UI health differs from engine",
        );
    }
    assert(run.scene.kind === "ending", "Fight did not finish");
    await browser(
      "eval",
      "(()=>{window.__exports=[];window.__originalCreateURL??=URL.createObjectURL.bind(URL);URL.createObjectURL=(blob)=>{window.__exports.push(blob);return window.__originalCreateURL(blob)}})()",
    );
    await browser("fill", "textarea", "Automated UI smoke, not human observation.");
    await click("Export fight JSON + notes");
    await click("Export summary CSV");
    const exported = z
      .object({
        summary: z.object({
          finalHealth: z.number(),
          playerTurns: z.number(),
          drawn: z.number(),
          played: z.number(),
          unusedEnergy: z.number(),
          durationMs: z.number(),
          activeDecisionMs: z.number(),
        }),
        config: z.object({ rules: z.string(), variant: z.string() }),
        questionnaire: z.record(z.string(), z.string()),
      })
      .parse(await browser("eval", "(async()=>JSON.parse(await window.__exports[0].text()))()"));
    assert(
      exported.summary.finalHealth === run.hp && exported.summary.playerTurns === turns,
      "Result accounting mismatch",
    );
    assert(
      exported.summary.drawn === drawn &&
        exported.summary.played === run.stats.cards &&
        exported.summary.unusedEnergy === unusedEnergy,
      "Action totals mismatch",
    );
    assert(
      exported.summary.durationMs - exported.summary.activeDecisionMs >= 600,
      "Pause or hidden interval counted as active decision time",
    );
    assert(
      exported.config.rules === rules && exported.config.variant === "base",
      "Export identity mismatch",
    );
    assert(
      Object.values(exported.questionnaire).includes("Automated UI smoke, not human observation."),
      "Questionnaire missing",
    );
    assert(
      await browser(
        "eval",
        "(async()=>(await window.__exports[1].text()).includes('\"playerTurns\"'))()",
      ),
      "CSV missing summary",
    );
    assert(
      (await browser(
        "eval",
        'JSON.stringify([localStorage.getItem("last-ember.run.v1"),localStorage.getItem("last-ember.history")])',
      )) === storageBefore,
      "Benchmark changed normal storage",
    );
    console.log(
      `${rules}: ${run.hp ? "win" : "loss"}, ${turns} player turns, ${drawn} draws, ${run.stats.cards} plays; projection/export/pause/save/history PASS`,
    );
    if (rules === "candidate") {
      await browser("eval", "scrollTo(0,0)");
      await settle();
      await browser("screenshot", "/tmp/v02-verified-win.png");
      const image = Bun.spawn([
        "magick",
        "/tmp/v02-verified-win.png",
        "-quality",
        "65",
        ".amp/in/artifacts/v02-verified-win.jpg",
      ]);
      assert((await image.exited) === 0, "Screenshot conversion failed");
    }
    await click("Reset benchmark");
    await click("Confirm reset");
    assert(
      await browser(
        "eval",
        "!document.querySelector('.benchmark-results') && !document.querySelector('.combat-board')",
      ),
      "Reset did not clear benchmark",
    );
  }
  await click("Start benchmark fight");
  await click("Abandon / reset");
  assert(
    await browser(
      "eval",
      "document.querySelector('dialog').textContent.includes('will not be recorded as a completed result')",
    ),
    "Abandon warning missing",
  );
  await click("Confirm reset");
  await click("Return to adventure");
  await browser(
    "eval",
    "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Continue journey')).click()",
  );
  await settle();
  assert(
    await browser("eval", "!!document.querySelector('.crossroads')"),
    "Normal run was not restored",
  );
  assert(
    (await browser(
      "eval",
      'JSON.stringify([localStorage.getItem("last-ember.run.v1"),localStorage.getItem("last-ember.history")])',
    )) === storageBefore,
    "Restoration changed normal storage",
  );
  console.log("Paired start, independent reset/abandon, normal run restoration PASS");
} finally {
  await browser("close");
}
