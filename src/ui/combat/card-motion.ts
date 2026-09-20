import { cardDef } from "../../game/content/cards";
import type { Card, Combat } from "../../game/model";

// Presentation snapshots only. The engine has already resolved and saved the action.
export function discardedHand(combat: Combat): Combat {
  return {
    ...combat,
    energy: 0,
    hand: combat.hand.filter((card) => cardDef(card.def).retain),
    discard: [
      ...combat.discard,
      ...combat.hand.filter((card) => !cardDef(card.def).retain),
    ],
  };
}

type DrawStep =
  | { kind: "shuffle"; combat: Combat }
  | { kind: "draw"; combat: Combat; cards: Card[] };

export function drawSequence(before: Combat, after: Combat) {
  const held = new Set(before.hand.map((card) => card.uid));
  const drawn = after.hand.filter((card) => !held.has(card.uid));
  const steps: DrawStep[] = [];
  if (!drawn.length) return { initial: after, steps };
  let combat: Combat = {
    ...after,
    hand: after.hand.filter((card) => held.has(card.uid)),
    draw: before.draw,
    discard: before.discard,
  };
  const initial = combat;
  drawn.forEach((card, index) => {
    if (!combat.draw.length) {
      // Reconstruct the already-resolved shuffle from its observed draw order.
      // Never run the RNG again, and never include the card currently resolving.
      combat = {
        ...combat,
        draw: [...after.draw, ...drawn.slice(index).reverse()],
        discard: [],
      };
      steps.push({ kind: "shuffle", combat });
    }
    combat = {
      ...combat,
      hand: [...combat.hand, card],
      draw: combat.draw.filter((candidate) => candidate.uid !== card.uid),
    };
    const previous = steps.at(-1);
    if (previous?.kind === "draw") {
      previous.cards.push(card);
      previous.combat = combat;
    } else steps.push({ kind: "draw", combat, cards: [card] });
  });
  return { initial, steps };
}

function reducedMotion() {
  return document.documentElement.dataset.reduced === "true";
}

async function pileFlight(
  source: HTMLElement,
  destination: DOMRect,
  kind: "discard" | "shuffle",
  speed: number,
  delay = 0,
) {
  const rect = source.getBoundingClientRect();
  const ghost = source.cloneNode(true);
  if (!(ghost instanceof HTMLElement)) return;
  ghost.classList.add("flying-card");
  ghost.classList.remove("selected");
  ghost.dataset.motion = kind;
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;--card-width:${rect.width}px;width:${rect.width}px;height:${rect.height}px;transform-origin:top left;animation:none;transition:none;`;
  document.body.append(ghost);
  const back = kind === "shuffle" ? document.createElement("span") : null;
  if (back) {
    back.className = "card-deal-back";
    ghost.append(back);
  }
  const visibility = source.style.visibility;
  source.style.visibility = "hidden";
  const duration = (kind === "shuffle" ? 340 : 260) / speed;
  const flip = back?.animate(
    [
      { opacity: 0 },
      { opacity: 0, offset: 0.4 },
      { opacity: 1, offset: 0.65 },
      { opacity: 1 },
    ],
    { duration, fill: "both" },
  );
  const animation = ghost.animate(
    [
      { transform: "none", opacity: 1 },
      {
        transform: `translate(${destination.left - rect.left}px,${destination.top - rect.top}px) scale(${destination.width / rect.width}) rotate(${kind === "shuffle" ? -3 : 4}deg)`,
        opacity: 0,
      },
    ],
    {
      duration,
      delay: delay / speed,
      fill: "both",
      easing: "ease-in-out",
    },
  );
  const cancel = () => animation.cancel();
  window.addEventListener("resize", cancel, { once: true });
  try {
    await animation.finished.catch(() => {});
  } finally {
    window.removeEventListener("resize", cancel);
    flip?.cancel();
    source.style.visibility = visibility;
    ghost.remove();
  }
}

export async function animateDiscard(cards: Card[], speed: number) {
  if (reducedMotion()) return;
  const destination = document
    .querySelector('[data-pile="discard"] .pile-stack')
    ?.getBoundingClientRect();
  if (!destination) return;
  await Promise.all(
    cards.map((card, index) => {
      const source = document.querySelector<HTMLElement>(
        `.hand [data-card="${card.uid}"]`,
      );
      return source
        ? pileFlight(source, destination, "discard", speed, index * 30)
        : undefined;
    }),
  );
}

export async function animateShuffle(speed: number) {
  if (reducedMotion()) return;
  const source = document.querySelector<HTMLElement>(
    '[data-pile="discard"] .pile-stack',
  );
  const destination = document
    .querySelector('[data-pile="draw"] .pile-stack')
    ?.getBoundingClientRect();
  if (source && destination)
    await pileFlight(source, destination, "shuffle", speed);
}

export async function animateDeal(cards: Card[], speed: number) {
  await Promise.all(
    cards.map((card, index) => animateDraw(card, speed, index * 80)),
  );
}

async function animateDraw(card: Card, speed: number, delay: number) {
  if (reducedMotion()) return;
  const target = document.querySelector<HTMLElement>(
    `.hand [data-card="${card.uid}"]`,
  );
  const source = document
    .querySelector('[data-pile="draw"] .pile-stack')
    ?.getBoundingClientRect();
  const slot = target?.parentElement?.getBoundingClientRect();
  if (!target || !source || !slot) return;
  // This flight replaces the generic entrance for this mounted card. Restoring
  // that CSS animation afterward would make it fade in a second time.
  target.style.animation = "none";
  const transform = getComputedStyle(target).transform;
  const back = document.createElement("span");
  back.className = "card-deal-back";
  back.setAttribute("aria-hidden", "true");
  target.append(back);
  target.dataset.motion = "draw";
  const duration = 240 / speed;
  const animation = target.animate(
    [
      {
        transform: `translate(${source.left - slot.left}px,${source.top - slot.top}px) scale(${source.width / target.offsetWidth}) rotate(-8deg)`,
        opacity: 0,
      },
      {
        transform: `translate(${source.left - slot.left}px,${source.top - slot.top}px) scale(${source.width / target.offsetWidth}) rotate(-8deg)`,
        opacity: 1,
        offset: 0.02,
      },
      { transform, opacity: 1 },
    ],
    { duration, delay: delay / speed, fill: "backwards", easing: "ease-out" },
  );
  const reveal = back.animate(
    [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.4 },
      { opacity: 0, offset: 0.65 },
      { opacity: 0, offset: 1 },
    ],
    { duration, delay: delay / speed, fill: "both" },
  );
  const cancel = () => animation.cancel();
  window.addEventListener("resize", cancel, { once: true });
  try {
    await animation.finished.catch(() => {});
  } finally {
    window.removeEventListener("resize", cancel);
    reveal.cancel();
    back.remove();
    delete target.dataset.motion;
  }
}
