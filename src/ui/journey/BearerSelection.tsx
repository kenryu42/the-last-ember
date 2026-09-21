import { useLayoutEffect, useRef } from "react";
import type { Action, Run } from "../../game/model";
import { heroSchema } from "../../game/model";
import { Icon } from "../shared/Icon";
export function BearerSelection({
  run,
  dispatch,
  busy,
}: {
  run: Run;
  dispatch: (action: Action) => void;
  busy: boolean;
}) {
  const sceneHeading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    sceneHeading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  return (
    <section
      className="bearer-selection scene-enter"
      aria-labelledby="bearer-heading"
      aria-busy={busy}
    >
      <header className="bearer-intro">
        <p className="eyebrow">The Last Ember</p>
        <h1 id="bearer-heading" ref={sceneHeading} tabIndex={-1}>
          Who carries the Ember?
        </h1>
        <p className="eyebrow">Act {["I", "II", "III"][run.act]} · Locked for this Act</p>
      </header>
      <div className="bearer-choices">
        {heroSchema.options.map((hero) => {
          const profile = {
            Mara: {
              ability: "Shelter the Flame",
              effect: "Each turn, your first Block effect from a played card grants +3 Block.",
            },
            Eryn: {
              ability: "Conceal the Flame",
              effect: "Each turn, your first Dread-lowering card lowers it by 2 more.",
            },
            Aldren: {
              ability: "Wield the Flame",
              effect:
                "Once per turn, empower one Spell hit: +5 damage for +1 Dread. Your choice when casting.",
            },
          }[hero];
          return (
            <button
              className="bearer-choice"
              key={hero}
              disabled={busy}
              aria-label={`Choose ${hero}`}
              aria-describedby={`bearer-${hero}-ability`}
              onClick={() => dispatch({ type: "bearer", hero })}
            >
              <img
                src={`/assets/bearer-${hero.toLowerCase()}.webp`}
                alt=""
                width="1024"
                height="1024"
              />
              <span className="bearer-copy">
                <span className="bearer-name">{hero}</span>
                <span id={`bearer-${hero}-ability`} className="bearer-ability">
                  <strong>{profile.ability}</strong>
                  {profile.effect}
                </span>
                <span className="bearer-call">
                  <Icon name="arrow" size={18} /> Choose {hero}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <footer className="bearer-context">
        <p className="bearer-lock-note">
          All three stay with you. Your bearer cannot change until you clear this Act.
        </p>
      </footer>
    </section>
  );
}
