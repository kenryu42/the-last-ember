import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { AttackRequest, createAttackRenderer } from "./pixi-attacks";

type Renderer = Awaited<ReturnType<typeof createAttackRenderer>>;
export function PixiCombatLayer({ request }: { request: AttackRequest | null }) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const latest = useRef(request);
  useEffect(() => {
    latest.current = request;
    renderer.current?.play(request);
  }, [request]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let owned: Renderer | null = null;
    void import("./pixi-attacks")
      .then(({ createAttackRenderer }) => createAttackRenderer(element))
      .then((ready) => {
        if (cancelled) {
          ready.destroy();
          return;
        }
        owned = ready;
        renderer.current = ready;
        ready.play(latest.current);
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error("Combat renderer initialization failed", error);
      });
    return () => {
      cancelled = true;
      renderer.current = null;
      owned?.destroy();
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pixi-combat-layer"
      ref={host}
      aria-hidden="true"
      data-attack={request?.kind}
      data-stage={request?.stage}
    />,
    document.body,
  );
}
