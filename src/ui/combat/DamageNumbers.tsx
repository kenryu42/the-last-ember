import { useCallback, useEffect, useState } from "react";
import type { Frame } from "../../game/model";

const HIT_DURATION = 1400;
type Hit = { id: number; damage: number; blocked: number };

function DamageNumber({ hit, expire }: { hit: Hit; expire: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => expire(hit.id), HIT_DURATION);
    return () => window.clearTimeout(timer);
  }, [hit.id, expire]);
  return (
    <span
      className={`floating-hit ${hit.damage === 0 ? "fully-blocked" : hit.damage >= 12 ? "heavy-hit" : ""}`}
      aria-hidden="true"
      style={{
        fontSize: `${hit.damage > 0 ? Math.min(62, 36 + hit.damage) : 20}px`,
        animationDuration: `${HIT_DURATION}ms`,
        translate: `calc(-50% + ${hit.id % 2 === 0 ? -22 : 22}px) ${hit.id % 2 === 0 ? 0 : -48}px`,
      }}
    >
      {hit.damage > 0 ? `${hit.damage}` : `Blocked ${hit.blocked} damage`}
      {hit.damage > 0 && hit.blocked > 0 && <small>{hit.blocked} blocked</small>}
    </span>
  );
}

// Keep impact numbers alive independently of the next presentation frame.
export function DamageNumbers({ frame }: { frame: Frame | null }) {
  const [state, setState] = useState<{ seen: Frame | null; hits: Hit[]; nextId: number }>({
    seen: null,
    hits: [],
    nextId: 0,
  });
  if (state.seen !== frame) {
    const damage = frame?.text.match(/(\d+) damage/)?.[1];
    const hit =
      damage === undefined
        ? null
        : {
            id: state.nextId,
            damage: Number(damage),
            blocked: Number(frame?.text.match(/(\d+) blocked/)?.[1] ?? 0),
          };
    setState({
      seen: frame,
      hits: hit ? [...state.hits, hit] : state.hits,
      nextId: state.nextId + (hit ? 1 : 0),
    });
  }
  const expire = useCallback((id: number) => {
    setState((current) => ({ ...current, hits: current.hits.filter((hit) => hit.id !== id) }));
  }, []);
  return state.hits.map((hit) => <DamageNumber key={hit.id} hit={hit} expire={expire} />);
}
